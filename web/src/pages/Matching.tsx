import { Link } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import styles from './Page.module.css'

/** Tier 3 placeholder — full matching comes after contacts + density. */
export function Matching() {
  return (
    <main className={styles.page} id="main-content">
      <Badge>Tier 3 · coming later</Badge>
      <h1 className={styles.title}>Platform matching</h1>
      <p className={styles.lead}>
        Algorithm matching with collectors you do not already know — post only, reputation-weighted,
        free at launch when liquidity exists. Not live yet on purpose: matching products die when
        they charge (or promise strangers) before there are enough people.
      </p>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>What will ship here</h2>
        <ul className={styles.bulletList}>
          <li>Distance as approximate miles — no early address or name exchange</li>
          <li>Post-only introductions between strangers</li>
          <li>Reputation and payment preference when fees exist later</li>
          <li>Free allowance / fully free while the network is thin</li>
        </ul>
      </section>

      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>What to use today</h2>
        <p className={styles.lead} style={{ marginBottom: 'var(--space-md)' }}>
          Build your collection, paste lists, track postal swaps, and connect people you already
          know.
        </p>
        <div className={styles.actions}>
          <Link to="/contacts">
            <Button>Open contacts (Tier 1)</Button>
          </Link>
          <Link to="/paste">
            <Button variant="secondary">Paste tool (Tier 2)</Button>
          </Link>
          <Link to="/">
            <Button variant="ghost">My collection</Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
