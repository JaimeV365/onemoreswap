import { Button } from '../components/Button'
import { Wordmark } from '../components/Wordmark'
import styles from './Home.module.css'

const tiers = [
  {
    title: 'Contacts',
    badge: 'Always free',
    body: 'Swap with people you already know — mates from school, family, your WhatsApp group.',
  },
  {
    title: 'Paste & match',
    badge: 'Always free',
    body: 'Paste a list of spares or needs. See overlaps instantly. No account required.',
  },
  {
    title: 'Platform matching',
    badge: 'Free at launch',
    body: 'We match you with collectors near you who need what you have — post only, reputation built in.',
  },
]

const albums = [
  {
    name: 'World Cup 2026',
    accent: 'wc' as const,
    note: 'Panini spike — get in early while the album is hot.',
  },
  {
    name: 'Premier League',
    accent: 'pl' as const,
    note: 'Topps retention — keep swapping after the tournament.',
  },
]

export function Home() {
  return (
    <main>
      <section className={styles.hero}>
        <Wordmark />
        <h1 className={styles.heroTitle}>Just need one more?</h1>
        <p className={styles.heroLead}>
          One More Swap matches you with collectors who have your spares and need your duplicates.
          Track your album, find fair swaps, finish the book.
        </p>
        <div className={styles.heroActions}>
          <Button disabled title="Coming soon">
            Sign in with Google
          </Button>
          <Button variant="secondary" disabled title="Coming soon">
            Try paste tool
          </Button>
        </div>
        <p className={styles.heroNote}>Launching soon — accounts and matching on the way.</p>
      </section>

      <section id="how-it-works" className={styles.section}>
        <h2 className={styles.sectionTitle}>Three ways to swap</h2>
        <div className={styles.cardGrid}>
          {tiers.map((tier) => (
            <article key={tier.title} className={styles.card}>
              <span className={styles.badge}>{tier.badge}</span>
              <h3>{tier.title}</h3>
              <p>{tier.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="albums" className={styles.section}>
        <h2 className={styles.sectionTitle}>Built for more than one album</h2>
        <p className={styles.sectionLead}>
          World Cup cycles are spikes. We stay useful all season with league albums too.
        </p>
        <div className={styles.albumGrid}>
          {albums.map((album) => (
            <article
              key={album.name}
              className={[styles.albumCard, styles[album.accent]].join(' ')}
            >
              <h3>{album.name}</h3>
              <p>{album.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.ctaBox}>
          <h2 className={styles.ctaTitle}>Your spares. Their needs. One more swap.</h2>
          <p className={styles.ctaLead}>
            We introduce collectors — you post the stickers. Reputation keeps everyone honest.
          </p>
          <Button disabled>Get notified at launch</Button>
        </div>
      </section>
    </main>
  )
}
