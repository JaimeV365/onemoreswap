import { Outlet } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useAuth } from '../lib/AuthContext'
import { useProfiles } from '../lib/ProfileContext'
import { useAutoCloudSync } from '../lib/useAutoCloudSync'
import styles from './Layout.module.css'

export function Layout() {
  const { storageKey } = useProfiles()
  const { user } = useAuth()
  const { status, error } = useAutoCloudSync()

  return (
    <>
      <a className={styles.skip} href="#main-content">
        Skip to main content
      </a>
      <Header />
      {user && status !== 'idle' && (
        <div
          className={[
            styles.syncBar,
            status === 'error' ? styles.syncError : '',
            status === 'saved' ? styles.syncOk : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="status"
        >
          {status === 'pending' && 'Cloud backup pending…'}
          {status === 'saving' && 'Saving to cloud…'}
          {status === 'saved' && 'Saved to cloud'}
          {status === 'error' && (error || 'Could not save to cloud')}
        </div>
      )}
      {/* Remount pages when collector profile changes so each gets its own data */}
      <Outlet key={storageKey} />
      <Footer />
    </>
  )
}
