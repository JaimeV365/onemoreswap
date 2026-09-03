import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useProfiles } from '../lib/ProfileContext'
import {
  applyCloudSyncLocally,
  pullCloudSync,
  pushCloudSync,
} from '../lib/cloudSync'
import { Button } from './Button'
import styles from '../pages/Page.module.css'
import syncStyles from './CloudSync.module.css'

type CloudSyncPanelProps = {
  onApplied?: () => void
}

export function CloudSyncPanel({ onApplied }: CloudSyncPanelProps) {
  const { user } = useAuth()
  const { activeProfile } = useProfiles()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cloudMeta, setCloudMeta] = useState<{ updatedAt: string | null; revision: number } | null>(
    null,
  )

  if (!user) {
    return (
      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>Cloud sync</h2>
        <p className={syncStyles.hint}>
          <Link to="/account">Sign in</Link> and add a collector profile to back up this collection
          to the cloud.
        </p>
      </section>
    )
  }

  if (!activeProfile) {
    return (
      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>Cloud sync</h2>
        <p className={syncStyles.hint}>
          <Link to="/account">Add a collector profile</Link> first — sync is per profile.
        </p>
      </section>
    )
  }

  const checkCloud = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    const res = await pullCloudSync(activeProfile.id)
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setCloudMeta({
      updatedAt: res.data?.updatedAt ?? null,
      revision: res.data?.revision ?? 0,
    })
    setMessage(
      res.data?.exists
        ? `Cloud copy found (revision ${res.data.revision}).`
        : 'No cloud copy yet — use Save to cloud.',
    )
  }

  const saveToCloud = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    const res = await pushCloudSync(activeProfile.id)
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setCloudMeta({
      updatedAt: res.data?.updatedAt ?? null,
      revision: res.data?.revision ?? 0,
    })
    setMessage(`Saved to cloud for ${activeProfile.displayName}.`)
  }

  const loadFromCloud = async () => {
    if (
      !confirm(
        `Replace this device’s data for “${activeProfile.displayName}” with the cloud copy?\n\nCollection, postal swaps, and custom sources will be overwritten.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    const res = await pullCloudSync(activeProfile.id)
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    if (!res.data?.exists) {
      setMessage('No cloud copy to load yet.')
      return
    }
    applyCloudSyncLocally(res.data)
    setCloudMeta({
      updatedAt: res.data.updatedAt,
      revision: res.data.revision,
    })
    setMessage('Loaded from cloud.')
    onApplied?.()
  }

  return (
    <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
      <h2 className={styles.panelTitle}>Cloud sync</h2>
      <p className={syncStyles.hint}>
        Back up <strong>{activeProfile.displayName}</strong>’s collection and postal swaps to your
        One More Swap account. Does not merge — save uploads this device; load replaces this device.
      </p>
      {cloudMeta?.updatedAt && (
        <p className={syncStyles.meta}>
          Last cloud save: {new Date(cloudMeta.updatedAt).toLocaleString()} · rev {cloudMeta.revision}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="button" disabled={busy} onClick={saveToCloud}>
          Save to cloud
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={loadFromCloud}>
          Load from cloud
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={checkCloud}>
          Check cloud
        </Button>
      </div>
      {error && (
        <p className={[styles.notice, styles.noticeError].join(' ')} role="alert">
          {error}
        </p>
      )}
      {message && <p className={[styles.notice, styles.noticeOk].join(' ')}>{message}</p>}
    </section>
  )
}
