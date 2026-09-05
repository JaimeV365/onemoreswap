import { useEffect, useId, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { CloseIcon, MenuIcon } from './icons'
import { ProfileSwitcher } from './ProfileSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { Wordmark } from './Wordmark'
import styles from './Header.module.css'

const nav = [
  { to: '/', label: 'Collection', end: true },
  { to: '/paste', label: 'Paste tool' },
  { to: '/postal', label: 'Postal' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/account', label: 'Account' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} onClick={closeMenu}>
          <Wordmark size="sm" />
        </Link>
        <div className={styles.right}>
          <nav className={styles.navDesktop} aria-label="Main">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? styles.active : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
          <ProfileSwitcher />
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={styles.mobilePanel} id={menuId}>
          <nav className={styles.navMobile} aria-label="Main">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? styles.active : undefined)}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
