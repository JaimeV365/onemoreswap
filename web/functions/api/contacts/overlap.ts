import {
  areContacts,
  computeOverlapLists,
  ensureContactsTables,
  needsFromAlbumState,
  sparesFromAlbumState,
  type AlbumStateLike,
} from '../../lib/contacts'
import { error, json, requireUser, type Env } from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

type CollectionStore = {
  albums?: Record<string, AlbumStateLike>
}

function parseCollection(raw: string | null): CollectionStore {
  if (!raw) return { albums: {} }
  try {
    const data = JSON.parse(raw) as CollectionStore
    return data && typeof data === 'object' ? data : { albums: {} }
  } catch {
    return { albums: {} }
  }
}

/**
 * GET /api/contacts/overlap
 *   ?contactUserId=&myProfileId=&theirProfileId=&albumId=
 * Returns needs/spares overlap only (no full collections).
 */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  const missing = await ensureContactsTables(env)
  if (missing) return error(missing, 503)

  const url = new URL(request.url)
  const contactUserId = url.searchParams.get('contactUserId') || ''
  const myProfileId = url.searchParams.get('myProfileId') || ''
  const theirProfileId = url.searchParams.get('theirProfileId') || ''
  const albumId = url.searchParams.get('albumId') || ''

  if (!contactUserId || !myProfileId || !albumId) {
    return error('Missing contactUserId, myProfileId, or albumId')
  }
  if (!(await areContacts(env.DB, auth.id, contactUserId))) {
    return error('Not connected to that account', 403)
  }

  const mine = await env.DB.prepare(
    `SELECT id FROM profiles WHERE id = ? AND user_id = ?`,
  )
    .bind(myProfileId, auth.id)
    .first<{ id: string }>()
  if (!mine) return error('Your profile was not found', 404)

  let theirProfile = theirProfileId
  if (theirProfile) {
    const ok = await env.DB.prepare(
      `SELECT id, display_name AS displayName FROM profiles WHERE id = ? AND user_id = ?`,
    )
      .bind(theirProfile, contactUserId)
      .first<{ id: string; displayName: string }>()
    if (!ok) return error('Their profile was not found', 404)
  } else {
    const first = await env.DB.prepare(
      `SELECT id, display_name AS displayName FROM profiles WHERE user_id = ?
       ORDER BY created_at ASC LIMIT 1`,
    )
      .bind(contactUserId)
      .first<{ id: string; displayName: string }>()
    if (!first) {
      return json({
        ready: false,
        reason: 'They have not created a collector profile yet.',
      })
    }
    theirProfile = first.id
  }

  const theirMeta = await env.DB.prepare(
    `SELECT display_name AS displayName FROM profiles WHERE id = ?`,
  )
    .bind(theirProfile)
    .first<{ displayName: string }>()

  const mySync = await env.DB.prepare(
    `SELECT collection_json FROM profile_sync WHERE profile_id = ? AND user_id = ?`,
  )
    .bind(myProfileId, auth.id)
    .first<{ collection_json: string }>()

  const theirSync = await env.DB.prepare(
    `SELECT collection_json FROM profile_sync WHERE profile_id = ? AND user_id = ?`,
  )
    .bind(theirProfile, contactUserId)
    .first<{ collection_json: string }>()

  if (!mySync) {
    return json({
      ready: false,
      reason: 'Save your collection to the cloud first (sign in and edit stickers — it auto-saves).',
      theirProfileId: theirProfile,
      theirDisplayName: theirMeta?.displayName || 'Collector',
    })
  }
  if (!theirSync) {
    return json({
      ready: false,
      reason: 'They have not synced a collection to the cloud yet.',
      theirProfileId: theirProfile,
      theirDisplayName: theirMeta?.displayName || 'Collector',
    })
  }

  const myAlbums = parseCollection(mySync.collection_json).albums || {}
  const theirAlbums = parseCollection(theirSync.collection_json).albums || {}
  const myState = myAlbums[albumId]
  const theirState = theirAlbums[albumId]

  if (!myState) {
    return json({
      ready: false,
      reason: 'You have no cloud data for this album yet.',
      theirProfileId: theirProfile,
      theirDisplayName: theirMeta?.displayName || 'Collector',
    })
  }
  if (!theirState) {
    return json({
      ready: false,
      reason: 'They have no cloud data for this album yet.',
      theirProfileId: theirProfile,
      theirDisplayName: theirMeta?.displayName || 'Collector',
    })
  }

  const yourNeeds = needsFromAlbumState(myState)
  const yourSpares = sparesFromAlbumState(myState)
  const theirNeeds = needsFromAlbumState(theirState)
  const theirSpares = sparesFromAlbumState(theirState)
  const overlap = computeOverlapLists(yourNeeds, yourSpares, theirNeeds, theirSpares)

  return json({
    ready: true,
    albumId,
    myProfileId,
    theirProfileId: theirProfile,
    theirDisplayName: theirMeta?.displayName || 'Collector',
    yourNeedsCount: yourNeeds.length,
    theirNeedsCount: theirNeeds.length,
    yourSparesCount: yourSpares.length,
    theirSparesCount: theirSpares.length,
    youCanSend: overlap.youCanSend,
    theyCanSend: overlap.theyCanSend,
  })
}
