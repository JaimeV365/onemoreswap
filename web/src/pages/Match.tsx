import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { PasteListsPanel } from './PasteTool'
import styles from './Page.module.css'
import matchStyles from './Match.module.css'

export type MatchHub = 'paste' | 'strangers'

type MatchProps = {
  initialHub?: MatchHub
}

function FindStrangersPanel() {
  return (
    <div>
      <p className={styles.lead} style={{ marginTop: 0 }}>
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
          Build your collection, paste lists here under <strong>Paste lists</strong>, track postal
          swaps, and connect people you already know.
        </p>
        <div className={styles.actions}>
          <Link to="/contacts">
            <Button>Open contacts</Button>
          </Link>
          <Link to="/">
            <Button variant="ghost">My collection</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

export function Match({ initialHub = 'paste' }: MatchProps) {
  const [hub, setHub] = useState<MatchHub>(initialHub)
  const navigate = useNavigate()

  useEffect(() => {
    setHub(initialHub)
  }, [initialHub])

  const selectHub = (next: MatchHub) => {
    setHub(next)
    navigate(next === 'strangers' ? '/match?tab=strangers' : '/match', { replace: true })
  }

  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>Match</h1>
      <p className={styles.lead}>
        Compare lists with another collector, or (later) find strangers when the network is ready.
      </p>

      <div className={matchStyles.hubTabs} role="tablist" aria-label="Match modes">
        <button
          type="button"
          role="tab"
          aria-selected={hub === 'paste'}
          className={[matchStyles.hubTab, hub === 'paste' ? matchStyles.hubTabActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => selectHub('paste')}
        >
          Paste lists
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={hub === 'strangers'}
          className={[matchStyles.hubTab, hub === 'strangers' ? matchStyles.hubTabActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => selectHub('strangers')}
        >
          Find strangers
        </button>
      </div>

      <div className={matchStyles.hubPanel} role="tabpanel">
        {hub === 'paste' ? (
          <>
            <p className={matchStyles.hubLead}>
              Paste their needs and/or spares. We compare with your collection and show what matches
              — ready to copy into a reply.
            </p>
            <PasteListsPanel />
          </>
        ) : (
          <FindStrangersPanel />
        )}
      </div>
    </main>
  )
}
