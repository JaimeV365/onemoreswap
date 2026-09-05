import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { PasteListsPanel } from './PasteTool'
import styles from './Page.module.css'
import matchStyles from './Match.module.css'

export type SwapHub = 'paste' | 'find'

type SwapProps = {
  initialHub?: SwapHub
}

/** @deprecated use SwapHub */
export type MatchHub = SwapHub

function FindSwapsPanel() {
  return (
    <div>
      <p className={styles.lead} style={{ marginTop: 0 }}>
        Coming soon: help finding swaps for the stickers you still need.
      </p>
      <p className={matchStyles.hubLead}>
        When enough collectors are on One More Swap, you&apos;ll be able to find fair postal swaps
        here. Until then, paste a list or swap with your contacts.
      </p>
      <div className={styles.actions}>
        <Link to="/contacts">
          <Button>Open contacts</Button>
        </Link>
        <Link to="/">
          <Button variant="ghost">My collection</Button>
        </Link>
      </div>
    </div>
  )
}

export function Match({ initialHub = 'paste' }: SwapProps) {
  const [hub, setHub] = useState<SwapHub>(initialHub === 'find' ? 'find' : 'paste')
  const navigate = useNavigate()

  useEffect(() => {
    setHub(initialHub === 'find' ? 'find' : 'paste')
  }, [initialHub])

  const selectHub = (next: SwapHub) => {
    setHub(next)
    navigate(next === 'find' ? '/swap?tab=find' : '/swap', { replace: true })
  }

  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>Swap</h1>
      <p className={styles.lead}>
        See what you can trade — paste someone&apos;s list, or find new swaps when that launches.
      </p>

      <div className={matchStyles.hubTabs} role="tablist" aria-label="Swap modes">
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
          aria-selected={hub === 'find'}
          className={[matchStyles.hubTab, hub === 'find' ? matchStyles.hubTabActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => selectHub('find')}
        >
          Find swaps
        </button>
      </div>

      <div className={matchStyles.hubPanel} role="tabpanel">
        {hub === 'paste' ? (
          <>
            <p className={matchStyles.hubLead}>
              Paste their needs and/or spares. We compare with your collection and show what you can
              swap — ready to copy into a reply.
            </p>
            <PasteListsPanel />
          </>
        ) : (
          <FindSwapsPanel />
        )}
      </div>
    </main>
  )
}

/** Alias for clarity in new code */
export const Swap = Match
