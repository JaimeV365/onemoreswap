import {
  clearSessionCookie,
  error,
  json,
  readCookie,
  SESSION_COOKIE,
  type Env,
} from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  if (!env.DB) return error('Account service is not configured yet', 503)

  const token = readCookie(request, SESSION_COOKIE)
  if (token) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(token).run()
  }

  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } })
}
