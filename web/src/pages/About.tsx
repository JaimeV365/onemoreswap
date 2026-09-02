import { Link } from 'react-router-dom'
import styles from './Page.module.css'

export function About() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>About One More Swap</h1>
      <div className={styles.prose}>
        <p>
          One More Swap helps sticker album collectors find fair swaps and finish the book. We are an
          introduction service — we help you discover who has your spares and needs yours, not a
          marketplace or courier.
        </p>
        <h2>Three ways to swap</h2>
        <ul>
          <li>
            <strong>Contacts</strong> — swap with people you already know (always free).
          </li>
          <li>
            <strong>Paste &amp; match</strong> — paste lists from WhatsApp or forums; see overlaps
            instantly (always free, no account).
          </li>
          <li>
            <strong>Platform matching</strong> — we introduce you to collectors near you (free at
            launch).
          </li>
        </ul>
        <h2>Albums</h2>
        <p>
          Built for more than one tournament. World Cup 2026 Panini and Premier League Topps are
          supported from day one, with more albums as demand grows.
        </p>
        <h2>Operator</h2>
        <p>
          Operated by JAND Games in the United Kingdom. The product brand is One More Swap; the
          studio name stays behind the scenes for legal and operations.
        </p>
        <p>
          <Link to="/paste">Try the paste tool</Link> or{' '}
          <Link to="/collection">track your collection</Link> — both work without an account today.
        </p>
      </div>
    </main>
  )
}
