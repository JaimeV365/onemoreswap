/**
 * Active collector profile scopes localStorage (collection, postal, sources).
 * Guest / signed-out → "local". Signed-in → selected profile id.
 */

const ACTIVE_KEY = 'onemoreswap-active-profile'
const LEGACY_MIGRATED_KEY = 'onemoreswap-legacy-migrated-v1'

export const GUEST_PROFILE_KEY = 'local'

const SCOPED_BASES = [
  'onemoreswap-collection-v2',
  'onemoreswap-collection-v1',
  'onemoreswap-postal-v1',
  'onemoreswap-sources-v1',
  'onemoreswap-onboarding-v1',
  'onemoreswap-albums-v1',
] as const

let activeKey: string = GUEST_PROFILE_KEY

export function getActiveProfileKey(): string {
  return activeKey
}

export function setActiveProfileKey(key: string) {
  activeKey = key || GUEST_PROFILE_KEY
  try {
    if (key && key !== GUEST_PROFILE_KEY) {
      localStorage.setItem(ACTIVE_KEY, key)
    } else {
      localStorage.removeItem(ACTIVE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function readStoredActiveProfileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

/** Storage key for the current profile (or guest). */
export function scopedStorageKey(base: string): string {
  return `${base}:${activeKey}`
}

/**
 * Copy unscoped legacy device data into a profile once.
 * Call when the user first gets / selects a real profile.
 */
export function migrateLegacyDeviceDataToProfile(profileId: string) {
  try {
    if (localStorage.getItem(LEGACY_MIGRATED_KEY)) return

    let copied = false
    for (const base of SCOPED_BASES) {
      const legacy = localStorage.getItem(base)
      const target = `${base}:${profileId}`
      if (legacy && !localStorage.getItem(target)) {
        localStorage.setItem(target, legacy)
        copied = true
      }
    }
    // Always mark so we don't re-copy into a second profile later
    localStorage.setItem(LEGACY_MIGRATED_KEY, profileId)
    if (copied) {
      // Leave legacy keys in place as backup until cloud sync; optional clear:
      // for (const base of SCOPED_BASES) localStorage.removeItem(base)
    }
  } catch {
    /* ignore */
  }
}
