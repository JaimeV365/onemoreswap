import { createEmailToken, sendVerificationEmail, siteOrigin } from '../../lib/email'
import { error, json, requireUser, type Env } from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

/** POST /api/auth/resend-verification — send a new link to the signed-in adult */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  if (auth.emailVerified) {
    return json({ ok: true, alreadyVerified: true, sent: false })
  }

  try {
    const token = await createEmailToken(env.DB, auth.id, 'verify')
    const verifyUrl = `${siteOrigin(request)}/verify?token=${token}`
    const result = await sendVerificationEmail(env, auth.email, verifyUrl)
    if (!result.sent) {
      return json({
        ok: false,
        sent: false,
        error: result.reason || 'Could not send email',
        verifyUrl: env.RESEND_API_KEY ? undefined : verifyUrl,
      })
    }
    return json({ ok: true, sent: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Email tables missing — run schema-migrate-v4-email.sql on D1', 503)
    }
    return error('Could not send verification email', 500)
  }
}
