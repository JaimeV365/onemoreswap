import { createEmailToken, RESET_HOURS, sendPasswordResetEmail, siteOrigin } from '../../lib/email'
import {
  clientIp,
  error,
  json,
  type Env,
  verifyTurnstile,
} from '../../lib/http'
import { normalizeEmail, validateEmail } from '../../lib/password'

type PagesContext = {
  request: Request
  env: Env
}

/**
 * POST /api/auth/forgot-password { email, turnstileToken }
 * Always returns a generic success message (no account enumeration).
 */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  if (!env.DB) return error('Account service is not configured yet', 503)

  let body: { email?: string; turnstileToken?: string }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  const emailErr = validateEmail(body.email || '')
  if (emailErr) return error(emailErr)

  const okBot = await verifyTurnstile(env, body.turnstileToken || '', clientIp(request))
  if (!okBot) return error('Bot check failed — refresh and try again', 403)

  const email = normalizeEmail(body.email!)
  const generic = {
    ok: true,
    sent: true,
    message: 'If that email has an account, we sent a reset link. Check your inbox.',
  }

  try {
    const row = await env.DB.prepare(`SELECT id, email FROM users WHERE email = ?`)
      .bind(email)
      .first<{ id: string; email: string }>()

    if (!row) {
      // Same shape whether or not the account exists
      return json(generic)
    }

    const token = await createEmailToken(env.DB, row.id, 'reset', RESET_HOURS)
    const resetUrl = `${siteOrigin(request)}/reset-password?token=${token}`
    const result = await sendPasswordResetEmail(env, row.email, resetUrl)

    if (!result.sent) {
      // Dev / misconfigured mail: still avoid confirming the account exists in the main message
      return json({
        ...generic,
        emailConfigured: false,
        resetUrl: env.RESEND_API_KEY ? undefined : resetUrl,
        notice: result.reason,
      })
    }

    return json(generic)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Email tables missing — run schema-migrate-v4-email.sql on D1', 503)
    }
    return error('Could not process password reset', 500)
  }
}
