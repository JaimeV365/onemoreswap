import { hashPassword, verifyPassword } from '../../lib/crypto'
import {
  createSession,
  error,
  json,
  requireUser,
  sessionCookie,
  type Env,
} from '../../lib/http'
import { validatePassword } from '../../lib/password'

type PagesContext = {
  request: Request
  env: Env
}

/** POST /api/auth/change-password { currentPassword, newPassword } */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  let body: { currentPassword?: string; newPassword?: string }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  if (!body.currentPassword || typeof body.currentPassword !== 'string') {
    return error('Enter your current password')
  }
  if (body.currentPassword.length > 128) return error('Current password is incorrect', 401)

  const pw = validatePassword(body.newPassword || '')
  if (!pw.ok) return error(pw.error || 'Invalid new password')
  if (body.newPassword === body.currentPassword) {
    return error('New password must be different from the current one')
  }

  const row = await env.DB.prepare(`SELECT password_hash FROM users WHERE id = ?`)
    .bind(auth.id)
    .first<{ password_hash: string }>()
  if (!row) return error('Account not found', 404)

  const match = await verifyPassword(body.currentPassword, row.password_hash)
  if (!match) return error('Current password is incorrect', 401)

  const nextHash = await hashPassword(body.newPassword!)
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(nextHash, auth.id)
    .run()

  // Kill other sessions; keep this device signed in with a fresh cookie
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(auth.id).run()
  const token = await createSession(env.DB, auth.id)

  return json(
    { ok: true },
    { headers: { 'Set-Cookie': sessionCookie(token) } },
  )
}
