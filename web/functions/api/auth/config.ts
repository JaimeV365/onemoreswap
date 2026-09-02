import { json, type Env } from '../../lib/http'

type PagesContext = {
  env: Env
}

/** Public config for the account forms (Turnstile site key). */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { env } = context
  return json({
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || '',
    authConfigured: !!env.DB,
    turnstileRequired: !!(env.TURNSTILE_SECRET_KEY || env.TURNSTILE_SITE_KEY) &&
      env.AUTH_DEV_BYPASS_TURNSTILE !== '1',
  })
}
