import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumBrowse } from '../components/AlbumBrowse'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { CloudSyncPanel } from '../components/CloudSyncPanel'
import { OnboardingBanner } from '../components/Onboarding'
import { ProgressBar } from '../components/ProgressBar'
import { SharePanel } from '../components/SharePanel'
import { Textarea } from '../components/Textarea'
import { getAlbum, getAlbumIndexes } from '../lib/catalogue'
import { enableAlbum, loadEnabledAlbums } from '../lib/enabledAlbums'
import { importAnyBackup } from '../lib/importBackup'
import { parseStickerInput } from '../lib/parseStickers'
import { upsertPostalSwaps, pendingIncomingMap } from '../lib/postal'
import {
  addParsedCounts,
  albumProgress,
  downloadJson,
  emptyAlbumState,
  exportCollectionJson,
  getAlbumState,
  isAlbumStarted,
  loadCollection,
  saveCollection,
  setAlbumState,
} from '../lib/storage'
import type { CollectionAlbumState } from '../lib/types'
import styles from './Page.module.css'
import collectionStyles from './Collection.module.css'

function initialAlbumId(): string {
  const enabled = loadEnabledAlbums()
  return enabled[0] || ''
}

export function Collection() {
  const [albumId, setAlbumId] = useState(initialAlbumId)
  const [state, setState] = useState(() =>
    albumId ? getAlbumState(loadCollection(), albumId) : emptyAlbumState(),
  )
  const [addInput, setAddInput] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'needs' | 'spares' | 'incoming'>('all')
  const [message, setMessage] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const album = getAlbum(albumId)
  const indexes = getAlbumIndexes(albumId)

  const persist = useCallback(
    (next: CollectionAlbumState) => {
      setState(next)
      const store = loadCollection()
      saveCollection(setAlbumState(store, albumId, next))
    },
    [albumId],
  )

  const reloadFromStorage = useCallback(() => {
    if (!albumId) {
      setState(emptyAlbumState())
      return
    }
    setState(getAlbumState(loadCollection(), albumId))
  }, [albumId])

  useEffect(() => {
    const enabled = loadEnabledAlbums()
    if (albumId && !enabled.includes(albumId)) {
      setAlbumId(enabled[0] || '')
      return
    }
    if (!albumId && enabled.length) setAlbumId(enabled[0]!)
  }, [albumId])

  useEffect(() => {
    reloadFromStorage()
    setAddInput('')
    setMessage(null)
  }, [albumId, reloadFromStorage])

  const incoming = pendingIncomingMap(albumId)
  const progress = albumProgress(
    state,
    album?.total ?? 0,
    indexes?.catalogue.stickers.map((s) => s.seq) ?? [],
    new Set(incoming.keys()),
  )

  const handleQuickAdd = () => {
    if (!indexes || !addInput.trim()) return
    const { counts, unknown } = parseStickerInput(addInput, indexes)
    if (!counts.size && unknown.length) {
      setMessage(`Could not parse: ${unknown.slice(0, 6).join(', ')}`)
      return
    }
    const allSeqs = indexes.catalogue.stickers.map((s) => s.seq)
    const wasEmpty = state.missing.length === 0 && Object.keys(state.counts).length === 0
    persist(addParsedCounts(state, counts, allSeqs))
    setAddInput('')
    setMessage(
      unknown.length
        ? `Added ${counts.size} sticker type(s). Unrecognised: ${unknown.slice(0, 6).join(', ')}`
        : wasEmpty
          ? `Album started — added stickers are in album; everything else is marked as a need. Share list is ready.`
          : `Added ${counts.size} sticker type(s). First copy → in album; duplicates → spares.`,
    )
  }

  const markAllMissing = () => {
    if (!indexes) return
    if (!confirm(`Mark all ${indexes.catalogue.total} stickers as missing? This replaces your current list.`)) {
      return
    }
    persist({
      missing: indexes.catalogue.stickers.map((s) => s.seq),
      counts: {},
    })
    setMessage('Full album marked as missing — add stickers as you get them.')
  }

  const clearAlbum = () => {
    if (!confirm('Clear this album from your device?')) return
    persist(emptyAlbumState())
    setMessage('Album cleared.')
  }

  return (
    <main className={styles.page}>
      <Badge>Saved on this device</Badge>
      <h1 className={styles.title}>My collection</h1>
      <p className={styles.lead}>
        Track what you need and what you can swap. Click a sticker to add a copy; shift-click to
        remove. Then{' '}
        <Link to="/paste">match against someone else&apos;s list</Link> or track a{' '}
        <Link to="/postal">postal swap</Link>.
      </p>

      <OnboardingBanner show={!isAlbumStarted(state)} />

      <AlbumPicker value={albumId} onChange={setAlbumId} />

      {!albumId ? (
        <p className={styles.lead}>Add an album above to start tracking stickers for this profile.</p>
      ) : (
        <>
      <ProgressBar
        pct={progress.pct}
        label={
          progress.started
            ? `${progress.inAlbum} of ${progress.total} in album · ${progress.missing} missing${
                progress.pending ? ` · ${progress.pending} incoming` : ''
              } · ${progress.spareCopies} spare copies`
            : `Not started — use Quick add or "Start fresh" to begin tracking`
        }
      />

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Quick add</h2>
        <p className={collectionStyles.addHint}>
          {albumId === 'pl2526' ? (
            <>
              Paste stickers you just got — e.g. <code>LIV 5 7 12</code>, <code>ARS1 ARS2</code>, or{' '}
              <code>353 354</code>. First copy goes in the album; extras become spares.
            </>
          ) : (
            <>
              Paste stickers you just got — e.g. <code>ENG 5 7 12</code>, <code>MEX1 MEX2</code>, or{' '}
              <code>570 571</code>. First copy goes in the album; extras become spares.
            </>
          )}
        </p>
        <Textarea
          label="Stickers to add"
          value={addInput}
          onChange={(e) => setAddInput(e.target.value)}
          placeholder="Paste or type sticker codes…"
          rows={3}
        />
        <div className={styles.actions}>
          <Button onClick={handleQuickAdd}>Add to collection</Button>
          <Button variant="secondary" onClick={markAllMissing}>
            Start fresh (all missing)
          </Button>
        </div>
      </section>

      {message && <p className={[styles.notice, styles.noticeOk].join(' ')}>{message}</p>}

      <SharePanel albumId={albumId} state={state} />

      <CloudSyncPanel
        onApplied={() => {
          reloadFromStorage()
          setMessage('Collection loaded from cloud.')
        }}
      />

      <section className={collectionStyles.browseSection}>
        <div className={collectionStyles.browseToolbar}>
          <h2 className={styles.panelTitle}>Browse album</h2>
          <div className={collectionStyles.filters}>
            {(['all', 'needs', 'spares', 'incoming'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={[collectionStyles.filterBtn, filter === f ? collectionStyles.filterActive : ''].join(' ')}
                onClick={() => setFilter(f)}
              >
                {f === 'all'
                  ? 'All'
                  : f === 'needs'
                    ? 'Needs'
                    : f === 'spares'
                      ? 'Spares'
                      : 'Incoming'}
              </button>
            ))}
          </div>
        </div>
        <input
          type="search"
          className={collectionStyles.search}
          placeholder="Find sticker — ENG7, Messi, or 570…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <AlbumBrowse
          albumId={albumId}
          state={state}
          onChange={persist}
          filter={filter}
          search={search}
          incoming={incoming}
        />
      </section>

      <details
        className={collectionStyles.advanced}
        open={showAdvanced}
        onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
      >
        <summary>Advanced — backup &amp; reset</summary>
        <p className={collectionStyles.advancedHint}>
          Export for a file copy on this device. Import accepts One More Swap backups or a World Cup
          2026 sticker tracker JSON export (collection + postal swaps).
        </p>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            onClick={() => {
              downloadJson('onemoreswap-collection.json', exportCollectionJson(loadCollection()))
              setMessage('Backup downloaded.')
            }}
          >
            Export backup
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'application/json'
              input.onchange = async () => {
                const file = input.files?.[0]
                if (!file) return
                try {
                  const result = importAnyBackup(await file.text())
                  saveCollection(result.store)
                  if (result.postal?.length) {
                    upsertPostalSwaps(result.postal, true)
                  }
                  const nextAlbum =
                    result.kind === 'wc-tracker' ? 'wc2026' : albumId || 'wc2026'
                  enableAlbum(nextAlbum)
                  // Enable any albums present in OMS backup
                  if (result.kind === 'onemoreswap') {
                    Object.keys(result.store.albums).forEach((id) => enableAlbum(id))
                  }
                  setAlbumId(nextAlbum)
                  setState(getAlbumState(loadCollection(), nextAlbum))
                  setMessage(
                    result.postal?.length
                      ? `${result.message} Open Postal swaps to review them.`
                      : result.message,
                  )
                } catch {
                  setMessage('Invalid backup file.')
                }
              }
              input.click()
            }}
          >
            Import backup
          </Button>
          <Button variant="ghost" onClick={clearAlbum}>
            Clear album
          </Button>
        </div>
      </details>
        </>
      )}
    </main>
  )
}
