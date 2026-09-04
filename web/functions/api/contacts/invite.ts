import { ensureContactsTables, randomInviteCode } from '../../lib/contacts'
import { error, json, requireUser, type Env } from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

const INVITE_DAYS = 14

/** POST /api/contacts/invite — create a shareable invite code */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  const missing = await ensureContactsTables(env)
  if (missing) return error(missing, 503)

  const code = randomInviteCode()
  const expires = new Date(Date.now() + INVITE_DAYS * 86400 * 1000).toISOString()

  try {
    await env.DB.prepare(
      `INSERT INTO contact_invites (code, from_user_id, created_at, expires_at)
       VALUES (?, ?, datetime('now'), ?)`,
    )
      .bind(code, auth.id, expires)
      .run()

    return json({
      code,
      expiresAt: expires,
      path: `/contacts?code=${encodeURIComponent(code)}`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Contacts tables missing — run schema-migrate-v6-contacts.sql on D1', 503)
    }
    return error('Could not create invite', 500)
  }
}

/** GET /api/contacts/invite — list your unused invites */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  const missing = await ensureContactsTables(env)
  if (missing) return error(missing, 503)

  try {
    const rows = await env.DB.prepare(
      `SELECT code, created_at AS createdAt, expires_at AS expiresAt
       FROM contact_invites
       WHERE from_user_id = ?
         AND accepted_at IS NULL
         AND expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 20`,
    )
      .bind(auth.id)
      .all()

    return json({ invites: rows.results || [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Contacts tables missing — run schema-migrate-v6-contacts.sql on D1', 503)
    }
    return error('Could not load invites', 500)
  }
}
