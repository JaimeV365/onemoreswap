import type { Env } from './http'

const TOKEN_HOURS = 48
const RESET_HOURS = 2

export type EmailTokenPurpose = 'verify' | 'reset'

export async function createEmailToken(
  db: D1Database,
  userId: string,
  purpose: EmailTokenPurpose = 'verify',
  hoursValid = TOKEN_HOURS,
): Promise<string> {
  await db
    .prepare(`DELETE FROM email_tokens WHERE user_id = ? AND purpose = ?`)
    .bind(userId, purpose)
    .run()

  const token = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const expires = new Date(Date.now() + hoursValid * 3600 * 1000).toISOString()
  await db
    .prepare(
      `INSERT INTO email_tokens (token, user_id, purpose, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
    )
    .bind(token, userId, purpose, expires)
    .run()
  return token
}

export async function sendVerificationEmail(
  env: Env,
  to: string,
  verifyUrl: string,
): Promise<{ sent: boolean; reason?: string }> {
  return sendResendEmail(env, {
    to,
    subject: 'Confirm your One More Swap account',
    html: `
      <p>Thanks for creating a parent/guardian account on One More Swap.</p>
      <p><a href="${verifyUrl}">Confirm your email</a> — this link expires in ${TOKEN_HOURS} hours.</p>
      <p>If you did not create this account, you can ignore this message.</p>
    `,
    text: `Confirm your One More Swap account:\n${verifyUrl}\n\nThis link expires in ${TOKEN_HOURS} hours.`,
  })
}

export async function sendPasswordResetEmail(
  env: Env,
  to: string,
  resetUrl: string,
): Promise<{ sent: boolean; reason?: string }> {
  return sendResendEmail(env, {
    to,
    subject: 'Reset your One More Swap password',
    html: `
      <p>We received a request to reset the password for your One More Swap account.</p>
      <p><a href="${resetUrl}">Choose a new password</a> — this link expires in ${RESET_HOURS} hours.</p>
      <p>If you did not ask for this, you can ignore this message. Your password will stay the same.</p>
    `,
    text: `Reset your One More Swap password:\n${resetUrl}\n\nThis link expires in ${RESET_HOURS} hours.\nIf you did not ask for this, ignore this email.`,
  })
}

async function sendResendEmail(
  env: Env,
  input: { to: string; subject: string; html: string; text: string },
): Promise<{ sent: boolean; reason?: string }> {
  if (!env.RESEND_API_KEY) {
    return { sent: false, reason: 'Email sending is not configured yet (RESEND_API_KEY)' }
  }
  const from = env.EMAIL_FROM || 'One More Swap <onboarding@onemoreswap.com>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    return { sent: false, reason: `Email provider error (${res.status}) ${errText.slice(0, 120)}` }
  }
  return { sent: true }
}

export function siteOrigin(request: Request): string {
  const url = new URL(request.url)
  const host = request.headers.get('X-Forwarded-Host') || request.headers.get('Host') || url.host
  const proto = request.headers.get('X-Forwarded-Proto') || url.protocol.replace(':', '') || 'https'
  return `${proto}://${host}`
}

export { RESET_HOURS }
