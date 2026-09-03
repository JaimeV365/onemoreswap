import { hashPassword } from '../../lib/crypto'
import { createEmailToken, sendVerificationEmail, siteOrigin } from '../../lib/email'
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

function dbHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/no such table/i.test(msg)) {
    return 'Database tables are missing — run schema.sql on D1 (see DEPLOY.md)'
  }
  return 'Could not create account — try again'
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  try {
    if (!env.DB) return error('Account service is not configured yet', 503)

    let body: {
      email?: string
      password?: string
      turnstileToken?: string
      guardianConfirmed?: boolean
      acceptedTerms?: boolean
      acceptedPrivacy?: boolean
    }
    try {
      body = await request.json()
    } catch {
      return error('Invalid request body')
    }

    const emailErr = validateEmail(body.email || '')
    if (emailErr) return error(emailErr)

    const pw = validatePassword(body.password || '')
    if (!pw.ok) return error(pw.error || 'Invalid password')

    if (!body.guardianConfirmed) {
      return error('A parent or guardian (18+) must create and own this account')
    }
    if (!body.acceptedTerms) return error('Please accept the Terms')
    if (!body.acceptedPrivacy) return error('Please accept the Privacy policy')

    const okBot = await verifyTurnstile(env, body.turnstileToken || '', clientIp(request))
    if (!okBot) return error('Bot check failed — refresh the page and try again', 403)

    const email = normalizeEmail(body.email!)
    let existing: { id: string } | null
    try {
      existing = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`)
        .bind(email)
        .first<{ id: string }>()
    } catch (e) {
      return error(dbHint(e), 503)
    }
    if (existing) return error('An account with that email already exists', 409)

    const id = crypto.randomUUID()
    const passwordHash = await hashPassword(body.password!)
    const now = new Date().toISOString()

    try {
      await env.DB.prepare(
        `INSERT INTO users (
           id, email, password_hash, account_role,
           guardian_confirmed_at, accepted_terms_at, accepted_privacy_at,
           email_verified_at, created_at, updated_at
         ) VALUES (?, ?, ?, 'guardian', ?, ?, ?, NULL, datetime('now'), datetime('now'))`,
      )
        .bind(id, email, passwordHash, now, now, now)
        .run()
    } catch (e) {
      return error(dbHint(e), 500)
    }

    let token: string
    try {
      token = await createSession(env.DB, id)
    } catch (e) {
      return error(dbHint(e), 500)
    }

    let emailSent = false
    let emailNotice =
      'Account created. Confirm your email when verification mail is set up (Account → Resend).'
    try {
      const verifyToken = await createEmailToken(env.DB, id, 'verify')
      const verifyUrl = `${siteOrigin(request)}/verify?token=${verifyToken}`
      const sent = await sendVerificationEmail(env, email, verifyUrl)
      emailSent = sent.sent
      if (sent.sent) {
        emailNotice = 'Account created. Check your inbox to confirm your email.'
      } else if (!env.RESEND_API_KEY) {
        emailNotice =
          'Account created. Email sending is not configured yet — use Account → Resend when ready, or open the verify link from that response while testing.'
      } else {
        emailNotice = `Account created, but the confirmation email could not be sent (${sent.reason || 'unknown'}). Try Resend from Account.`
      }
    } catch {
      /* token table may be missing — account still works */
    }

    return json(
      {
        user: { id, email, emailVerified: false },
        notice: emailNotice,
        emailSent,
      },
      {
        status: 201,
        headers: { 'Set-Cookie': sessionCookie(token) },
      },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return error(`Signup failed: ${msg}`, 500)
  }
}
