import { hashPassword } from '../../lib/crypto'
import {
  createSession,
  error,
  json,
  sessionCookie,
  type Env,
} from '../../lib/http'
import { validatePassword } from '../../lib/password'

type PagesContext = {
  request: Request
  env: Env
}

/** POST /api/auth/reset-password { token, newPassword } */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  if (!env.DB) return error('Account service is not configured yet', 503)

  let body: { token?: string; newPassword?: string }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  const token = (body.token || '').trim()
  if (token.length < 32) return error('Invalid or expired link')

  const pw = validatePassword(body.newPassword || '')
  if (!pw.ok) return error(pw.error || 'Invalid password')

  try {
    const row = await env.DB.prepare(
      `DELETE FROM email_tokens
       WHERE token = ? AND purpose = 'reset'
       RETURNING user_id, expires_at`,
    )
      .bind(token)
      .first<{ user_id: string; expires_at: string }>()

    if (!row) return error('Invalid or expired link', 400)
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return error('This link has expired — request a new one', 400)
    }

    const passwordHash = await hashPassword(body.newPassword!)
    await env.DB.prepare(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(passwordHash, row.user_id)
      .run()

    // Kill all sessions; sign this browser in with a fresh one
    await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(row.user_id).run()
    await env.DB.prepare(`DELETE FROM email_tokens WHERE user_id = ? AND purpose = 'reset'`)
      .bind(row.user_id)
      .run()

    const user = await env.DB.prepare(
      `SELECT id, email, email_verified_at FROM users WHERE id = ?`,
    )
      .bind(row.user_id)
      .first<{ id: string; email: string; email_verified_at: string | null }>()

    const session = await createSession(env.DB, row.user_id)
    return json(
      {
        ok: true,
        user: user
          ? {
              id: user.id,
              email: user.email,
              emailVerified: !!user.email_verified_at,
            }
          : null,
      },
      { headers: { 'Set-Cookie': sessionCookie(session) } },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Email tables missing — run schema-migrate-v4-email.sql on D1', 503)
    }
    return error('Could not reset password', 500)
  }
}
