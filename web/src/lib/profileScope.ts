/**
 * Active collector profile scopes localStorage (collection, postal, sources).
 * Guest / signed-out → "local". Signed-in → selected profile id.
 */

const ACTIVE_KEY = 'onemoreswap-active-profile'
const LEGACY_MIGRATED_PREFIX = 'onemoreswap-legacy-migrated-v2:'

export const GUEST_PROFILE_KEY = 'local'

const SCOPED_BASES = [
  'onemoreswap-collection-v2',
  'onemoreswap-collection-v1',
  'onemoreswap-postal-v1',
  'onemoreswap-sources-v1',
  'onemoreswap-onboarding-v1',
  'onemoreswap-albums-v1',
  'onemoreswap-sync-meta-v1',
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
 * Copy unscoped legacy keys and guest (`:local`) data into a profile once.
 * Call when the user first gets / selects a real profile on this device.
 */
export function migrateLegacyDeviceDataToProfile(profileId: string) {
  try {
    const flag = `${LEGACY_MIGRATED_PREFIX}${profileId}`
    if (localStorage.getItem(flag)) return

    let copied = false
    for (const base of SCOPED_BASES) {
      const target = `${base}:${profileId}`
      if (localStorage.getItem(target)) continue
      const legacy = localStorage.getItem(base)
      const guest = localStorage.getItem(`${base}:${GUEST_PROFILE_KEY}`)
      const source = legacy || guest
      if (source) {
        localStorage.setItem(target, source)
        copied = true
      }
    }
    localStorage.setItem(flag, copied ? 'copied' : 'none')
  } catch {
    /* ignore */
  }
}
