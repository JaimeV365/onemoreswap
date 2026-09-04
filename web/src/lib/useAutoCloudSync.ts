import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { pushCloudSync } from './cloudSync'
import { onLocalDataChanged } from './localDataEvents'
import { useProfiles } from './ProfileContext'
import {
  getSyncDirtyState,
  hasLocalSyncableData,
  recordLocalSynced,
} from './syncStatus'

const DEBOUNCE_MS = 1500

export type AutoSyncStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

/**
 * Debounced auto-push to cloud whenever local collection/postal/etc. change.
 * Only runs when signed in with an active profile.
 */
export function useAutoCloudSync(): { status: AutoSyncStatus; error: string | null } {
  const { user } = useAuth()
  const { activeProfile } = useProfiles()
  const [status, setStatus] = useState<AutoSyncStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileId = activeProfile?.id

  useEffect(() => {
    if (!user || !profileId) {
      setStatus('idle')
      setError(null)
      return
    }

    const flush = async () => {
      if (!hasLocalSyncableData()) return
      const dirty = getSyncDirtyState()
      if (!dirty.dirty) {
        setStatus('idle')
        return
      }
      setStatus('saving')
      setError(null)
      const res = await pushCloudSync(profileId)
      if (res.error) {
        setStatus('error')
        setError(res.error)
        return
      }
      recordLocalSynced({
        updatedAt: res.data?.updatedAt ?? null,
        revision: res.data?.revision ?? 0,
      })
      setStatus('saved')
      window.setTimeout(() => setStatus('idle'), 2500)
    }

    const schedule = () => {
      setStatus((s) => (s === 'saving' ? s : 'pending'))
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void flush()
      }, DEBOUNCE_MS)
    }

    // Catch up if already dirty on mount / profile switch
    if (getSyncDirtyState().dirty && hasLocalSyncableData()) schedule()

    const unsub = onLocalDataChanged(schedule)
    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user, profileId])

  return { status, error }
}
