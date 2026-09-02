import { useState } from 'react'
import { buildShareText } from '../lib/catalogue'
import { copyToClipboard } from '../lib/storage'
import type { CollectionAlbumState, ShareTab } from '../lib/types'
import { Button } from './Button'
import styles from './SharePanel.module.css'

type SharePanelProps = {
  albumId: string
  state: CollectionAlbumState
}

const tabs: { id: ShareTab; label: string }[] = [
  { id: 'missing', label: 'Needs only' },
  { id: 'spares', label: 'Spares only' },
  { id: 'both', label: 'Both' },
]

export function SharePanel({ albumId, state }: SharePanelProps) {
  const [tab, setTab] = useState<ShareTab>('both')
  const [copied, setCopied] = useState(false)
  const text = buildShareText(albumId, state, tab)

  const handleCopy = async () => {
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Share list</h2>
      <p className={styles.hint}>
        Copy a formatted list for WhatsApp or Facebook. Includes a link back to One More Swap.
      </p>
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={[styles.tab, tab === t.id ? styles.tabActive : ''].join(' ')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre className={styles.output}>{text}</pre>
      <Button variant="secondary" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy to clipboard'}
      </Button>
    </section>
  )
}
