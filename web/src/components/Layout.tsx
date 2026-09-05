import { Outlet } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useAuth } from '../lib/AuthContext'
import { useProfiles } from '../lib/ProfileContext'
import { delayedBusyLabel, useDelayedBusy } from '../lib/useDelayedBusy'
import { useAutoCloudSync } from '../lib/useAutoCloudSync'
import { usePresence } from '../lib/usePresence'
import styles from './Layout.module.css'

export function Layout() {
  const { storageKey, dataEpoch, activeProfile, hydrating } = useProfiles()
  const { user } = useAuth()
  const { status, error } = useAutoCloudSync()
  const { otherDevices } = usePresence()

  const backgroundBusy = !hydrating && status === 'saving'
  const syncPhase = useDelayedBusy(backgroundBusy)
  const hydratePhase = useDelayedBusy(hydrating, 150, 2000)

  let busyLabel: string | null = null
  if (hydrating) {
    busyLabel = delayedBusyLabel(hydratePhase, {
      show: 'Loading your collection…',
      slow: 'Still loading your collection — this is taking longer than usual…',
    })
  } else if (status === 'saving') {
    busyLabel = delayedBusyLabel(syncPhase, {
      show: 'Saving your changes…',
      slow: 'Still saving — check your connection if this continues…',
    })
  } else if (status === 'error') {
    busyLabel = error || 'Could not save your changes'
  }

  const multiDeviceLabel =
    otherDevices === 1
      ? 'Open on 2 devices — editing on both risks losing changes (last save wins). Use one device at a time.'
      : otherDevices > 1
        ? `Open on ${otherDevices + 1} devices — editing on more than one risks losing changes (last save wins). Use one device at a time.`
        : null

  const label = user && activeProfile ? multiDeviceLabel || busyLabel : null
  const isWarn = Boolean(multiDeviceLabel)
  const isError = Boolean(label) && !isWarn && status === 'error'
  const isBusy = Boolean(label) && !isWarn && !isError

  return (
    <>
      <a className={styles.skip} href="#main-content">
        Skip to main content
      </a>
      <Header />
      {label && (
        <div
          className={[
            styles.syncBar,
            isWarn ? styles.syncWarn : '',
            isError ? styles.syncError : '',
            isBusy ? styles.syncBusy : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="status"
          aria-live="polite"
        >
          {label}
        </div>
      )}
      <Outlet key={`${storageKey}:${dataEpoch}`} />
      <Footer />
    </>
  )
}
