export const AGE_BANDS = [
  { id: 'under_8', label: 'Under 8' },
  { id: '8_12', label: '8–12' },
  { id: '13_15', label: '13–15' },
  { id: '16_17', label: '16–17' },
  { id: 'adult', label: 'Adult (18+)' },
  { id: 'unspecified', label: 'Prefer not to say' },
] as const

export type AgeBandId = (typeof AGE_BANDS)[number]['id']

export const MAX_PROFILES = 5
export const DISPLAY_NAME_MAX = 40

const PRINTABLE = /^[\p{L}\p{N} .'\-]+$/u

export function validateDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!name) return 'Enter a display name'
  if (name.length > DISPLAY_NAME_MAX) return `Name must be at most ${DISPLAY_NAME_MAX} characters`
  if (!PRINTABLE.test(name)) return 'Use letters, numbers, spaces, hyphens, or apostrophes only'
  if (/@/.test(name)) return 'Do not use an email as the profile name'
  return null
}

export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function isAgeBand(value: string): value is AgeBandId {
  return AGE_BANDS.some((b) => b.id === value)
}
