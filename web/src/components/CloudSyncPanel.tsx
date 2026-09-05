import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useProfiles } from '../lib/ProfileContext'
import {
  applyCloudSyncLocally,
  pullCloudSync,
  pushCloudSync,
} from '../lib/cloudSync'
import {
  getSyncDirtyState,
  loadSyncMeta,
  recordLocalSynced,
} from '../lib/syncStatus'
import { delayedBusyLabel, useDelayedBusy } from '../lib/useDelayedBusy'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import styles from '../pages/Page.module.css'
import syncStyles from './CloudSync.module.css'

type CloudSyncPanelProps = {
  onApplied?: () => void
  /** Bump when local data may have changed */
  refreshKey?: number | string
  /** Skip outer panel chrome when nested in a collapsible section */
  bare?: boolean
}

type BusyAction = 'save' | 'load' | 'check' | null

export function CloudSyncPanel({ onApplied, refreshKey = 0, bare = false }: CloudSyncPanelProps) {
  const { user } = useAuth()
  const { activeProfile } = useProfiles()
  const [busy, setBusy] = useState<BusyAction>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cloudMeta, setCloudMeta] = useState<{ updatedAt: string | null; revision: number } | null>(
    null,
  )
  const [confirmLoad, setConfirmLoad] = useState(false)
  const [tick, setTick] = useState(0)
  const busyPhase = useDelayedBusy(busy !== null)
  const busyLabel = delayedBusyLabel(busyPhase, {
    show:
      busy === 'save'
        ? 'Saving to cloud…'
        : busy === 'load'
          ? 'Loading from cloud…'
          : busy === 'check'
            ? 'Checking cloud…'
            : 'Working…',
    slow:
      busy === 'save'
        ? 'Still saving to cloud — check your connection if this continues…'
        : busy === 'load'
          ? 'Still loading from cloud — this is taking longer than usual…'
          : busy === 'check'
            ? 'Still checking the cloud…'
            : 'Still working…',
  })

  useEffect(() => {
    setTick((t) => t + 1)
    const meta = loadSyncMeta()
    if (meta) {
      setCloudMeta({ updatedAt: meta.updatedAt, revision: meta.revision })
    }
  }, [refreshKey, activeProfile?.id])

  const shellClass = bare ? syncStyles.bare : styles.panel
  const shellStyle = bare ? undefined : { marginTop: 'var(--space-lg)' }

  if (!user) {
    return (
      <div className={shellClass} style={shellStyle}>
        {!bare && <h2 className={styles.panelTitle}>Cloud sync</h2>}
        <p className={syncStyles.hint}>
          <Link to="/account">Sign in</Link> and add a collector profile to back up this collection
          to the cloud.
        </p>
      </div>
    )
  }

  if (!activeProfile) {
    return (
      <div className={shellClass} style={shellStyle}>
        {!bare && <h2 className={styles.panelTitle}>Cloud sync</h2>}
        <p className={syncStyles.hint}>
          <Link to="/account">Add a collector profile</Link> first — sync is per profile.
        </p>
      </div>
    )
  }

  void tick
  const dirty = getSyncDirtyState()
  const isBusy = busy !== null

  const checkCloud = async () => {
    setBusy('check')
    setError(null)
    setMessage(null)
    try {
      const res = await pullCloudSync(activeProfile.id)
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
    } finally {
      setBusy(null)
    }
  }

  const saveToCloud = async () => {
    setBusy('save')
    setError(null)
    setMessage(null)
    try {
      const res = await pushCloudSync(activeProfile.id)
      if (res.error) {
        setError(res.error)
        return
      }
      const updatedAt = res.data?.updatedAt ?? null
      const revision = res.data?.revision ?? 0
      recordLocalSynced({ updatedAt, revision })
      setCloudMeta({ updatedAt, revision })
      setTick((t) => t + 1)
      setMessage(`Saved to cloud for ${activeProfile.displayName}.`)
    } finally {
      setBusy(null)
    }
  }

  const loadFromCloud = async () => {
    setConfirmLoad(false)
    setBusy('load')
    setError(null)
    setMessage(null)
    try {
      const res = await pullCloudSync(activeProfile.id)
      if (res.error) {
        setError(res.error)
        return
      }
      if (!res.data?.exists) {
        setMessage('No cloud copy to load yet.')
        return
      }
      applyCloudSyncLocally(res.data)
      recordLocalSynced({
        updatedAt: res.data.updatedAt,
        revision: res.data.revision,
      })
      setCloudMeta({
        updatedAt: res.data.updatedAt,
        revision: res.data.revision,
      })
      setTick((t) => t + 1)
      setMessage('Loaded from cloud.')
      onApplied?.()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={shellClass} style={shellStyle} id="cloud-sync">
      {!bare && <h2 className={styles.panelTitle}>Cloud sync</h2>}
      <p className={syncStyles.hint}>
        Back up <strong>{activeProfile.displayName}</strong>’s collection and postal swaps to your
        One More Swap account. Does not merge — save uploads this device; load replaces this device.
      </p>
      {dirty.dirty && (
        <p className={syncStyles.dirty}>
          {dirty.neverSynced
            ? 'This profile has not been saved to the cloud yet.'
            : 'Local changes pending — save to update the cloud copy.'}
        </p>
      )}
      {(cloudMeta?.updatedAt || dirty.lastPushedAt) && (
        <p className={syncStyles.meta}>
          Last cloud save:{' '}
          {new Date(cloudMeta?.updatedAt || dirty.lastPushedAt || '').toLocaleString()}
          {(cloudMeta?.revision || dirty.revision) > 0
            ? ` · rev ${cloudMeta?.revision || dirty.revision}`
            : ''}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="button" disabled={isBusy} onClick={saveToCloud}>
          Save to cloud
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isBusy}
          onClick={() => setConfirmLoad(true)}
        >
          Load from cloud
        </Button>
        <Button type="button" variant="ghost" disabled={isBusy} onClick={checkCloud}>
          Check cloud
        </Button>
      </div>
      {busyLabel && (
        <p className={syncStyles.busy} role="status" aria-live="polite">
          {busyLabel}
        </p>
      )}
      {error && (
        <p className={[styles.notice, styles.noticeError].join(' ')} role="alert">
          {error}
        </p>
      )}
      {message && <p className={[styles.notice, styles.noticeOk].join(' ')}>{message}</p>}

      <ConfirmDialog
        open={confirmLoad}
        title={`Replace “${activeProfile.displayName}” on this device?`}
        body="Collection, postal swaps, and custom sources will be overwritten with the cloud copy."
        confirmLabel="Load from cloud"
        cancelLabel="Cancel"
        danger
        onConfirm={loadFromCloud}
        onCancel={() => setConfirmLoad(false)}
      />
    </div>
  )
}
