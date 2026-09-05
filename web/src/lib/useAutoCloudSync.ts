import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  applyCloudSyncLocally,
  pullCloudSync,
  pushCloudSync,
} from './cloudSync'
import { onLocalDataChanged } from './localDataEvents'
import { useProfiles } from './ProfileContext'
import {
  getSyncDirtyState,
  hasLocalSyncableData,
  loadSyncMeta,
  recordLocalSynced,
} from './syncStatus'

const DEBOUNCE_MS = 1500
/** Poll cloud often enough that laptop ↔ phone changes show within about a minute. */
const PULL_INTERVAL_MS = 45_000

export type AutoSyncStatus =
  | 'idle'
  | 'pending'
  | 'saving'
  | 'syncing'
  | 'saved'
  | 'updated'
  | 'error'

export type AutoCloudSyncState = {
  status: AutoSyncStatus
  error: string | null
  /** Last successful cloud push/pull timestamp (ISO), if any */
  lastSavedAt: string | null
}

function formatSavedAt(iso: string | null): string | null {
  if (!iso) return null
  const t = DateParseSafe(iso)
  if (t == null) return null
  return new Date(t).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function DateParseSafe(iso: string): number | null {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

/**
 * Cloud-first sync for the active collector profile (same idea as most account apps):
 * - On login / profile open, ProfileContext loads the latest cloud copy
 * - Local edits push to the cloud (~1.5s after you change something)
 * - While the app stays open, it also pulls newer cloud revisions (~45s / on focus)
 *   so a second device can catch up without signing in again
 *
 * Mid-edit on this device: we don't overwrite local unsaved changes with a pull;
 * those changes push shortly and become the new cloud version.
 */
export function useAutoCloudSync(): AutoCloudSyncState {
  const { user } = useAuth()
  const { activeProfile, hydrating, bumpDataEpoch } = useProfiles()
  const [status, setStatus] = useState<AutoSyncStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    () => loadSyncMeta()?.updatedAt ?? getSyncDirtyState().lastPushedAt,
  )
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pullTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const busyRef = useRef(false)
  const profileId = activeProfile?.id

  useEffect(() => {
    if (!user || !profileId || hydrating) {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      if (pullTimerRef.current) clearInterval(pullTimerRef.current)
      if (!user || !profileId) {
        setStatus('idle')
        setError(null)
        setLastSavedAt(null)
      }
      return
    }

    setLastSavedAt(loadSyncMeta()?.updatedAt ?? getSyncDirtyState().lastPushedAt)

    const pushNow = async () => {
      if (!hasLocalSyncableData()) return
      const dirty = getSyncDirtyState()
      if (!dirty.dirty) {
        setStatus((s) => (s === 'pending' ? 'idle' : s))
        return
      }
      if (busyRef.current) return
      busyRef.current = true
      setStatus('saving')
      setError(null)
      try {
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
        window.setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2500)
      } finally {
        busyRef.current = false
      }
    }

    /** Apply cloud when it is ahead and this device has no unsaved local edits. */
    const pullNow = async () => {
      if (busyRef.current) return
      const dirty = getSyncDirtyState().dirty
      if (dirty) return

      busyRef.current = true
      setStatus((s) => (s === 'idle' || s === 'updated' || s === 'saved' ? 'syncing' : s))
      try {
        const res = await pullCloudSync(profileId)
        if (res.error) {
          setStatus('error')
          setError(res.error)
          return
        }
        if (!res.data?.exists) {
          setStatus((s) => (s === 'syncing' ? 'idle' : s))
          return
        }

        const localRev = loadSyncMeta()?.revision ?? 0
        if (res.data.revision <= localRev) {
          setStatus((s) => (s === 'syncing' ? 'idle' : s))
          return
        }

        // Re-check dirty — user may have edited during the fetch
        if (getSyncDirtyState().dirty) {
          setStatus((s) => (s === 'syncing' ? 'idle' : s))
          return
        }

        applyCloudSyncLocally(res.data)
        recordLocalSynced({
          updatedAt: res.data.updatedAt,
          revision: res.data.revision,
        })
        setLastSavedAt(res.data.updatedAt)
        bumpDataEpoch()
        setStatus('updated')
        window.setTimeout(() => setStatus((s) => (s === 'updated' ? 'idle' : s)), 2500)
      } finally {
        busyRef.current = false
      }
    }

    const schedulePush = () => {
      setStatus((s) => (s === 'saving' || s === 'syncing' ? s : 'pending'))
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      pushTimerRef.current = setTimeout(() => {
        void pushNow()
      }, DEBOUNCE_MS)
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void (async () => {
        await pullNow()
        if (getSyncDirtyState().dirty && hasLocalSyncableData()) schedulePush()
      })()
    }

    // Initial catch-up, then poll
    void pullNow()
    pullTimerRef.current = setInterval(() => {
      void pullNow()
    }, PULL_INTERVAL_MS)

    if (getSyncDirtyState().dirty && hasLocalSyncableData()) schedulePush()

    const unsub = onLocalDataChanged(schedulePush)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      unsub()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      if (pullTimerRef.current) clearInterval(pullTimerRef.current)
    }
  }, [user, profileId, hydrating, bumpDataEpoch])

  return { status, error, lastSavedAt }
}

export { formatSavedAt }
