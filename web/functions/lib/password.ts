/**
 * Mirror of web/src/lib/password.ts — keep in sync (server must enforce the same rules).
 */

export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128

const PRINTABLE_ASCII = /^[\x21-\x7E]+$/
const HAS_LOWER = /[a-z]/
const HAS_UPPER = /[A-Z]/
const HAS_DIGIT = /[0-9]/
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{}|;:',.<>/?`~"\\]/

export function validatePassword(password: string): { ok: boolean; error?: string } {
  if (typeof password !== 'string') return { ok: false, error: 'Invalid password' }
  if (password.length < PASSWORD_MIN) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN} characters` }
  }
  if (password.length > PASSWORD_MAX) {
    return { ok: false, error: `Password must be at most ${PASSWORD_MAX} characters` }
  }
  if (!PRINTABLE_ASCII.test(password)) {
    if (/\s/.test(password)) return { ok: false, error: 'Password cannot contain spaces' }
    return {
      ok: false,
      error: 'Password can only use standard keyboard characters (no emoji or special Unicode)',
    }
  }
  if (!HAS_LOWER.test(password)) return { ok: false, error: 'Add a lowercase letter' }
  if (!HAS_UPPER.test(password)) return { ok: false, error: 'Add an uppercase letter' }
  if (!HAS_DIGIT.test(password)) return { ok: false, error: 'Add a number' }
  if (!HAS_SPECIAL.test(password)) return { ok: false, error: 'Add a symbol (e.g. ! @ # $)' }
  return { ok: true }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): string | null {
  const e = normalizeEmail(email)
  if (!e) return 'Enter your email'
  if (e.length > 254) return 'Email is too long'
  if (/\s/.test(email)) return 'Email cannot contain spaces'
  if (!EMAIL_RE.test(e)) return 'Enter a valid email address'
  return null
}
