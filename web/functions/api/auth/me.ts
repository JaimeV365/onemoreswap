import { error, json, readCookie, SESSION_COOKIE, type Env, userFromSession } from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  if (!env.DB) return error('Account service is not configured yet', 503)

  const user = await userFromSession(env.DB, readCookie(request, SESSION_COOKIE))
  if (!user) return json({ user: null })
  return json({ user })
}
