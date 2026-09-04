import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { pushCloudSync } from './cloudSync'
import { onLocalDataChanged } from './localDataEvents'
import { useProfiles } from './ProfileContext'
import {
  getSyncDirtyState,
  hasLocalSyncableData,
  loadSyncMeta,
  recordLocalSynced,
} from './syncStatus'

const DEBOUNCE_MS = 1500

export type AutoSyncStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export type AutoCloudSyncState = {
  status: AutoSyncStatus
  error: string | null
  /** Last successful cloud push timestamp (ISO), if any */
  lastSavedAt: string | null
}

function formatSavedAt(iso: string | null): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return new Date(t).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Debounced auto-push to cloud whenever local collection/postal/etc. change.
 * Only runs when signed in with an active profile.
 */
export function useAutoCloudSync(): AutoCloudSyncState {
  const { user } = useAuth()
  const { activeProfile } = useProfiles()
  const [status, setStatus] = useState<AutoSyncStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    () => loadSyncMeta()?.updatedAt ?? getSyncDirtyState().lastPushedAt,
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileId = activeProfile?.id

  useEffect(() => {
    if (!user || !profileId) {
      setStatus('idle')
      setError(null)
      setLastSavedAt(null)
      return
    }

    setLastSavedAt(loadSyncMeta()?.updatedAt ?? getSyncDirtyState().lastPushedAt)

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
      const updatedAt = res.data?.updatedAt ?? new Date().toISOString()
      recordLocalSynced({
        updatedAt,
        revision: res.data?.revision ?? 0,
      })
      setLastSavedAt(updatedAt)
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

    if (getSyncDirtyState().dirty && hasLocalSyncableData()) schedule()

    const unsub = onLocalDataChanged(schedule)
    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user, profileId])

  return { status, error, lastSavedAt }
}

export { formatSavedAt }
