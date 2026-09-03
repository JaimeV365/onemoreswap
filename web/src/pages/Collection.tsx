import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumBrowse } from '../components/AlbumBrowse'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { CloudSyncBanner } from '../components/CloudSyncBanner'
import { CloudSyncPanel } from '../components/CloudSyncPanel'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { OnboardingBanner } from '../components/Onboarding'
import { ProgressBar } from '../components/ProgressBar'
import { SharePanel } from '../components/SharePanel'
import { Textarea } from '../components/Textarea'
import { getAlbum, getAlbumIndexes } from '../lib/catalogue'
import { enableAlbum, loadEnabledAlbums } from '../lib/enabledAlbums'
import { importAnyBackup } from '../lib/importBackup'
import { parseStickerInput } from '../lib/parseStickers'
import {
  pendingIncomingMap,
  saveSwap,
  setExpectedStatus,
  upsertPostalSwaps,
} from '../lib/postal'
import { pendingHitsFor } from '../lib/postalCollection'
import {
  addParsedCounts,
  albumProgress,
  bumpCopies,
  copiesOf,
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
  const [syncEpoch, setSyncEpoch] = useState(0)
  const [confirmFresh, setConfirmFresh] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const album = getAlbum(albumId)
  const indexes = getAlbumIndexes(albumId)

  const persist = useCallback(
    (next: CollectionAlbumState) => {
      setState(next)
      const store = loadCollection()
      saveCollection(setAlbumState(store, albumId, next))
      setSyncEpoch((n) => n + 1)
    },
    [albumId],
  )

  const reloadFromStorage = useCallback(() => {
    if (!albumId) {
      setState(emptyAlbumState())
      return
    }
    setState(getAlbumState(loadCollection(), albumId))
    setSyncEpoch((n) => n + 1)
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

  const doMarkAllMissing = () => {
    if (!indexes) return
    setConfirmFresh(false)
    persist({
      missing: indexes.catalogue.stickers.map((s) => s.seq),
      counts: {},
    })
    setMessage('Full album marked as missing — add stickers as you get them.')
  }

  const doClearAlbum = () => {
    setConfirmClear(false)
    persist(emptyAlbumState())
    setMessage('Album cleared.')
  }

  const markArrived = (seq: number) => {
    if (!albumId) return
    const hits = pendingHitsFor(albumId, seq)
    if (!hits.length) {
      setMessage('Not expected in an open postal swap.')
      return
    }
    const hit = hits[0]!
    const line = hit.line
    const next = setExpectedStatus(hit.swap, seq, 'received')
    saveSwap(next)
    const store = loadCollection()
    const current = getAlbumState(store, albumId)
    const alreadyOwned = copiesOf(current, seq) >= 1
    const allSeqs = indexes?.catalogue.stickers.map((s) => s.seq) ?? []
    persist(bumpCopies(current, seq, line.qty, allSeqs))
    const more = hits.length > 1
      ? ` Still expected from ${hits
          .slice(1)
          .map((h) => h.swap.person || 'another swap')
          .join(', ')}.`
      : ''
    setMessage(
      (alreadyOwned
        ? `Arrived from ${hit.swap.person || 'swap'} — added as a spare.`
        : `Arrived from ${hit.swap.person || 'swap'} — added to your album.`) + more,
    )
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

      <CloudSyncBanner refreshKey={syncEpoch} />

      <OnboardingBanner show={!isAlbumStarted(state)} />

      <AlbumPicker
        value={albumId}
        onChange={setAlbumId}
        onEnabledChange={() => setSyncEpoch((n) => n + 1)}
      />

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
              <Button variant="secondary" onClick={() => setConfirmFresh(true)}>
                Start fresh (all missing)
              </Button>
            </div>
          </section>

          {message && <p className={[styles.notice, styles.noticeOk].join(' ')}>{message}</p>}

          <SharePanel albumId={albumId} state={state} />

          <CloudSyncPanel
            refreshKey={syncEpoch}
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
                    className={[
                      collectionStyles.filterBtn,
                      filter === f ? collectionStyles.filterActive : '',
                    ].join(' ')}
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
              placeholder={
                albumId === 'pl2526'
                  ? 'Find sticker — Liverpool 5, LIV7, Salah…'
                  : 'Find sticker — Mexico 5, ENG7, Messi…'
              }
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
              onMarkArrived={markArrived}
            />
          </section>

          <details
            className={collectionStyles.advanced}
            open={showAdvanced}
            onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
          >
            <summary>Advanced — backup &amp; reset</summary>
            <p className={collectionStyles.advancedHint}>
              Export for a file copy on this device. Import accepts One More Swap backups or a World
              Cup 2026 sticker tracker JSON export (collection + postal swaps).
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
                      if (result.kind === 'onemoreswap') {
                        Object.keys(result.store.albums).forEach((id) => enableAlbum(id))
                      }
                      setAlbumId(nextAlbum)
                      setState(getAlbumState(loadCollection(), nextAlbum))
                      setSyncEpoch((n) => n + 1)
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
              <Button variant="ghost" onClick={() => setConfirmClear(true)}>
                Clear album
              </Button>
            </div>
          </details>
        </>
      )}

      <ConfirmDialog
        open={confirmFresh}
        title="Start fresh?"
        body={
          indexes
            ? `Mark all ${indexes.catalogue.total} stickers as missing? This replaces your current list for this album.`
            : 'Mark the full album as missing?'
        }
        confirmLabel="Start fresh"
        cancelLabel="Cancel"
        danger
        onConfirm={doMarkAllMissing}
        onCancel={() => setConfirmFresh(false)}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Clear this album?"
        body="Remove tracking for this album on this device. Cloud data is unchanged until you save."
        confirmLabel="Clear album"
        cancelLabel="Cancel"
        danger
        onConfirm={doClearAlbum}
        onCancel={() => setConfirmClear(false)}
      />
    </main>
  )
}
