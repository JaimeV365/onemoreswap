import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlbumPicker } from '../components/AlbumPicker'
import { Button } from '../components/Button'
import { SharePanel } from '../components/SharePanel'
import { loadEnabledAlbums } from '../lib/enabledAlbums'
import { emptyAlbumState, getAlbumState, loadCollection } from '../lib/storage'
import { PasteListsPanel } from './PasteTool'
import styles from './Page.module.css'
import matchStyles from './Match.module.css'

export type SwapHub = 'list' | 'paste' | 'find'

type SwapProps = {
  initialHub?: SwapHub
}

/** @deprecated use SwapHub */
export type MatchHub = SwapHub

const DEFAULT_ALBUM = 'wc2026'

function hubPath(hub: SwapHub) {
  if (hub === 'find') return '/swap?tab=find'
  if (hub === 'list') return '/swap?tab=list'
  return '/swap'
}

function MyListPanel() {
  const [albumId, setAlbumId] = useState(() => loadEnabledAlbums()[0] || DEFAULT_ALBUM)
  const [state, setState] = useState(() => getAlbumState(loadCollection(), albumId))

  useEffect(() => {
    setState(getAlbumState(loadCollection(), albumId))
  }, [albumId])

  useEffect(() => {
    const refresh = () => setState(getAlbumState(loadCollection(), albumId))
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [albumId])

  return (
    <div>
      <AlbumPicker value={albumId} onChange={setAlbumId} />
      <SharePanel albumId={albumId || DEFAULT_ALBUM} state={state || emptyAlbumState()} bare listsOnly />
    </div>
  )
}

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

function normalizeHub(hub: SwapHub | undefined): SwapHub {
  if (hub === 'find' || hub === 'list') return hub
  return 'paste'
}

export function Match({ initialHub = 'paste' }: SwapProps) {
  const [hub, setHub] = useState<SwapHub>(() => normalizeHub(initialHub))
  const navigate = useNavigate()

  useEffect(() => {
    setHub(normalizeHub(initialHub))
  }, [initialHub])

  const selectHub = (next: SwapHub) => {
    setHub(next)
    navigate(hubPath(next), { replace: true })
  }

  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>Swap</h1>
      <p className={styles.lead}>
        Copy your list, paste theirs to compare, or find new swaps when that launches.
      </p>

      <div className={matchStyles.hubTabs} role="tablist" aria-label="Swap modes">
        <button
          type="button"
          role="tab"
          aria-selected={hub === 'list'}
          className={[matchStyles.hubTab, hub === 'list' ? matchStyles.hubTabActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => selectHub('list')}
        >
          My list
        </button>
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
        {hub === 'list' ? (
          <>
            <p className={matchStyles.hubLead}>
              Your needs and spares as plain text — tick Want soon only for the starred shortlist.
            </p>
            <MyListPanel />
          </>
        ) : hub === 'paste' ? (
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
