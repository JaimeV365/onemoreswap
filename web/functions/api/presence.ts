import { error, json, requireUser, type Env } from '../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

/** Offline if no heartbeat within this window (fallback when leave beacon is missed). */
const STALE_MS = 45_000

async function ownedProfile(env: Env, userId: string, profileId: string) {
  return env.DB.prepare(`SELECT id FROM profiles WHERE id = ? AND user_id = ?`)
    .bind(profileId, userId)
    .first<{ id: string }>()
}

async function ensurePresenceTable(env: Env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS sync_presence (
      device_id TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      PRIMARY KEY (device_id, profile_id)
    )`,
  ).run()
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_sync_presence_profile_seen
     ON sync_presence (profile_id, last_seen)`,
  ).run()
}

async function countOthers(
  env: Env,
  userId: string,
  profileId: string,
  deviceId: string,
  staleBefore: string,
) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sync_presence
     WHERE profile_id = ? AND user_id = ? AND device_id != ? AND last_seen >= ?`,
  )
    .bind(profileId, userId, deviceId, staleBefore)
    .first<{ n: number }>()
  return Number(row?.n ?? 0)
}

/**
 * POST /api/presence
 * Body: { profileId, deviceId, leave?: boolean }
 * Heartbeat (or leave) and return how many *other* devices are online for the profile.
 */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  let body: { profileId?: string; deviceId?: string; leave?: boolean }
  try {
    body = (await request.json()) as {
      profileId?: string
      deviceId?: string
      leave?: boolean
    }
  } catch {
    return error('Invalid JSON')
  }

  const profileId = (body.profileId || '').trim()
  const deviceId = (body.deviceId || '').trim()
  const leave = Boolean(body.leave)
  if (!profileId) return error('Missing profileId')
  if (!deviceId || deviceId.length > 80) return error('Missing or invalid deviceId')

  const profile = await ownedProfile(env, auth.id, profileId)
  if (!profile) return error('Profile not found', 404)

  const now = new Date()
  const nowIso = now.toISOString()
  const staleBefore = new Date(now.getTime() - STALE_MS).toISOString()

  const run = async () => {
    if (leave) {
      await env.DB.prepare(
        `DELETE FROM sync_presence WHERE device_id = ? AND profile_id = ? AND user_id = ?`,
      )
        .bind(deviceId, profileId, auth.id)
        .run()
    } else {
      await env.DB.prepare(
        `INSERT INTO sync_presence (device_id, profile_id, user_id, last_seen)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(device_id, profile_id) DO UPDATE SET
           last_seen = excluded.last_seen,
           user_id = excluded.user_id`,
      )
        .bind(deviceId, profileId, auth.id, nowIso)
        .run()
    }

    await env.DB.prepare(
      `DELETE FROM sync_presence
       WHERE profile_id = ? AND user_id = ? AND last_seen < ?`,
    )
      .bind(profileId, auth.id, staleBefore)
      .run()

    return countOthers(env, auth.id, profileId, deviceId, staleBefore)
  }

  try {
    let otherDevices: number
    try {
      otherDevices = await run()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/no such table/i.test(msg)) throw e
      await ensurePresenceTable(env)
      otherDevices = await run()
    }

    return json({
      ok: true,
      otherDevices,
      staleAfterSec: Math.round(STALE_MS / 1000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return error(msg, 500)
  }
}
