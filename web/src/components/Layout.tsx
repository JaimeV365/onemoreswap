import { Outlet } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useAuth } from '../lib/AuthContext'
import { useProfiles } from '../lib/ProfileContext'
import { formatSavedAt, useAutoCloudSync } from '../lib/useAutoCloudSync'
import styles from './Layout.module.css'

export function Layout() {
  const { storageKey, dataEpoch, activeProfile, hydrating } = useProfiles()
  const { user } = useAuth()
  const { status, error, lastSavedAt } = useAutoCloudSync()
  const savedLabel = formatSavedAt(lastSavedAt)

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
            status === 'error' ? styles.syncError : '',
            status === 'saved' || status === 'updated' ? styles.syncOk : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="status"
          title={
            savedLabel
              ? `Last successful sync: ${savedLabel}`
              : 'Keeps this device in sync with your other devices'
          }
        >
          {hydrating && 'Loading your collection from the cloud…'}
          {!hydrating && status === 'pending' && 'Sync pending…'}
          {!hydrating && status === 'saving' && 'Saving your changes…'}
          {!hydrating && status === 'syncing' && 'Checking for updates…'}
          {!hydrating &&
            status === 'saved' &&
            (savedLabel ? `Synced · ${savedLabel}` : 'Synced')}
          {!hydrating &&
            status === 'updated' &&
            (savedLabel ? `Updated from another device · ${savedLabel}` : 'Updated from another device')}
          {!hydrating && status === 'error' && (error || 'Could not sync')}
          {!hydrating &&
            status === 'idle' &&
            (savedLabel
              ? `In sync · ${savedLabel}`
              : 'Cloud sync on — waiting for your first save')}
        </div>
      )}
      {/* Remount when profile changes or cloud data is applied */}
      <Outlet key={`${storageKey}:${dataEpoch}`} />
      <Footer />
    </>
  )
}
