/**
 * Password rules for One More Swap accounts.
 * Allowed alphabet: printable ASCII only (no spaces, no UTF lookalikes/emoji).
 */

export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128

/** Printable ASCII excluding space: ! " # … ~ */
const PRINTABLE_ASCII = /^[\x21-\x7E]+$/

const HAS_LOWER = /[a-z]/
const HAS_UPPER = /[A-Z]/
const HAS_DIGIT = /[0-9]/
/** Common specials — still within printable ASCII */
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{}|;:',.<>/?`~"\\]/

export type PasswordCheck = {
  ok: boolean
  errors: string[]
  /** Live checklist for the UI */
  rules: { id: string; label: string; met: boolean }[]
}

export function validatePassword(password: string): PasswordCheck {
  const rules = [
    {
      id: 'length',
      label: `Between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`,
      met: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
    },
    {
      id: 'ascii',
      label: 'Letters, numbers, and symbols only (no spaces or emoji)',
      met: password.length > 0 && PRINTABLE_ASCII.test(password),
    },
    {
      id: 'lower',
      label: 'At least one lowercase letter (a–z)',
      met: HAS_LOWER.test(password),
    },
    {
      id: 'upper',
      label: 'At least one uppercase letter (A–Z)',
      met: HAS_UPPER.test(password),
    },
    {
      id: 'digit',
      label: 'At least one number (0–9)',
      met: HAS_DIGIT.test(password),
    },
    {
      id: 'special',
      label: 'At least one symbol (e.g. ! @ # $ %)',
      met: HAS_SPECIAL.test(password),
    },
  ]

  const errors: string[] = []
  if (!rules.find((r) => r.id === 'length')!.met) {
    if (password.length < PASSWORD_MIN) {
      errors.push(`Password must be at least ${PASSWORD_MIN} characters`)
    } else if (password.length > PASSWORD_MAX) {
      errors.push(`Password must be at most ${PASSWORD_MAX} characters`)
    }
  }
  if (password.length > 0 && !PRINTABLE_ASCII.test(password)) {
    if (/\s/.test(password)) {
      errors.push('Password cannot contain spaces')
    } else {
      errors.push('Password can only use standard keyboard characters (no emoji or special Unicode)')
    }
  }
  if (!HAS_LOWER.test(password)) errors.push('Add a lowercase letter')
  if (!HAS_UPPER.test(password)) errors.push('Add an uppercase letter')
  if (!HAS_DIGIT.test(password)) errors.push('Add a number')
  if (!HAS_SPECIAL.test(password)) errors.push('Add a symbol (e.g. ! @ # $)')

  return {
    ok: rules.every((r) => r.met),
    errors,
    rules,
  }
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
