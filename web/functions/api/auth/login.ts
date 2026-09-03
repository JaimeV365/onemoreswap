import { verifyPassword } from '../../lib/crypto'
import {
  clientIp,
  createSession,
  error,
  json,
  sessionCookie,
  type Env,
  verifyTurnstile,
} from '../../lib/http'
import { normalizeEmail, validateEmail } from '../../lib/password'

type PagesContext = {
  request: Request
  env: Env
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  if (!env.DB) return error('Account service is not configured yet', 503)

  let body: { email?: string; password?: string; turnstileToken?: string }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  const emailErr = validateEmail(body.email || '')
  if (emailErr) return error(emailErr)
  if (!body.password || typeof body.password !== 'string') {
    return error('Enter your password')
  }
  // Cap length before hashing (DoS)
  if (body.password.length > 128) return error('Invalid email or password', 401)

  const okBot = await verifyTurnstile(env, body.turnstileToken || '', clientIp(request))
  if (!okBot) return error('Bot check failed — refresh and try again', 403)

  const email = normalizeEmail(body.email!)
  const row = await env.DB.prepare(
    `SELECT id, email, password_hash, email_verified_at FROM users WHERE email = ?`,
  )
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; email_verified_at: string | null }>()

  // Same message whether missing or wrong — avoid account enumeration timing slightly by still hashing
  if (!row) {
    await verifyPassword(body.password, 'pbkdf2$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000')
    return error('Invalid email or password', 401)
  }

  const match = await verifyPassword(body.password, row.password_hash)
  if (!match) return error('Invalid email or password', 401)

  const token = await createSession(env.DB, row.id)
  return json(
    {
      user: {
        id: row.id,
        email: row.email,
        emailVerified: !!row.email_verified_at,
      },
    },
    { headers: { 'Set-Cookie': sessionCookie(token) } },
  )
}
