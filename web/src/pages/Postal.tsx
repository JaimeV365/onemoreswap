import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { CloudSyncBanner } from '../components/CloudSyncBanner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SourcePicker } from '../components/SourcePicker'
import { StickerList } from '../components/StickerList'
import { Textarea } from '../components/Textarea'
import { getAlbum, getAlbumIndexes, stickerDisplayLabel } from '../lib/catalogue'
import { loadEnabledAlbums } from '../lib/enabledAlbums'
import { parseStickerInput } from '../lib/parseStickers'
import {
  deleteSwap,
  loadPostal,
  newSwapId,
  saveSwap,
  setExpectedStatus,
  swapProgress,
} from '../lib/postal'
import type { PostalSwap } from '../lib/postalTypes'
import {
  analyzeSentShortfalls,
  applySentDeltas,
  describePostalRevert,
  pendingMapFromSwap,
  revertPostalSwapEffects,
  sentDelta,
  syncPendingExpected,
  writeOffExpected,
} from '../lib/postalCollection'
import {
  bumpCopies,
  getAlbumState,
  loadCollection,
  saveCollection,
  setAlbumState,
} from '../lib/storage'
import styles from './Page.module.css'
import postalStyles from './Postal.module.css'

const DEFAULT_ALBUM = 'wc2026'

function emptyDraft(albumId: string): PostalSwap {
  return {
    id: newSwapId(),
    albumId: albumId || DEFAULT_ALBUM,
    status: 'open',
    person: '',
    source: 'WhatsApp',
    notes: '',
    postedDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    completedAt: null,
    sent: [],
    expected: [],
  }
}

export function Postal() {
  const [albumId, setAlbumId] = useState(() => loadEnabledAlbums()[0] || '')
  const [swaps, setSwaps] = useState(() => loadPostal().swaps)
  const [view, setView] = useState<'list' | 'edit'>('list')
  const [draft, setDraft] = useState<PostalSwap | null>(null)
  const [sentText, setSentText] = useState('')
  const [expectedText, setExpectedText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'completed' | 'all'>('open')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [syncEpoch, setSyncEpoch] = useState(0)

  const indexes = getAlbumIndexes(albumId)
  const album = getAlbum(albumId)
  const allSeqs = indexes?.catalogue.stickers.map((s) => s.seq) ?? []

  const albumSwaps = useMemo(
    () => swaps.filter((s) => s.albumId === albumId),
    [swaps, albumId],
  )
  const hasCompleted = albumSwaps.some((s) => s.status === 'completed')

  const visible = useMemo(() => {
    return albumSwaps
      .filter((s) => {
        if (filter === 'open') return s.status === 'open'
        if (filter === 'completed') return s.status === 'completed'
        return true
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [albumSwaps, filter])

  useEffect(() => {
    if (filter === 'completed' && !hasCompleted) setFilter('open')
  }, [filter, hasCompleted])

  const refresh = () => {
    setSwaps(loadPostal().swaps)
    setSyncEpoch((n) => n + 1)
  }

  const openNew = () => {
    setDraft(emptyDraft(albumId))
    setSentText('')
    setExpectedText('')
    setMessage(null)
    setView('edit')
  }

  const openEdit = (swap: PostalSwap) => {
    setDraft({ ...swap })
    setSentText(
      indexes
        ? swap.sent
            .map((l) => {
              const info = indexes.seqToInfo.get(l.seq)
              return info
                ? `${info.code}${info.cardNum}${l.qty > 1 ? ` X${l.qty}` : ''}`
                : String(l.seq)
            })
            .join(' ')
        : '',
    )
    setExpectedText(
      indexes
        ? swap.expected
            .map((l) => {
              const info = indexes.seqToInfo.get(l.seq)
              return info
                ? `${info.code}${info.cardNum}${l.qty > 1 ? ` X${l.qty}` : ''}`
                : String(l.seq)
            })
            .join(' ')
        : '',
    )
    setMessage(null)
    setView('edit')
  }

  const saveDraft = () => {
    if (!draft || !indexes) return
    if (!draft.person.trim()) {
      setMessage('Add a name or nickname.')
      return
    }
    const sentParsed = parseStickerInput(sentText, indexes)
    const expParsed = parseStickerInput(expectedText, indexes)
    const existingStatus = new Map(draft.expected.map((l) => [l.seq, l.status]))

    const previous = loadPostal().swaps.find((s) => s.id === draft.id)
    const next: PostalSwap = {
      ...draft,
      albumId,
      person: draft.person.trim(),
      sent: [...sentParsed.counts.entries()].map(([seq, qty]) => ({ seq, qty })),
      expected: [...expParsed.counts.entries()].map(([seq, qty]) => ({
        seq,
        qty,
        status: existingStatus.get(seq) || 'pending',
      })),
    }

    const deltas = sentDelta(previous?.sent || [], next.sent)
    const store = loadCollection()
    let albumState = getAlbumState(store, albumId)

    // WC26: only post spare copies — block if not enough
    const shortfalls = analyzeSentShortfalls(albumState, deltas, albumId)
    if (shortfalls.length) {
      setMessage(`Can't send — not enough spares:\n${shortfalls.join('\n')}`)
      return
    }

    // Deduct only newly added sent qty: +2 → +1 → ✓ (never below album copy without warning)
    if ([...deltas.values()].some((d) => d > 0)) {
      albumState = applySentDeltas(albumState, deltas, allSeqs)
    }

    // Expected pending: leave "needs", show as Incoming (same idea as WC26 missingSet toggle)
    albumState = syncPendingExpected(
      albumState,
      previous ? pendingMapFromSwap(previous) : new Map(),
      pendingMapFromSwap(next),
    )

    saveCollection(setAlbumState(store, albumId, albumState))

    const unknown = [...sentParsed.unknown, ...expParsed.unknown]
    saveSwap(next)
    refresh()
    setDraft(next)
    setMessage(
      unknown.length
        ? `Saved. Could not parse: ${unknown.slice(0, 6).join(', ')}`
        : 'Saved',
    )
  }

  const markReceived = (swap: PostalSwap, seq: number) => {
    const line = swap.expected.find((l) => l.seq === seq)
    const next = setExpectedStatus(swap, seq, 'received')
    saveSwap(next)
    if (line) {
      const store = loadCollection()
      const current = getAlbumState(store, albumId)
      saveCollection(
        setAlbumState(store, albumId, bumpCopies(current, seq, line.qty, allSeqs)),
      )
    }
    refresh()
    if (draft?.id === swap.id) setDraft(next)
    setMessage('Marked received and added to your collection.')
  }

  const markWrittenOff = (swap: PostalSwap, seq: number) => {
    const next = setExpectedStatus(swap, seq, 'written_off')
    saveSwap(next)
    const store = loadCollection()
    const current = getAlbumState(store, albumId)
    saveCollection(setAlbumState(store, albumId, writeOffExpected(current, seq)))
    refresh()
    if (draft?.id === swap.id) setDraft(next)
    setMessage('Written off — sticker back on your need list.')
  }

  const deleteDraft = () => {
    if (!draft) return
    setConfirmDelete(false)
    const parts = describePostalRevert(draft)
    const store = loadCollection()
    const current = getAlbumState(store, draft.albumId)
    saveCollection(
      setAlbumState(store, draft.albumId, revertPostalSwapEffects(current, draft, allSeqs)),
    )
    deleteSwap(draft.id)
    refresh()
    setView('list')
    setMessage(parts.length ? 'Swap deleted — collection changes reverted.' : 'Swap deleted.')
  }

  const deleteConfirmBody = draft
    ? (() => {
        const parts = describePostalRevert(draft)
        return (
          (parts.length
            ? `This reverts collection changes from this swap:\n• ${parts.join('\n• ')}\n\n`
            : 'No collection changes to revert.\n\n') + 'This cannot be undone.'
        )
      })()
    : ''

  if (view === 'edit' && draft) {
    return (
      <main className={styles.page}>
        <Button variant="ghost" onClick={() => setView('list')}>
          ← Back to swaps
        </Button>
        <h1 className={styles.title}>{draft.person || 'New postal swap'}</h1>
        <p className={styles.lead}>
          Track what you posted and what you&apos;re waiting for. You can only send spare copies — each
          sent sticker drops one (+2 → +1 → ✓), same as the World Cup tracker.
        </p>

        <CloudSyncBanner refreshKey={syncEpoch} />

        <AlbumPicker
          value={albumId}
          onChange={(id) => {
            setAlbumId(id)
            setDraft({ ...draft, albumId: id })
          }}
        />

        <section className={styles.panel}>
          <div className={postalStyles.formGrid}>
            <label className={postalStyles.field}>
              <span>Name / nickname</span>
              <input
                value={draft.person}
                onChange={(e) => setDraft({ ...draft, person: e.target.value })}
                placeholder="e.g. Alex from WhatsApp"
              />
            </label>
            <SourcePicker
              value={draft.source}
              onChange={(source) => setDraft({ ...draft, source })}
            />
            <label className={postalStyles.field}>
              <span>Posted date</span>
              <input
                type="date"
                value={draft.postedDate}
                onChange={(e) => setDraft({ ...draft, postedDate: e.target.value })}
              />
            </label>
          </div>
          <label className={postalStyles.field} style={{ marginTop: 'var(--space-md)' }}>
            <span>Notes</span>
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Optional"
            />
          </label>
          <div className={styles.twoCol} style={{ marginTop: 'var(--space-lg)' }}>
            <Textarea
              label="You sent"
              hint="Spares only — one copy each: +2 becomes +1, +1 becomes ✓"
              value={sentText}
              onChange={(e) => setSentText(e.target.value)}
            />
            <Textarea
              label="You expect"
              hint="Shows as Incoming until marked received"
              value={expectedText}
              onChange={(e) => setExpectedText(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <Button onClick={saveDraft}>Save swap</Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        </section>

        {message && (
          <p
            className={[
              styles.notice,
              message.startsWith("Can't send") ? styles.noticeError : styles.noticeOk,
            ].join(' ')}
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {message}
          </p>
        )}

        {draft.expected.length > 0 && (
          <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
            <h2 className={styles.panelTitle}>Incoming checklist</h2>
            <ul className={postalStyles.checkList}>
              {draft.expected.map((line) => {
                const info = indexes?.seqToInfo.get(line.seq)
                return (
                  <li key={line.seq} className={postalStyles.checkItem}>
                    <span>
                      {info ? stickerDisplayLabel(info) : `#${line.seq}`}
                      {line.qty > 1 ? ` ×${line.qty}` : ''}
                    </span>
                    <span className={postalStyles.status}>{line.status}</span>
                    {line.status === 'pending' && (
                      <span className={postalStyles.checkActions}>
                        <Button variant="secondary" onClick={() => markReceived(draft, line.seq)}>
                          Received
                        </Button>
                        <Button variant="ghost" onClick={() => markWrittenOff(draft, line.seq)}>
                          Write off
                        </Button>
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <div className={styles.twoCol} style={{ marginTop: 'var(--space-lg)' }}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Sent ({draft.sent.length})</h2>
            <StickerList
              albumId={albumId}
              items={draft.sent}
              emptyMessage="Nothing sent yet."
              accent={album?.accent}
            />
          </section>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Expected ({draft.expected.length})</h2>
            <StickerList
              albumId={albumId}
              items={draft.expected}
              emptyMessage="Nothing expected yet."
              accent={album?.accent}
            />
          </section>
        </div>

        <ConfirmDialog
          open={confirmDelete}
          title={`Delete swap with “${draft.person || 'this person'}”?`}
          body={deleteConfirmBody}
          confirmLabel="Delete swap"
          cancelLabel="Cancel"
          danger
          onConfirm={deleteDraft}
          onCancel={() => setConfirmDelete(false)}
        />
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Badge>Local · No account</Badge>
      <h1 className={styles.title}>Postal swaps</h1>
      <p className={styles.lead}>
        Keep a record of what you posted and what you&apos;re waiting for. Import from the World Cup
        tracker via Collection → Advanced, or start a new swap here.
      </p>

      <CloudSyncBanner refreshKey={syncEpoch} />

      <AlbumPicker value={albumId} onChange={setAlbumId} />

      <div className={postalStyles.toolbar}>
        <div className={postalStyles.filters}>
          <button
            type="button"
            className={[postalStyles.filterBtn, filter === 'open' ? postalStyles.filterActive : ''].join(
              ' ',
            )}
            onClick={() => setFilter('open')}
          >
            Open
          </button>
          {hasCompleted && (
            <button
              type="button"
              className={[
                postalStyles.filterBtn,
                filter === 'completed' ? postalStyles.filterActive : '',
              ].join(' ')}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
          )}
          <button
            type="button"
            className={[postalStyles.filterBtn, filter === 'all' ? postalStyles.filterActive : ''].join(
              ' ',
            )}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>
        <Button onClick={openNew}>New swap</Button>
      </div>

      {!visible.length && (
        <div className={postalStyles.empty}>
          {filter === 'completed' ? (
            <p>No completed swaps for this album.</p>
          ) : filter === 'open' && albumSwaps.length > 0 ? (
            <p>No open swaps — try All or Completed.</p>
          ) : (
            <>
              <p>No postal swaps for this album yet.</p>
              <p>
                Tip: if you used the{' '}
                <a href="https://wc2026-sticker-tracker.pages.dev" target="_blank" rel="noreferrer">
                  World Cup sticker tracker
                </a>
                , export a backup there and import it under{' '}
                <Link to="/">My collection → Advanced</Link>.
              </p>
              <Button onClick={openNew}>Create first swap</Button>
            </>
          )}
        </div>
      )}

      <ul className={postalStyles.list}>
        {visible.map((swap) => {
          const prog = swapProgress(swap)
          return (
            <li key={swap.id}>
              <button type="button" className={postalStyles.card} onClick={() => openEdit(swap)}>
                <div className={postalStyles.cardTop}>
                  <strong>{swap.person}</strong>
                  <span className={swap.status === 'open' ? postalStyles.open : postalStyles.done}>
                    {swap.status}
                  </span>
                </div>
                <div className={postalStyles.cardMeta}>
                  {swap.postedDate}
                  {swap.source ? ` · ${swap.source}` : ''}
                  {prog.total
                    ? ` · ${prog.done}/${prog.total} received`
                    : ' · no expected stickers'}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
