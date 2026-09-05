import { error, json, requireUser, type Env } from '../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

/** Consider a device offline if it has not heartbeated within this window. */
const STALE_MS = 90_000

async function ownedProfile(env: Env, userId: string, profileId: string) {
  return env.DB.prepare(`SELECT id FROM profiles WHERE id = ? AND user_id = ?`)
    .bind(profileId, userId)
    .first<{ id: string }>()
}

/**
 * POST /api/presence
 * Body: { profileId, deviceId }
 * Upserts this device's heartbeat and returns how many *other* devices are online for the profile.
 */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  let body: { profileId?: string; deviceId?: string }
  try {
    body = (await request.json()) as { profileId?: string; deviceId?: string }
  } catch {
    return error('Invalid JSON')
  }

  const profileId = (body.profileId || '').trim()
  const deviceId = (body.deviceId || '').trim()
  if (!profileId) return error('Missing profileId')
  if (!deviceId || deviceId.length > 80) return error('Missing or invalid deviceId')

  const profile = await ownedProfile(env, auth.id, profileId)
  if (!profile) return error('Profile not found', 404)

  const now = new Date()
  const nowIso = now.toISOString()
  const staleBefore = new Date(now.getTime() - STALE_MS).toISOString()

  try {
    await env.DB.prepare(
      `INSERT INTO sync_presence (device_id, profile_id, user_id, last_seen)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(device_id, profile_id) DO UPDATE SET
         last_seen = excluded.last_seen,
         user_id = excluded.user_id`,
    )
      .bind(deviceId, profileId, auth.id, nowIso)
      .run()

    // Drop stale rows for this profile (and this user) so counts stay honest
    await env.DB.prepare(
      `DELETE FROM sync_presence
       WHERE profile_id = ? AND user_id = ? AND last_seen < ?`,
    )
      .bind(profileId, auth.id, staleBefore)
      .run()

    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sync_presence
       WHERE profile_id = ? AND user_id = ? AND device_id != ? AND last_seen >= ?`,
    )
      .bind(profileId, auth.id, deviceId, staleBefore)
      .first<{ n: number }>()

    const otherDevices = Number(row?.n ?? 0)

    return json({
      ok: true,
      otherDevices,
      staleAfterSec: Math.round(STALE_MS / 1000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      // Migrate not applied yet — don't break the app
      return json({ ok: true, otherDevices: 0, migrateRequired: true })
    }
    return error(msg, 500)
  }
}
