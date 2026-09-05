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
            status === 'saved' ? styles.syncOk : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="status"
          title={
            savedLabel
              ? `Last successful cloud backup: ${savedLabel}`
              : 'Cloud backup for the active collector profile'
          }
        >
          {hydrating && 'Loading your collection from the cloud…'}
          {!hydrating && status === 'pending' && 'Cloud backup pending…'}
          {!hydrating && status === 'saving' && 'Saving to cloud…'}
          {!hydrating &&
            status === 'saved' &&
            (savedLabel ? `Saved to cloud · ${savedLabel}` : 'Saved to cloud')}
          {!hydrating && status === 'error' && (error || 'Could not save to cloud')}
          {!hydrating &&
            status === 'idle' &&
            (savedLabel
              ? `Last cloud save · ${savedLabel}`
              : 'Cloud backup on — waiting for your first save')}
        </div>
      )}
      {/* Remount when profile changes or cloud data is applied */}
      <Outlet key={`${storageKey}:${dataEpoch}`} />
      <Footer />
    </>
  )
}
