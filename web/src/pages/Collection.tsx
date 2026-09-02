import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumBrowse } from '../components/AlbumBrowse'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { SharePanel } from '../components/SharePanel'
import { Textarea } from '../components/Textarea'
import { getAlbum, getAlbumIndexes } from '../lib/catalogue'
import { parseStickerInput } from '../lib/parseStickers'
import {
  addParsedCounts,
  albumProgress,
  downloadJson,
  emptyAlbumState,
  exportCollectionJson,
  getAlbumState,
  importCollectionJson,
  loadCollection,
  saveCollection,
  setAlbumState,
} from '../lib/storage'
import type { CollectionAlbumState } from '../lib/types'
import styles from './Page.module.css'
import collectionStyles from './Collection.module.css'

const DEFAULT_ALBUM = 'wc2026'

export function Collection() {
  const [albumId, setAlbumId] = useState(DEFAULT_ALBUM)
  const [state, setState] = useState<CollectionAlbumState>(() =>
    getAlbumState(loadCollection(), DEFAULT_ALBUM),
  )
  const [addInput, setAddInput] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'needs' | 'spares'>('all')
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

  useEffect(() => {
    setState(getAlbumState(loadCollection(), albumId))
    setAddInput('')
    setMessage(null)
  }, [albumId])

  const progress = albumProgress(
    state,
    album?.total ?? 0,
    indexes?.catalogue.stickers.map((s) => s.seq) ?? [],
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
        <Link to="/paste">match against someone else&apos;s list</Link>.
      </p>

      <AlbumPicker value={albumId} onChange={setAlbumId} />

      <ProgressBar
        pct={progress.pct}
        label={
          progress.started
            ? `${progress.inAlbum} of ${progress.total} in album · ${progress.missing} missing · ${progress.spareCopies} spare copies`
            : `Not started — use Quick add or "Start fresh" to begin tracking`
        }
      />

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Quick add</h2>
        <p className={collectionStyles.addHint}>
          Paste stickers you just got — e.g. <code>ENG 5 7 12</code>, <code>MEX1 MEX2</code>, or{' '}
          <code>570 571</code>. First copy goes in the album; extras become spares.
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

      <section className={collectionStyles.browseSection}>
        <div className={collectionStyles.browseToolbar}>
          <h2 className={styles.panelTitle}>Browse album</h2>
          <div className={collectionStyles.filters}>
            {(['all', 'needs', 'spares'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={[collectionStyles.filterBtn, filter === f ? collectionStyles.filterActive : ''].join(' ')}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'needs' ? 'Needs' : 'Spares'}
              </button>
            ))}
          </div>
        </div>
        <input
          type="search"
          className={collectionStyles.search}
          placeholder="Search team, code, or player…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <AlbumBrowse
          albumId={albumId}
          state={state}
          onChange={persist}
          filter={filter}
          search={search}
        />
      </section>

      <details
        className={collectionStyles.advanced}
        open={showAdvanced}
        onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
      >
        <summary>Advanced — backup &amp; reset</summary>
        <p className={collectionStyles.advancedHint}>
          Optional until sign-in arrives. Export if you want a file copy on your device.
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
                  saveCollection(importCollectionJson(await file.text()))
                  setState(getAlbumState(loadCollection(), albumId))
                  setMessage('Backup restored.')
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
    </main>
  )
}
