export const AGE_BANDS = [
  { id: 'under_8', label: 'Under 8' },
  { id: '8_12', label: '8–12' },
  { id: '13_15', label: '13–15' },
  { id: '16_17', label: '16–17' },
  { id: 'adult', label: 'Adult (18+)' },
  { id: 'unspecified', label: 'Prefer not to say' },
] as const

export type AgeBandId = (typeof AGE_BANDS)[number]['id']

export type ChildProfile = {
  id: string
  displayName: string
  ageBand: AgeBandId | null
  createdAt: string
}

export const MAX_PROFILES = 8
export const DISPLAY_NAME_MAX = 40
