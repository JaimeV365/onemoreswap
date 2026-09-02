import { Wordmark } from './Wordmark'
import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand}>
          <Wordmark size="sm" />
        </a>
        <nav className={styles.nav} aria-label="Main">
          <a href="#how-it-works">How it works</a>
          <a href="#albums">Albums</a>
        </nav>
      </div>
    </header>
  )
}
