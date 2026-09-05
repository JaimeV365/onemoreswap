import { Link } from 'react-router-dom'
import { Button } from './Button'
import { SharePanel } from './SharePanel'
import type { CollectionAlbumState } from '../lib/types'
import { PasteListsPanel } from '../pages/PasteTool'
import styles from '../pages/Page.module.css'
import matchStyles from '../pages/Match.module.css'

export type SwapHub = 'share' | 'paste' | 'find'

type SwapPanelProps = {
  albumId: string
  state: CollectionAlbumState
  hub: SwapHub
  onHubChange: (hub: SwapHub) => void
}

function FindSwapsPanel() {
  return (
    <div>
      <p className={styles.lead} style={{ marginTop: 0 }}>
        Coming soon: help finding swaps for the stickers you still need.
      </p>
      <p className={matchStyles.hubLead}>
        When enough collectors are on One More Swap, you&apos;ll be able to find fair postal swaps
        here. Until then, share your list or paste someone else&apos;s.
      </p>
      <div className={styles.actions}>
        <Link to="/contacts">
          <Button>Open contacts</Button>
        </Link>
      </div>
    </div>
  )
}

const hubs: { id: SwapHub; label: string }[] = [
  { id: 'share', label: 'Share' },
  { id: 'paste', label: 'Paste lists' },
  { id: 'find', label: 'Find swaps' },
]

/** Swap tools for the selected album (lives under Collection). */
export function SwapPanel({ albumId, state, hub, onHubChange }: SwapPanelProps) {
  return (
    <div>
      <div className={matchStyles.hubTabs} role="tablist" aria-label="Swap tools">
        {hubs.map((h) => (
          <button
            key={h.id}
            type="button"
            role="tab"
            aria-selected={hub === h.id}
            className={[matchStyles.hubTab, hub === h.id ? matchStyles.hubTabActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onHubChange(h.id)}
          >
            {h.label}
          </button>
        ))}
      </div>

      <div className={matchStyles.hubPanel} role="tabpanel">
        {hub === 'share' ? (
          <>
            <p className={matchStyles.hubLead}>
              Copy your needs or want-soons for chat, or create an anonymous swap link.
            </p>
            <SharePanel albumId={albumId} state={state} bare />
          </>
        ) : hub === 'paste' ? (
          <>
            <p className={matchStyles.hubLead}>
              Paste their needs and/or spares. We compare with this album and show what you can
              swap — ready to copy into a reply.
            </p>
            <PasteListsPanel albumId={albumId} hideAlbumPicker />
          </>
        ) : (
          <FindSwapsPanel />
        )}
      </div>
    </div>
  )
}

export function parseSwapHub(raw: string | null): SwapHub {
  if (raw === 'paste') return 'paste'
  if (raw === 'find' || raw === 'strangers') return 'find'
  if (raw === 'list' || raw === 'share') return 'share'
  return 'share'
}
