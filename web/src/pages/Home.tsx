import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Wordmark } from '../components/Wordmark'
import styles from './Home.module.css'

const available = [
  {
    title: 'Track your collection',
    badge: 'Ready now',
    body: 'World Cup 2026 and Premier League albums. Quick-add what you have — or paste what’s missing. Spares, needs, and postal swaps stay on this device (or sync to your account).',
    link: '/',
    linkLabel: 'Open my collection →',
  },
  {
    title: 'Match lists',
    badge: 'Ready now',
    body: 'Paste a list from WhatsApp or social media. See overlaps with your needs and spares instantly. No account required.',
    link: '/match',
    linkLabel: 'Open Match →',
  },
  {
    title: 'Anonymous share links',
    badge: 'Ready now',
    body: 'Post a match link that only shows sticker numbers. Others paste their list, see overlaps, and reply on social — without seeing your name.',
    link: '/',
    linkLabel: 'Create a link from Collection →',
  },
  {
    title: 'Contacts',
    badge: 'Ready now',
    body: 'Invite people you already know. Compare needs and spares from cloud backups — mutual overlaps only. Face-to-face at your discretion.',
    link: '/contacts',
    linkLabel: 'Open contacts →',
  },
]

const coming = [
  {
    title: 'Platform matching',
    body: 'Match with collectors you don’t know yet. Post-only introductions, reputation built in. Free at launch when it ships.',
    link: '/match?tab=strangers',
    linkLabel: 'See what’s planned →',
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
    <main id="main-content">
      <section className={styles.hero}>
        <Wordmark />
        <h1 className={styles.heroTitle}>Just need one more?</h1>
        <p className={styles.heroLead}>
          Track your album, share spares and needs, and match lists from chat. Finish the book —
          without giving strangers your name.
        </p>
        <div className={styles.heroActions}>
          <Link to="/">
            <Button>Open my collection</Button>
          </Link>
          <Link to="/match">
            <Button variant="secondary">Try Match</Button>
          </Link>
        </div>
        <p className={styles.heroNote}>
          No account needed for collection, matching lists, and postal tracking on this device.
        </p>
      </section>

      <section id="how-it-works" className={styles.section}>
        <h2 className={styles.sectionTitle}>What you can do today</h2>
        <div className={styles.cardGrid}>
          {available.map((item) => (
            <article key={item.title} className={styles.card}>
              <span className={styles.badge}>{item.badge}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <Link to={item.link} className={styles.cardLink}>
                {item.linkLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Coming next</h2>
        <p className={styles.sectionLead}>
          Stranger matching waits until there are enough collectors — we won’t pretend it’s live
          until it is.
        </p>
        <div className={styles.cardGrid}>
          {coming.map((item) => (
            <article key={item.title} className={[styles.card, styles.cardSoon].join(' ')}>
              <span className={styles.badgeSoon}>Coming soon</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              {item.link && (
                <Link to={item.link} className={styles.cardLink}>
                  {item.linkLabel}
                </Link>
              )}
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
            Paste a list from WhatsApp, see what matches, save your collection for next time.
          </p>
          <Link to="/">
            <Button>Start matching</Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
