import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.tagline}>One more swap. Finish the album.</p>
        <nav className={styles.links} aria-label="Footer">
          <Link to="/">Collection</Link>
          <Link to="/contacts">Contacts</Link>
          <Link to="/account">Account</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/welcome">About the product</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
        <p className={styles.meta}>Introduction service for sticker collectors</p>
        <p className={styles.copy}>© {new Date().getFullYear()} One More Swap</p>
      </div>
    </footer>
  )
}
