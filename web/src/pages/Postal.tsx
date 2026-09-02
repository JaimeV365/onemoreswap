import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { SourcePicker } from '../components/SourcePicker'
import { StickerList } from '../components/StickerList'
import { Textarea } from '../components/Textarea'
import { getAlbum, getAlbumIndexes, stickerDisplayLabel } from '../lib/catalogue'
import { parseStickerInput } from '../lib/parseStickers'
import {
  deleteSwap,
  loadPostal,
  newSwapId,
  saveSwap,
  sentDelta,
  setExpectedStatus,
  swapProgress,
} from '../lib/postal'
import type { PostalSwap } from '../lib/postalTypes'
import {
  applySentDeltas,
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
    albumId,
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
  const [albumId, setAlbumId] = useState(DEFAULT_ALBUM)
  const [swaps, setSwaps] = useState(() => loadPostal().swaps)
  const [view, setView] = useState<'list' | 'edit'>('list')
  const [draft, setDraft] = useState<PostalSwap | null>(null)
  const [sentText, setSentText] = useState('')
  const [expectedText, setExpectedText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all'>('open')

  const indexes = getAlbumIndexes(albumId)
  const album = getAlbum(albumId)
  const allSeqs = indexes?.catalogue.stickers.map((s) => s.seq) ?? []

  const visible = useMemo(() => {
    return swaps
      .filter((s) => s.albumId === albumId)
      .filter((s) => (filter === 'open' ? s.status === 'open' : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [swaps, albumId, filter])

  const refresh = () => setSwaps(loadPostal().swaps)

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

    // Update collection: sent stickers leave your spares
    const deltas = sentDelta(previous?.sent || [], next.sent)
    if (deltas.size) {
      const store = loadCollection()
      const current = getAlbumState(store, albumId)
      saveCollection(
        setAlbumState(store, albumId, applySentDeltas(current, deltas, allSeqs)),
      )
    }

    const unknown = [...sentParsed.unknown, ...expParsed.unknown]
    saveSwap(next)
    refresh()
    setDraft(next)
    setMessage(
      unknown.length
        ? `Saved. Could not parse: ${unknown.slice(0, 6).join(', ')}`
        : deltas.size
          ? 'Saved. Sent stickers removed from your spares; expected stickers show as Incoming in Collection.'
          : 'Postal swap saved. Expected stickers show as Incoming in Collection.',
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
    refresh()
    if (draft?.id === swap.id) setDraft(next)
  }

  if (view === 'edit' && draft) {
    return (
      <main className={styles.page}>
        <Button variant="ghost" onClick={() => setView('list')}>
          ← Back to swaps
        </Button>
        <h1 className={styles.title}>{draft.person || 'New postal swap'}</h1>
        <p className={styles.lead}>
          Track what you posted and what you&apos;re waiting for. Saving removes sent stickers from
          your spares; expected stickers appear as Incoming until received.
        </p>

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
              hint="Stickers you posted — deducted from your spares on save"
              value={sentText}
              onChange={(e) => setSentText(e.target.value)}
            />
            <Textarea
              label="You expect"
              hint="Stickers coming to you — show as Incoming until marked received"
              value={expectedText}
              onChange={(e) => setExpectedText(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <Button onClick={saveDraft}>Save swap</Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm('Delete this postal swap?')) {
                  deleteSwap(draft.id)
                  refresh()
                  setView('list')
                }
              }}
            >
              Delete
            </Button>
          </div>
        </section>

        {message && <p className={[styles.notice, styles.noticeOk].join(' ')}>{message}</p>}

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
          <p>No postal swaps for this album yet.</p>
          <p>
            Tip: if you used the{' '}
            <a href="https://wc2026-sticker-tracker.pages.dev" target="_blank" rel="noreferrer">
              World Cup sticker tracker
            </a>
            , export a backup there and import it under{' '}
            <Link to="/collection">My collection → Advanced</Link>.
          </p>
          <Button onClick={openNew}>Create first swap</Button>
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
