import { Outlet } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useProfiles } from '../lib/ProfileContext'
import styles from './Layout.module.css'

export function Layout() {
  const { storageKey } = useProfiles()

  return (
    <>
      <a className={styles.skip} href="#main-content">
        Skip to main content
      </a>
      <Header />
      {/* Remount pages when collector profile changes so each gets its own data */}
      <Outlet key={storageKey} />
      <Footer />
    </>
  )
}
