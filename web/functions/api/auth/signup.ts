import { hashPassword } from '../../lib/crypto'
import {
  clientIp,
  createSession,
  error,
  json,
  sessionCookie,
  type Env,
  verifyTurnstile,
} from '../../lib/http'
import { normalizeEmail, validateEmail, validatePassword } from '../../lib/password'

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

  const pw = validatePassword(body.password || '')
  if (!pw.ok) return error(pw.error || 'Invalid password')

  const okBot = await verifyTurnstile(env, body.turnstileToken || '', clientIp(request))
  if (!okBot) return error('Bot check failed — refresh and try again', 403)

  const email = normalizeEmail(body.email!)
  const existing = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`)
    .bind(email)
    .first()
  if (existing) return error('An account with that email already exists', 409)

  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(body.password!)

  try {
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
    )
      .bind(id, email, passwordHash)
      .run()
  } catch {
    return error('Could not create account — try again', 500)
  }

  const token = await createSession(env.DB, id)
  return json(
    { user: { id, email } },
    {
      status: 201,
      headers: { 'Set-Cookie': sessionCookie(token) },
    },
  )
}
