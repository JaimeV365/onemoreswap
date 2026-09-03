import { error, json, requireUser, type Env } from '../../lib/http'
import { isAgeBand, normalizeDisplayName, validateDisplayName } from '../../lib/profiles'

type PagesContext = {
  request: Request
  env: Env
  params: { id: string }
}

async function ownedProfile(env: Env, userId: string, profileId: string) {
  return env.DB.prepare(`SELECT id FROM profiles WHERE id = ? AND user_id = ?`)
    .bind(profileId, userId)
    .first<{ id: string }>()
}

export const onRequestPatch = async (context: PagesContext): Promise<Response> => {
  const { request, env, params } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  const profileId = params.id
  if (!profileId) return error('Missing profile id')

  let body: { displayName?: string; ageBand?: string | null }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  const existing = await ownedProfile(env, auth.id, profileId)
  if (!existing) return error('Profile not found', 404)

  const updates: string[] = []
  const values: unknown[] = []

  if (body.displayName !== undefined) {
    const nameErr = validateDisplayName(body.displayName)
    if (nameErr) return error(nameErr)
    updates.push('display_name = ?')
    values.push(normalizeDisplayName(body.displayName))
  }

  if (body.ageBand !== undefined) {
    if (body.ageBand === null || body.ageBand === '') {
      updates.push('age_band = NULL')
    } else if (!isAgeBand(body.ageBand)) {
      return error('Invalid age band')
    } else {
      updates.push('age_band = ?')
      values.push(body.ageBand)
    }
  }

  if (!updates.length) return error('Nothing to update')

  updates.push(`updated_at = datetime('now')`)
  values.push(profileId, auth.id)

  await env.DB.prepare(
    `UPDATE profiles SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
  )
    .bind(...values)
    .run()

  const row = await env.DB.prepare(
    `SELECT id, display_name AS displayName, age_band AS ageBand, created_at AS createdAt
     FROM profiles WHERE id = ? AND user_id = ?`,
  )
    .bind(profileId, auth.id)
    .first()

  return json({ profile: row })
}

export const onRequestDelete = async (context: PagesContext): Promise<Response> => {
  const { env, params } = context
  const auth = await requireUser(context.request, env)
  if (auth instanceof Response) return auth

  const profileId = params.id
  if (!profileId) return error('Missing profile id')

  const existing = await ownedProfile(env, auth.id, profileId)
  if (!existing) return error('Profile not found', 404)

  await env.DB.prepare(`DELETE FROM profiles WHERE id = ? AND user_id = ?`)
    .bind(profileId, auth.id)
    .run()

  return json({ ok: true })
}
