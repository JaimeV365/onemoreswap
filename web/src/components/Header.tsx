import { Link, NavLink } from 'react-router-dom'
import { ProfileSwitcher } from './ProfileSwitcher'
import { Wordmark } from './Wordmark'
import styles from './Header.module.css'

const nav = [
  { to: '/', label: 'Collection', end: true },
  { to: '/paste', label: 'Paste tool' },
  { to: '/postal', label: 'Postal' },
  { to: '/account', label: 'Account' },
  { to: '/settings', label: 'Settings' },
]

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <Wordmark size="sm" />
        </Link>
        <div className={styles.right}>
          <nav className={styles.nav} aria-label="Main">
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
          <ProfileSwitcher />
        </div>
      </div>
    </header>
  )
}
