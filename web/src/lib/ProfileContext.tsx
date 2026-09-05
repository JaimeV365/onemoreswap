import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { applyCloudSyncLocally, pullCloudSync } from './cloudSync'
import type { ChildProfile } from './profiles'
import {
  GUEST_PROFILE_KEY,
  getActiveProfileKey,
  migrateLegacyDeviceDataToProfile,
  readStoredActiveProfileId,
  setActiveProfileKey,
} from './profileScope'
import { recordLocalSynced } from './syncStatus'

type ProfileContextValue = {
  profiles: ChildProfile[]
  profilesLoading: boolean
  activeProfile: ChildProfile | null
  /** Key used for localStorage scoping (profile id or "local") */
  storageKey: string
  /** Bumps when cloud data is applied so pages remount with fresh storage */
  dataEpoch: number
  bumpDataEpoch: () => void
  hydrating: boolean
  setActiveProfileId: (id: string) => void
  refreshProfiles: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

async function fetchProfiles(): Promise<ChildProfile[]> {
  const res = await fetch('/api/profiles', { credentials: 'include' })
  if (!res.ok) return []
  const body = (await res.json()) as { profiles?: ChildProfile[] }
  return body.profiles || []
}

/**
 * Cloud is the source of truth when you sign in or switch collector profile.
 * If nothing is in the cloud yet, seed from guest/legacy local data so the first push can create it.
 */
async function loadProfileFromCloud(profileId: string): Promise<boolean> {
  setActiveProfileKey(profileId)

  const res = await pullCloudSync(profileId)
  if (!res.error && res.data?.exists) {
    applyCloudSyncLocally(res.data)
    recordLocalSynced({
      updatedAt: res.data.updatedAt,
      revision: res.data.revision,
    })
    return true
  }

  migrateLegacyDeviceDataToProfile(profileId)
  return false
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [profiles, setProfiles] = useState<ChildProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [storageKey, setStorageKey] = useState(GUEST_PROFILE_KEY)
  const [dataEpoch, setDataEpoch] = useState(0)
  const [hydrating, setHydrating] = useState(false)

  const bumpDataEpoch = useCallback(() => {
    setDataEpoch((n) => n + 1)
  }, [])

  const activateProfile = useCallback(async (profileId: string) => {
    setHydrating(true)
    setActiveProfileKey(profileId)
    setActiveId(profileId)
    setStorageKey(profileId)
    try {
      await loadProfileFromCloud(profileId)
      // Always remount pages so they read whatever cloud (or local seed) just loaded
      bumpDataEpoch()
    } finally {
      setHydrating(false)
    }
  }, [bumpDataEpoch])

  const refreshProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([])
      setActiveId(null)
      setActiveProfileKey(GUEST_PROFILE_KEY)
      setStorageKey(GUEST_PROFILE_KEY)
      setHydrating(false)
      return
    }
    setProfilesLoading(true)
    const list = await fetchProfiles()
    setProfilesLoading(false)
    setProfiles(list)

    const stored = readStoredActiveProfileId()
    let nextId: string | null = null
    if (stored && list.some((p) => p.id === stored)) nextId = stored
    else if (list.length) nextId = list[0]!.id

    if (nextId) {
      await activateProfile(nextId)
    } else {
      setActiveProfileKey(GUEST_PROFILE_KEY)
      setActiveId(null)
      setStorageKey(GUEST_PROFILE_KEY)
    }
  }, [user, activateProfile])

  useEffect(() => {
    if (authLoading) return
    void refreshProfiles()
  }, [authLoading, refreshProfiles])

  const setActiveProfileId = useCallback(
    (id: string) => {
      void activateProfile(id)
    },
    [activateProfile],
  )

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeId) || null,
    [profiles, activeId],
  )

  useEffect(() => {
    if (getActiveProfileKey() !== storageKey) setActiveProfileKey(storageKey)
  }, [storageKey])

  const value = useMemo(
    () => ({
      profiles,
      profilesLoading,
      activeProfile,
      storageKey,
      dataEpoch,
      bumpDataEpoch,
      hydrating,
      setActiveProfileId,
      refreshProfiles,
    }),
    [
      profiles,
      profilesLoading,
      activeProfile,
      storageKey,
      dataEpoch,
      bumpDataEpoch,
      hydrating,
      setActiveProfileId,
      refreshProfiles,
    ],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfiles() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfiles must be used within ProfileProvider')
  return ctx
}
