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
import type { ChildProfile } from './profiles'
import {
  GUEST_PROFILE_KEY,
  getActiveProfileKey,
  migrateLegacyDeviceDataToProfile,
  readStoredActiveProfileId,
  setActiveProfileKey,
} from './profileScope'

type ProfileContextValue = {
  profiles: ChildProfile[]
  profilesLoading: boolean
  activeProfile: ChildProfile | null
  /** Key used for localStorage scoping (profile id or "local") */
  storageKey: string
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

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [profiles, setProfiles] = useState<ChildProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [storageKey, setStorageKey] = useState(GUEST_PROFILE_KEY)

  const refreshProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([])
      setActiveId(null)
      setActiveProfileKey(GUEST_PROFILE_KEY)
      setStorageKey(GUEST_PROFILE_KEY)
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
      migrateLegacyDeviceDataToProfile(nextId)
      setActiveProfileKey(nextId)
      setActiveId(nextId)
      setStorageKey(nextId)
    } else {
      // Signed in but no profiles yet — keep guest device data until first profile
      setActiveProfileKey(GUEST_PROFILE_KEY)
      setActiveId(null)
      setStorageKey(GUEST_PROFILE_KEY)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    refreshProfiles()
  }, [authLoading, refreshProfiles])

  const setActiveProfileId = useCallback((id: string) => {
    migrateLegacyDeviceDataToProfile(id)
    setActiveProfileKey(id)
    setActiveId(id)
    setStorageKey(id)
  }, [])

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeId) || null,
    [profiles, activeId],
  )

  // Keep module key in sync for any code reading getActiveProfileKey()
  useEffect(() => {
    if (getActiveProfileKey() !== storageKey) setActiveProfileKey(storageKey)
  }, [storageKey])

  const value = useMemo(
    () => ({
      profiles,
      profilesLoading,
      activeProfile,
      storageKey,
      setActiveProfileId,
      refreshProfiles,
    }),
    [profiles, profilesLoading, activeProfile, storageKey, setActiveProfileId, refreshProfiles],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfiles() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfiles must be used within ProfileProvider')
  return ctx
}
