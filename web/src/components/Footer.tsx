import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.tagline}>One more swap. Finish the album.</p>
        <p className={styles.meta}>
          Introduction service for sticker collectors · UK-first · Free to start
        </p>
        <p className={styles.copy}>© {new Date().getFullYear()} One More Swap</p>
      </div>
    </footer>
  )
}
