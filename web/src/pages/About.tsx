import { Link } from 'react-router-dom'
import styles from './Page.module.css'

export function About() {
  return (
    <main className={styles.page} id="main-content">
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
            <strong>Contacts</strong> —{' '}
            <Link to="/contacts">invite people you already know</Link> and compare needs/spares
            (always free).
          </li>
          <li>
            <strong>Paste &amp; match</strong> — paste lists from WhatsApp or forums; see overlaps
            instantly (always free, no account).
          </li>
          <li>
            <strong>Platform matching</strong> — stranger introductions later (
            <Link to="/matching">what’s planned</Link>); free at launch when it ships.
          </li>
        </ul>
        <h2>Albums</h2>
        <p>
          Built for more than one tournament. World Cup 2026 Panini and Premier League Topps are
          supported from day one, with more albums as demand grows.
        </p>
        <h2>Official stickers only (unless said otherwise)</h2>
        <p>
          Swaps on One More Swap are for finishing real albums. Assume the other person means{' '}
          <strong>official</strong> stickers. If anyone wants to include unofficial or counterfeit
          stickers, they must say so clearly up front so both sides can agree — or walk away. Silent
          fakes are not OK.
        </p>
        <h2>Operator</h2>
        <p>
          Operated by JAND Games in the United Kingdom. The product brand is One More Swap; the
          studio name stays behind the scenes for legal and operations.
        </p>
        <p>
          <Link to="/paste">Try the paste tool</Link> or{' '}
          <Link to="/">track your collection</Link> — both work without an account today.
        </p>
      </div>
    </main>
  )
}
