import { error, json, type Env } from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

/** POST /api/auth/verify { token } — confirm adult email */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  if (!env.DB) return error('Account service is not configured yet', 503)

  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  const token = (body.token || '').trim()
  if (token.length < 32) return error('Invalid or expired link')

  try {
    const row = await env.DB.prepare(
      `SELECT user_id, purpose, expires_at FROM email_tokens WHERE token = ?`,
    )
      .bind(token)
      .first<{ user_id: string; purpose: string; expires_at: string }>()

    if (!row || row.purpose !== 'verify') return error('Invalid or expired link', 400)
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await env.DB.prepare(`DELETE FROM email_tokens WHERE token = ?`).bind(token).run()
      return error('This link has expired — request a new one from Account', 400)
    }

    await env.DB.prepare(
      `UPDATE users SET email_verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(row.user_id)
      .run()

    await env.DB.prepare(`DELETE FROM email_tokens WHERE user_id = ? AND purpose = 'verify'`)
      .bind(row.user_id)
      .run()

    return json({ ok: true, verified: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Email tables missing — run schema-migrate-v4-email.sql on D1', 503)
    }
    return error('Could not verify email', 500)
  }
}
