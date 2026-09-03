export type Env = {
  DB: D1Database
  TURNSTILE_SECRET_KEY?: string
  TURNSTILE_SITE_KEY?: string
  /** Optional: skip Turnstile in local dev when set to "1" */
  AUTH_DEV_BYPASS_TURNSTILE?: string
  /** Resend API key for verification emails */
  RESEND_API_KEY?: string
  /** e.g. "One More Swap <onboarding@yourdomain.com>" */
  EMAIL_FROM?: string
}

export const SESSION_COOKIE = 'oms_session'
export const SESSION_DAYS = 30

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, { status })
}

export function sessionCookie(token: string, maxAgeSec = SESSION_DAYS * 86400): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ]
  return parts.join('; ')
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('Cookie') || ''
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export async function verifyTurnstile(env: Env, token: string, ip: string | null): Promise<boolean> {
  if (env.AUTH_DEV_BYPASS_TURNSTILE === '1' && !env.TURNSTILE_SECRET_KEY) {
    return true
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    // Misconfigured production — fail closed unless explicit bypass
    return env.AUTH_DEV_BYPASS_TURNSTILE === '1'
  }
  if (!token) return false

  const body = new URLSearchParams()
  body.set('secret', env.TURNSTILE_SECRET_KEY)
  body.set('response', token)
  if (ip) body.set('remoteip', ip)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  })
  if (!res.ok) return false
  const data = (await res.json()) as { success?: boolean }
  return !!data.success
}

export function clientIp(request: Request): string | null {
  return request.headers.get('CF-Connecting-IP')
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString()
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))`,
    )
    .bind(token, userId, expires)
    .run()
  return token
}

export type SessionUser = { id: string; email: string; emailVerified: boolean }

export async function userFromSession(
  db: D1Database,
  token: string | null,
): Promise<SessionUser | null> {
  if (!token || token.length < 32) return null
  const row = await db
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.email_verified_at AS email_verified_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first<{ id: string; email: string; email_verified_at: string | null }>()
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    emailVerified: !!row.email_verified_at,
  }
}

export async function requireUser(
  request: Request,
  env: Env,
): Promise<SessionUser | Response> {
  if (!env.DB) return error('Account service is not configured yet', 503)
  const user = await userFromSession(env.DB, readCookie(request, SESSION_COOKIE))
  if (!user) return error('Please sign in', 401)
  return user
}
