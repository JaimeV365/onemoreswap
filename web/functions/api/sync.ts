import { error, json, requireUser, type Env } from '../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

async function ownedProfile(env: Env, userId: string, profileId: string) {
  return env.DB.prepare(`SELECT id FROM profiles WHERE id = ? AND user_id = ?`)
    .bind(profileId, userId)
    .first<{ id: string }>()
}

function parseJsonObject(raw: string, fallback: unknown) {
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** GET /api/sync?profileId=… — pull cloud copy for a profile */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const profileId = url.searchParams.get('profileId') || ''
  if (!profileId) return error('Missing profileId')

  const profile = await ownedProfile(env, auth.id, profileId)
  if (!profile) return error('Profile not found', 404)

  try {
    const row = await env.DB.prepare(
      `SELECT collection_json, postal_json, sources_json, updated_at, revision
       FROM profile_sync WHERE profile_id = ? AND user_id = ?`,
    )
      .bind(profileId, auth.id)
      .first<{
        collection_json: string
        postal_json: string
        sources_json: string
        updated_at: string
        revision: number
      }>()

    if (!row) {
      return json({
        exists: false,
        profileId,
        collection: null,
        postal: null,
        sources: null,
        updatedAt: null,
        revision: 0,
      })
    }

    return json({
      exists: true,
      profileId,
      collection: parseJsonObject(row.collection_json, { version: 2, albums: {} }),
      postal: parseJsonObject(row.postal_json, { version: 1, swaps: [] }),
      sources: parseJsonObject(row.sources_json, []),
      updatedAt: row.updated_at,
      revision: row.revision,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Sync table missing — run schema-migrate-v3-sync.sql on D1', 503)
    }
    return error('Could not load sync data', 500)
  }
}

/** PUT /api/sync — push local collection/postal/sources for a profile */
export const onRequestPut = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  let body: {
    profileId?: string
    collection?: unknown
    postal?: unknown
    sources?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  const profileId = body.profileId || ''
  if (!profileId) return error('Missing profileId')
  if (body.collection == null || body.postal == null) {
    return error('collection and postal are required')
  }

  const profile = await ownedProfile(env, auth.id, profileId)
  if (!profile) return error('Profile not found', 404)

  const collectionJson = JSON.stringify(body.collection)
  const postalJson = JSON.stringify(body.postal)
  const sourcesJson = JSON.stringify(body.sources ?? [])

  // Soft size guard (~1.5MB text) — albums are small JSON
  if (collectionJson.length + postalJson.length > 1_500_000) {
    return error('Sync payload too large', 413)
  }

  try {
    const existing = await env.DB.prepare(
      `SELECT revision FROM profile_sync WHERE profile_id = ?`,
    )
      .bind(profileId)
      .first<{ revision: number }>()

    const revision = (existing?.revision || 0) + 1
    const updatedAt = new Date().toISOString()

    await env.DB.prepare(
      `INSERT INTO profile_sync (
         profile_id, user_id, collection_json, postal_json, sources_json, updated_at, revision
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(profile_id) DO UPDATE SET
         collection_json = excluded.collection_json,
         postal_json = excluded.postal_json,
         sources_json = excluded.sources_json,
         updated_at = excluded.updated_at,
         revision = excluded.revision,
         user_id = excluded.user_id`,
    )
      .bind(profileId, auth.id, collectionJson, postalJson, sourcesJson, updatedAt, revision)
      .run()

    return json({ ok: true, profileId, updatedAt, revision })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Sync table missing — run schema-migrate-v3-sync.sql on D1', 503)
    }
    return error('Could not save sync data', 500)
  }
}
