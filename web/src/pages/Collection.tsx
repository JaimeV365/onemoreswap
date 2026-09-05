import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlbumBrowse, type SectionSortBy, type SectionSortDir } from '../components/AlbumBrowse'
import { AlbumPicker } from '../components/AlbumPicker'
import { Button } from '../components/Button'
import { ConfirmDialog, ConfirmStatList } from '../components/ConfirmDialog'
import {
  BookOpenTextIcon,
  CirclePlusIcon,
  DatabaseIcon,
  RepeatIcon,
} from '../components/icons'
import { OnboardingBanner } from '../components/Onboarding'
import { ProgressBar } from '../components/ProgressBar'
import { SwapPanel, parseSwapHub, type SwapHub } from '../components/SwapPanel'
import { Textarea } from '../components/Textarea'
import { getAlbum, getAlbumIndexes } from '../lib/catalogue'
import { enableAlbum, loadEnabledAlbums } from '../lib/enabledAlbums'
import {
  importAnyBackup,
  importPreviewRows,
  summarizeImport,
  type ImportResult,
} from '../lib/importBackup'
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
  applyMissingList,
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
import { delayedBusyLabel, useDelayedBusy } from '../lib/useDelayedBusy'
import type { CollectionAlbumState } from '../lib/types'
import styles from './Page.module.css'
import collectionStyles from './Collection.module.css'

type QuickAddMode = 'have' | 'missing'
type CollectionTab = 'add' | 'swap' | 'album' | 'backup'

const collectionTabs: {
  id: CollectionTab
  label: string
  Icon: typeof CirclePlusIcon
}[] = [
  { id: 'album', label: 'Album', Icon: BookOpenTextIcon },
  { id: 'add', label: 'Add', Icon: CirclePlusIcon },
  { id: 'swap', label: 'Swap', Icon: RepeatIcon },
  { id: 'backup', label: 'Backup', Icon: DatabaseIcon },
]

function parseCollectionTab(raw: string | null, albumStarted: boolean): CollectionTab {
  if (raw === 'add' || raw === 'swap' || raw === 'album' || raw === 'backup') return raw
  if (raw === 'share') return 'swap'
  return albumStarted ? 'album' : 'add'
}

function initialAlbumId(): string {
  const enabled = loadEnabledAlbums()
  return enabled[0] || ''
}

export function Collection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [albumId, setAlbumId] = useState(initialAlbumId)
  const [state, setState] = useState(() =>
    albumId ? getAlbumState(loadCollection(), albumId) : emptyAlbumState(),
  )
  const [addInput, setAddInput] = useState('')
  const [addMode, setAddMode] = useState<QuickAddMode>('have')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'needs' | 'favorites' | 'spares' | 'incoming'>('all')
  const [sectionSortBy, setSectionSortBy] = useState<SectionSortBy>('album')
  const [sectionSortDir, setSectionSortDir] = useState<SectionSortDir>('asc')
  const [message, setMessage] = useState<string | null>(null)
  const albumStartedForTab = isAlbumStarted(
    albumId ? getAlbumState(loadCollection(), albumId) : emptyAlbumState(),
  )
  const tab = parseCollectionTab(searchParams.get('tab'), albumStartedForTab)
  const swapHub = parseSwapHub(searchParams.get('swap'))

  const setTab = (next: CollectionTab) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (next === 'album') n.delete('tab')
        else n.set('tab', next)
        if (next !== 'swap') n.delete('swap')
        else if (!n.get('swap')) n.set('swap', 'share')
        return n
      },
      { replace: true },
    )
  }

  const setSwapHub = (hub: SwapHub) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        n.set('tab', 'swap')
        n.set('swap', hub)
        return n
      },
      { replace: true },
    )
  }

  const [confirmFresh, setConfirmFresh] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmMissing, setConfirmMissing] = useState(false)
  const [pendingImport, setPendingImport] = useState<ImportResult | null>(null)
  const [alertModal, setAlertModal] = useState<{ title: string; body: string } | null>(null)
  const [backupBusy, setBackupBusy] = useState<'export' | 'import' | null>(null)
  const backupPhase = useDelayedBusy(backupBusy !== null)
  const backupBusyLabel = delayedBusyLabel(backupPhase, {
    show:
      backupBusy === 'export'
        ? 'Preparing backup…'
        : backupBusy === 'import'
          ? 'Reading backup…'
          : 'Working…',
    slow:
      backupBusy === 'export'
        ? 'Still preparing your backup — large collections can take a moment…'
        : backupBusy === 'import'
          ? 'Still importing — large backups can take a moment…'
          : 'Still working…',
  })

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
    if (!counts.size) {
      setMessage('No stickers recognised in that list.')
      return
    }
    if (addMode === 'missing') {
      if (isAlbumStarted(state)) {
        setConfirmMissing(true)
        return
      }
      applyMissingPaste(counts, unknown)
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

  const applyMissingPaste = (counts: Map<number, number>, unknown: string[]) => {
    if (!indexes) return
    const allSeqs = indexes.catalogue.stickers.map((s) => s.seq)
    const owned = allSeqs.length - counts.size
    persist(applyMissingList(allSeqs, counts.keys(), state))
    setAddInput('')
    setConfirmMissing(false)
    setMessage(
      unknown.length
        ? `Marked ${counts.size} as missing · ${owned} as owned. Unrecognised: ${unknown.slice(0, 6).join(', ')}`
        : `Marked ${counts.size} as missing · ${owned} as owned (everything else you have).`,
    )
  }

  const doApplyMissingFromInput = () => {
    if (!indexes || !addInput.trim()) {
      setConfirmMissing(false)
      return
    }
    const { counts, unknown } = parseStickerInput(addInput, indexes)
    if (!counts.size) {
      setConfirmMissing(false)
      setMessage(
        unknown.length
          ? `Could not parse: ${unknown.slice(0, 6).join(', ')}`
          : 'No stickers recognised in that list.',
      )
      return
    }
    applyMissingPaste(counts, unknown)
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

  const applyPendingImport = () => {
    if (!pendingImport) return
    const result = pendingImport
    setPendingImport(null)
    setBackupBusy('import')
    window.setTimeout(() => {
      try {
        saveCollection(result.store)
        if (result.postal?.length) {
          upsertPostalSwaps(result.postal, true)
        }
        const nextAlbum = result.kind === 'wc-tracker' ? 'wc2026' : albumId || 'wc2026'
        enableAlbum(nextAlbum)
        if (result.kind === 'onemoreswap') {
          Object.keys(result.store.albums).forEach((id) => enableAlbum(id))
        }
        setAlbumId(nextAlbum)
        setState(getAlbumState(loadCollection(), nextAlbum))
        const detail = result.postal?.length
          ? `${result.message} Open Postal swaps to review them.`
          : result.message
        setMessage(detail)
        setAlertModal({ title: 'Backup imported', body: detail })
      } finally {
        setBackupBusy(null)
      }
    }, 0)
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

  const albumStarted = isAlbumStarted(state)

  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>My collection</h1>
      <p className={styles.lead}>
        Track what you need and what you can swap. Click a sticker to add a copy; shift-click to
        remove. Use <strong>Swap</strong> to share, paste lists, or track the post.
      </p>

      <OnboardingBanner show={!albumStarted} />

      <AlbumPicker value={albumId} onChange={setAlbumId} />

      {!albumId ? (
        <p className={styles.lead}>
          Add World Cup 2026 or Premier League 2025/26 above to start tracking stickers for this
          profile.
        </p>
      ) : (
        <>
          <ProgressBar
            pct={progress.pct}
            label={
              progress.started
                ? `${progress.inAlbum} of ${progress.total} in album · ${progress.missing} missing${
                    progress.pending ? ` · ${progress.pending} incoming` : ''
                  } · ${progress.spareCopies} spare copies`
                : `Not started — Quick add what you have, or paste what’s missing`
            }
          />

          {message && (
            <p className={[styles.notice, styles.noticeOk].join(' ')} role="status">
              {message}
            </p>
          )}

          <div className={collectionStyles.toolTabs} role="tablist" aria-label="Collection tools">
            {collectionTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`collection-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`collection-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className={[
                  collectionStyles.toolTab,
                  tab === t.id ? collectionStyles.toolTabActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setTab(t.id)}
              >
                <t.Icon size={18} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div
            className={collectionStyles.toolPanel}
            role="tabpanel"
            id={`collection-panel-${tab}`}
            aria-labelledby={`collection-tab-${tab}`}
          >
            {tab === 'add' && (
              <>
                <div className={collectionStyles.modeTabs} role="tablist" aria-label="Quick add mode">
                  {(
                    [
                      { id: 'have' as const, label: 'I have these' },
                      { id: 'missing' as const, label: 'I’m missing these' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      role="tab"
                      aria-selected={addMode === mode.id}
                      className={[
                        collectionStyles.modeTab,
                        addMode === mode.id ? collectionStyles.modeTabActive : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setAddMode(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <p className={collectionStyles.addHint}>
                  {addMode === 'have' ? (
                    albumId === 'pl2526' ? (
                      <>
                        Paste stickers you just got — album numbers work best, e.g.{' '}
                        <code>319 335 336</code> or <code>LIV319 ARS18</code>. First copy goes in the
                        album; extras become spares.
                      </>
                    ) : (
                      <>
                        Paste stickers you just got — e.g. <code>ENG 5 7 12</code>, <code>MEX1 MEX2</code>, or{' '}
                        <code>570 571</code>. First copy goes in the album; extras become spares.
                      </>
                    )
                  ) : (
                    <>
                      Paste only what you still need — e.g.{' '}
                      {albumId === 'pl2526' ? (
                        <code>319, 335, 341</code>
                      ) : (
                        <code>MEX: 1, 2, 14</code>
                      )}
                      . Everything else in the album is treated as owned. Handy when you’re nearly complete.
                    </>
                  )}
                </p>
                <Textarea
                  label={addMode === 'have' ? 'Stickers to add' : 'Stickers still missing'}
                  value={addInput}
                  onChange={(e) => setAddInput(e.target.value)}
                  placeholder="Paste or type sticker codes…"
                  rows={3}
                />
                <div className={styles.actions}>
                  <Button onClick={handleQuickAdd}>
                    {addMode === 'have' ? 'Add to collection' : 'Apply missing list'}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmFresh(true)}>
                    Start fresh (all missing)
                  </Button>
                </div>
              </>
            )}

            {tab === 'swap' && albumId && (
              <SwapPanel albumId={albumId} state={state} hub={swapHub} onHubChange={setSwapHub} />
            )}

            {tab === 'album' && (
              <>
                <div className={collectionStyles.browseToolbar}>
                  <div
                    className={collectionStyles.filters}
                    role="group"
                    aria-label="Filter stickers"
                  >
                    {(['all', 'needs', 'favorites', 'spares', 'incoming'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={filter === f}
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
                            : f === 'favorites'
                              ? 'Want soon'
                              : f === 'spares'
                                ? 'Spares'
                                : 'Incoming'}
                      </button>
                    ))}
                  </div>
                  <div className={collectionStyles.sortControls}>
                    <label className={collectionStyles.sortLabel}>
                      <span>Sort by</span>
                      <select
                        className={collectionStyles.sortSelect}
                        value={sectionSortBy}
                        onChange={(e) => {
                          const next = e.target.value as SectionSortBy
                          setSectionSortBy(next)
                          // Sensible default direction when switching metric
                          if (next === 'album') setSectionSortDir('asc')
                          else if (next === 'progress') setSectionSortDir('asc')
                          else setSectionSortDir('desc')
                        }}
                      >
                        <option value="album">Album order</option>
                        <option value="progress">Progress</option>
                        <option value="favorites">Want soon</option>
                        <option value="incoming">Incoming</option>
                        <option value="spares">Spares</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className={collectionStyles.sortDirBtn}
                      disabled={sectionSortBy === 'album'}
                      aria-label={
                        sectionSortDir === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'
                      }
                      title={sectionSortDir === 'asc' ? 'Low → high' : 'High → low'}
                      onClick={() =>
                        setSectionSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                      }
                    >
                      {sectionSortDir === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
                <label className={collectionStyles.searchLabel} htmlFor="album-sticker-search">
                  Search stickers
                </label>
                <input
                  id="album-sticker-search"
                  type="search"
                  className={collectionStyles.search}
                  placeholder={
                    albumId === 'pl2526'
                      ? 'Find sticker — Salah, LIV335, 319…'
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
                  sortBy={sectionSortBy}
                  sortDir={sectionSortDir}
                  incoming={incoming}
                  onMarkArrived={markArrived}
                />
              </>
            )}

            {tab === 'backup' && (
              <>
                <p className={collectionStyles.advancedHint}>
                  Export a JSON file anytime — useful for moving device or an extra copy. When
                  you&apos;re signed in, collection changes also auto-save to the cloud, so a manual
                  backup is optional, not required.
                </p>
                <div className={styles.actions}>
                  <Button
                    variant="ghost"
                    disabled={backupBusy !== null}
                    onClick={() => {
                      setBackupBusy('export')
                      window.setTimeout(() => {
                        try {
                          downloadJson(
                            'onemoreswap-collection.json',
                            exportCollectionJson(loadCollection()),
                          )
                          setAlertModal({
                            title: 'Backup downloaded',
                            body: 'Keep the JSON file safe — you can import it later on this or another device.',
                          })
                        } finally {
                          setBackupBusy(null)
                        }
                      }, 0)
                    }}
                  >
                    Export backup
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={backupBusy !== null}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'application/json'
                      input.onchange = async () => {
                        const file = input.files?.[0]
                        if (!file) return
                        setBackupBusy('import')
                        try {
                          // Yield so the loading state can paint before heavy parse work
                          await new Promise<void>((r) => window.setTimeout(r, 0))
                          setPendingImport(importAnyBackup(await file.text()))
                        } catch {
                          setAlertModal({
                            title: 'Could not import backup',
                            body: 'That file is not a recognised One More Swap or World Cup tracker backup.',
                          })
                        } finally {
                          setBackupBusy(null)
                        }
                      }
                      input.click()
                    }}
                  >
                    Import backup
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={backupBusy !== null}
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear album
                  </Button>
                </div>
                {backupBusyLabel && (
                  <p className={collectionStyles.backupBusy} role="status" aria-live="polite">
                    {backupBusyLabel}
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pendingImport}
        title="Replace your current collection with this backup?"
        body={
          pendingImport ? (
            <>
              <p className={collectionStyles.confirmLead}>
                This overwrites collection data on this device
                {pendingImport.postal?.length ? ' and replaces postal swaps' : ''}.
              </p>
              <ConfirmStatList rows={importPreviewRows(summarizeImport(pendingImport))} />
            </>
          ) : null
        }
        confirmLabel="Import backup"
        cancelLabel="Cancel"
        danger
        onConfirm={applyPendingImport}
        onCancel={() => setPendingImport(null)}
      />
      <ConfirmDialog
        open={!!alertModal}
        title={alertModal?.title || ''}
        body={alertModal?.body || ''}
        alertOnly
        onConfirm={() => setAlertModal(null)}
        onCancel={() => setAlertModal(null)}
      />
      <ConfirmDialog
        open={confirmMissing}
        title="Apply this as your missing list?"
        body="Only the pasted stickers stay as needs. Every other sticker in the album is treated as owned. Existing spares are kept where you still own that sticker."
        confirmLabel="Apply missing list"
        cancelLabel="Cancel"
        danger
        onConfirm={doApplyMissingFromInput}
        onCancel={() => setConfirmMissing(false)}
      />
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
        body="Remove tracking for this album on this device. Cloud data is unchanged until the next auto-save."
        confirmLabel="Clear album"
        cancelLabel="Cancel"
        danger
        onConfirm={doClearAlbum}
        onCancel={() => setConfirmClear(false)}
      />
    </main>
  )
}
