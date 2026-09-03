import { Outlet } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useProfiles } from '../lib/ProfileContext'

export function Layout() {
  const { storageKey } = useProfiles()

  return (
    <>
      <Header />
      {/* Remount pages when collector profile changes so each gets its own data */}
      <Outlet key={storageKey} />
      <Footer />
    </>
  )
}
