import { Outlet } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useAuth } from '../lib/AuthContext'
import { useProfiles } from '../lib/ProfileContext'
import { delayedBusyLabel, useDelayedBusy } from '../lib/useDelayedBusy'
import { formatSavedAt, useAutoCloudSync } from '../lib/useAutoCloudSync'
import styles from './Layout.module.css'

export function Layout() {
  const { storageKey, dataEpoch, activeProfile, hydrating } = useProfiles()
  const { user } = useAuth()
  const { status, error, lastSavedAt } = useAutoCloudSync()
  const savedLabel = formatSavedAt(lastSavedAt)

  const backgroundBusy =
    !hydrating && (status === 'saving' || status === 'syncing' || status === 'pending')
  const syncPhase = useDelayedBusy(backgroundBusy)
  // Login / profile open: surface sooner so the page doesn’t look stuck
  const hydratePhase = useDelayedBusy(hydrating, 150, 2000)

  let busyLabel: string | null = null
  if (hydrating) {
    busyLabel = delayedBusyLabel(hydratePhase, {
      show: 'Loading your collection from the cloud…',
      slow: 'Still loading your collection — this is taking longer than usual…',
    })
  } else if (status === 'saving') {
    busyLabel = delayedBusyLabel(syncPhase, {
      show: 'Saving your changes…',
      slow: 'Still saving — check your connection if this continues…',
    })
  } else if (status === 'syncing') {
    busyLabel = delayedBusyLabel(syncPhase, {
      show: 'Checking for updates…',
      slow: 'Still checking for updates…',
    })
  } else if (status === 'pending') {
    busyLabel = delayedBusyLabel(syncPhase, {
      show: 'Sync pending…',
      slow: 'Still waiting to sync…',
    })
  }

  const showBusy = Boolean(busyLabel)

  let steadyLabel: string | null = null
  if (!showBusy) {
    if (status === 'saved') {
      steadyLabel = savedLabel ? `Synced · ${savedLabel}` : 'Synced'
    } else if (status === 'updated') {
      steadyLabel = savedLabel
        ? `Updated from another device · ${savedLabel}`
        : 'Updated from another device'
    } else if (status === 'error') {
      steadyLabel = error || 'Could not sync'
    } else {
      steadyLabel = savedLabel
        ? `In sync · ${savedLabel}`
        : 'Cloud sync on — waiting for your first save'
    }
  }

  return (
    <>
      <a className={styles.skip} href="#main-content">
        Skip to main content
      </a>
      <Header />
      {user && activeProfile && (
        <div
          className={[
            styles.syncBar,
            status === 'error' && !showBusy ? styles.syncError : '',
            (status === 'saved' || status === 'updated') && !showBusy ? styles.syncOk : '',
            showBusy ? styles.syncBusy : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="status"
          aria-live="polite"
          title={
            savedLabel
              ? `Last successful sync: ${savedLabel}`
              : 'Keeps this device in sync with your other devices'
          }
        >
          {showBusy ? busyLabel : steadyLabel}
        </div>
      )}
      {/* Remount when profile changes or cloud data is applied */}
      <Outlet key={`${storageKey}:${dataEpoch}`} />
      <Footer />
    </>
  )
}
