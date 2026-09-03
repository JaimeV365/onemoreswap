import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useProfiles } from '../lib/ProfileContext'
import { pushCloudSync } from '../lib/cloudSync'
import {
  getSyncDirtyState,
  hasLocalSyncableData,
  recordLocalSynced,
} from '../lib/syncStatus'
import { Button } from './Button'
import styles from './CloudSync.module.css'

type CloudSyncBannerProps = {
  /** Bump when local data may have changed */
  refreshKey?: number | string
  onSaved?: () => void
}

export function CloudSyncBanner({ refreshKey = 0, onSaved }: CloudSyncBannerProps) {
  const { user } = useAuth()
  const { activeProfile } = useProfiles()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const recompute = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    recompute()
  }, [refreshKey, activeProfile?.id, user?.id, recompute])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') recompute()
    }
    window.addEventListener('focus', recompute)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', recompute)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [recompute])

  if (!user || !activeProfile) return null

  // tick forces a fresh fingerprint read after edits / saves
  void tick
  const dirty = getSyncDirtyState()
  if (!hasLocalSyncableData() || !dirty.dirty) return null

  const saveNow = async () => {
    setBusy(true)
    setError(null)
    const res = await pushCloudSync(activeProfile.id)
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    recordLocalSynced({
      updatedAt: res.data?.updatedAt ?? null,
      revision: res.data?.revision ?? 0,
    })
    recompute()
    onSaved?.()
  }

  return (
    <aside className={styles.banner} role="status">
      <div className={styles.bannerText}>
        <strong>{dirty.neverSynced ? 'Not backed up to the cloud yet' : 'Local changes not saved'}</strong>
        <span>
          {dirty.neverSynced
            ? `Save ${activeProfile.displayName}’s collection so it isn’t only on this device.`
            : 'Collection or postal data changed since the last cloud save.'}
        </span>
        {error && <span className={styles.bannerError}>{error}</span>}
      </div>
      <div className={styles.bannerActions}>
        <Button type="button" disabled={busy} onClick={saveNow}>
          {busy ? 'Saving…' : 'Save to cloud'}
        </Button>
      </div>
    </aside>
  )
}
