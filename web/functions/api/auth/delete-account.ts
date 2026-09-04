import { verifyPassword } from '../../lib/crypto'
import {
  clearSessionCookie,
  error,
  json,
  requireUser,
  type Env,
} from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

/** POST /api/auth/delete-account { password } — permanently deletes the guardian account */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  let body: { password?: string; confirm?: string }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  if (!body.password || typeof body.password !== 'string') {
    return error('Enter your password to confirm')
  }
  if (body.password.length > 128) return error('Password is incorrect', 401)
  if (body.confirm !== 'DELETE') {
    return error('Type DELETE to confirm account deletion')
  }

  const row = await env.DB.prepare(`SELECT password_hash FROM users WHERE id = ?`)
    .bind(auth.id)
    .first<{ password_hash: string }>()
  if (!row) return error('Account not found', 404)

  const match = await verifyPassword(body.password, row.password_hash)
  if (!match) return error('Password is incorrect', 401)

  await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(auth.id).run()

  return json(
    { ok: true },
    { headers: { 'Set-Cookie': clearSessionCookie() } },
  )
}
