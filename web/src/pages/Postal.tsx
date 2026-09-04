import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CirclePlusIcon, MailOpenIcon, UserRoundIcon } from '../components/icons'
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
import type { PostalExpectedLine, PostalSwap } from '../lib/postalTypes'
import {
  analyzeExpectedWarnings,
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
  analyzePostalInbox,
  applyPostalInboxMatches,
  type InboxPreview,
} from '../lib/postalInbox'
import {
  bumpCopies,
  copiesOf,
  getAlbumState,
  loadCollection,
  saveCollection,
  setAlbumState,
} from '../lib/storage'
import type { AlbumIndexes } from '../lib/types'
import styles from './Page.module.css'
import postalStyles from './Postal.module.css'

const DEFAULT_ALBUM = 'wc2026'

type PostalTab = 'inbox' | 'new' | string

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

function linesToPaste(
  lines: Array<{ seq: number; qty: number }>,
  indexes: AlbumIndexes | undefined,
): string {
  if (!indexes) return ''
  return lines
    .map((l) => {
      const info = indexes.seqToInfo.get(l.seq)
      return info ? `${info.code}${info.cardNum}${l.qty > 1 ? ` X${l.qty}` : ''}` : String(l.seq)
    })
    .join(' ')
}

function daysWaiting(swap: PostalSwap): number | null {
  const raw = swap.postedDate || swap.createdAt?.slice(0, 10)
  if (!raw) return null
  const t = Date.parse(raw)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

function shortName(name: string): string {
  const t = name.trim()
  if (!t) return 'Swap'
  return t.length > 12 ? `${t.slice(0, 11)}…` : t
}

export function Postal() {
  const [albumId, setAlbumId] = useState(() => loadEnabledAlbums()[0] || '')
  const [swaps, setSwaps] = useState(() => loadPostal().swaps)
  const [tab, setTab] = useState<PostalTab>('inbox')
  const [draft, setDraft] = useState<PostalSwap | null>(null)
  const [sentText, setSentText] = useState('')
  const [expectedText, setExpectedText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'completed' | 'all'>('open')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmOwned, setConfirmOwned] = useState(false)
  const [confirmInbox, setConfirmInbox] = useState(false)
  const [ownedWarningBody, setOwnedWarningBody] = useState('')
  const [inboxRaw, setInboxRaw] = useState('')
  const [inboxPreview, setInboxPreview] = useState<InboxPreview | null>(null)

  const indexes = getAlbumIndexes(albumId)
  const album = getAlbum(albumId)
  const allSeqs = indexes?.catalogue.stickers.map((s) => s.seq) ?? []

  const albumSwaps = useMemo(
    () => swaps.filter((s) => s.albumId === albumId),
    [swaps, albumId],
  )
  const hasCompleted = albumSwaps.some((s) => s.status === 'completed')

  const visible = useMemo(() => {
    const list = albumSwaps.filter((s) => {
      if (filter === 'open') return s.status === 'open'
      if (filter === 'completed') return s.status === 'completed'
      return true
    })
    if (filter === 'open') {
      return [...list].sort(
        (a, b) =>
          String(a.postedDate || '').localeCompare(String(b.postedDate || '')) ||
          String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
      )
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [albumSwaps, filter])

  useEffect(() => {
    if (filter === 'completed' && !hasCompleted) setFilter('open')
  }, [filter, hasCompleted])

  const refresh = () => {
    setSwaps(loadPostal().swaps)
  }

  const loadSwapIntoDraft = (swap: PostalSwap) => {
    setDraft({ ...swap })
    setSentText(linesToPaste(swap.sent, indexes))
    setExpectedText(
      linesToPaste(
        swap.expected.filter((l) => l.status === 'pending'),
        indexes,
      ),
    )
    setMessage(null)
  }

  const selectTab = (next: PostalTab) => {
    setTab(next)
    setMessage(null)
    if (next === 'inbox') {
      setDraft(null)
      return
    }
    if (next === 'new') {
      setDraft(emptyDraft(albumId))
      setSentText('')
      setExpectedText('')
      return
    }
    const swap = loadPostal().swaps.find((s) => s.id === next)
    if (swap) loadSwapIntoDraft(swap)
  }

  useEffect(() => {
    setInboxPreview(null)
    setInboxRaw('')

    if (tab === 'inbox') {
      setDraft(null)
      return
    }
    if (tab === 'new') {
      setDraft((d) => (d ? { ...d, albumId } : emptyDraft(albumId)))
      return
    }

    const albumList = loadPostal().swaps.filter((s) => s.albumId === albumId)
    const filtered = albumList.filter((s) => {
      if (filter === 'open') return s.status === 'open'
      if (filter === 'completed') return s.status === 'completed'
      return true
    })
    const current = filtered.find((s) => s.id === tab)
    if (current) {
      loadSwapIntoDraft(current)
      return
    }
    if (filtered[0]) {
      setTab(filtered[0].id)
      loadSwapIntoDraft(filtered[0])
    } else {
      setTab('inbox')
      setDraft(null)
    }
    // Re-sync when album or filter changes; tab is read intentionally from latest render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, filter])

  const persistDraft = (allowOwned: boolean) => {
    if (!draft || !indexes) return
    if (!draft.person.trim()) {
      setMessage('Add a name or nickname.')
      return
    }
    const sentParsed = parseStickerInput(sentText, indexes)
    const expParsed = parseStickerInput(expectedText, indexes)
    const settled = draft.expected.filter((l) => l.status !== 'pending')

    const warnings = analyzeExpectedWarnings(albumId, expParsed.counts, draft.id)
    if (warnings.alreadyPending.length) {
      setMessage(
        `Can't save — already expected in another open swap:\n• ${warnings.alreadyPending.join('\n• ')}\n\nRemove them here, or mark the other swap received / written off first.`,
      )
      return
    }
    if (warnings.alreadyHave.length && !allowOwned) {
      setOwnedWarningBody(
        `You already have these in your album:\n• ${warnings.alreadyHave.join('\n• ')}\n\nContinue anyway? (e.g. pack find while mail is still coming)`,
      )
      setConfirmOwned(true)
      return
    }

    const newPending: PostalExpectedLine[] = [...expParsed.counts.entries()].map(([seq, qty]) => ({
      seq,
      qty,
      status: 'pending',
    }))

    const previous = loadPostal().swaps.find((s) => s.id === draft.id)
    const next: PostalSwap = {
      ...draft,
      albumId,
      person: draft.person.trim(),
      sent: [...sentParsed.counts.entries()].map(([seq, qty]) => ({ seq, qty })),
      expected: [...settled, ...newPending],
    }

    const deltas = sentDelta(previous?.sent || [], next.sent)
    const store = loadCollection()
    let albumState = getAlbumState(store, albumId)

    const shortfalls = analyzeSentShortfalls(albumState, deltas, albumId)
    if (shortfalls.length) {
      setMessage(`Can't send — not enough spares:\n${shortfalls.join('\n')}`)
      return
    }

    if ([...deltas.values()].some((d) => d > 0)) {
      albumState = applySentDeltas(albumState, deltas, allSeqs)
    }

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
    setTab(next.id)
    setExpectedText(linesToPaste(newPending, indexes))
    setConfirmOwned(false)
    setMessage(
      unknown.length
        ? `Saved. Could not parse: ${unknown.slice(0, 6).join(', ')}`
        : 'Saved',
    )
  }

  const saveDraft = () => persistDraft(false)

  const markReceived = (swap: PostalSwap, seq: number) => {
    const line = swap.expected.find((l) => l.seq === seq)
    const next = setExpectedStatus(swap, seq, 'received')
    saveSwap(next)
    if (line) {
      const store = loadCollection()
      const current = getAlbumState(store, albumId)
      const alreadyOwned = copiesOf(current, seq) >= 1
      saveCollection(
        setAlbumState(store, albumId, bumpCopies(current, seq, line.qty, allSeqs)),
      )
      refresh()
      if (draft?.id === swap.id) {
        setDraft(next)
        setExpectedText(
          linesToPaste(
            next.expected.filter((l) => l.status === 'pending'),
            indexes,
          ),
        )
      }
      setMessage(
        alreadyOwned
          ? 'Marked received — added as a spare (you already had a copy).'
          : 'Marked received and added to your collection.',
      )
      return
    }
    refresh()
    if (draft?.id === swap.id) setDraft(next)
    setMessage('Marked received.')
  }

  const markWrittenOff = (swap: PostalSwap, seq: number) => {
    const next = setExpectedStatus(swap, seq, 'written_off')
    saveSwap(next)
    const store = loadCollection()
    const current = getAlbumState(store, albumId)
    const owned = copiesOf(current, seq) >= 1
    saveCollection(setAlbumState(store, albumId, writeOffExpected(current, seq)))
    refresh()
    if (draft?.id === swap.id) {
      setDraft(next)
      setExpectedText(
        linesToPaste(
          next.expected.filter((l) => l.status === 'pending'),
          indexes,
        ),
      )
    }
    setMessage(
      owned
        ? 'Written off — kept your album copy; pending mail cleared.'
        : 'Written off — sticker back on your need list.',
    )
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
    const remaining = loadPostal().swaps.filter(
      (s) =>
        s.albumId === albumId &&
        s.id !== draft.id &&
        (filter === 'all' || s.status === filter),
    )
    if (remaining[0]) {
      setTab(remaining[0].id)
      loadSwapIntoDraft(remaining[0])
    } else {
      setTab('inbox')
      setDraft(null)
    }
    setMessage(parts.length ? 'Swap deleted — collection changes reverted.' : 'Swap deleted.')
  }

  const previewInbox = () => {
    if (!inboxRaw.trim()) {
      setMessage('Paste the stickers that arrived first.')
      setInboxPreview(null)
      return
    }
    setInboxPreview(analyzePostalInbox(inboxRaw, albumId))
    setMessage(null)
  }

  const applyInbox = () => {
    if (!inboxPreview?.matched.length) return
    setConfirmInbox(false)
    const { appliedN, completedNames } = applyPostalInboxMatches(albumId, inboxPreview.matched)
    const nextPreview = {
      ...analyzePostalInbox(inboxRaw, albumId),
      applied: true,
      appliedN,
      completedNames,
      matched: inboxPreview.matched,
    }
    setInboxPreview(nextPreview)
    refresh()
    if (!appliedN) {
      setMessage('None of those stickers were still pending on an open swap.')
      return
    }
    setMessage(
      `Marked ${appliedN} received` +
        (completedNames.length
          ? ` · completed: ${completedNames.join(', ')}`
          : '. Swaps with leftover stickers stay open.'),
    )
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

  const settledExpected = draft?.expected.filter((l) => l.status !== 'pending') ?? []
  const pendingExpected = draft?.expected.filter((l) => l.status === 'pending') ?? []
  const editingExisting = Boolean(draft && tab !== 'new' && tab !== 'inbox')

  return (
    <main className={styles.page} id="main-content">
      <Badge>Local · cloud backup when signed in</Badge>
      <h1 className={styles.title}>Postal swaps</h1>
      <p className={styles.lead}>
        Keep a record of what you posted and what you&apos;re waiting for. Import from the World Cup
        tracker via Collection → Backup, or start a new swap here.
      </p>

      <AlbumPicker
        value={albumId}
        onChange={(id) => {
          setAlbumId(id)
          if (draft && (tab === 'new' || draft.id === tab)) {
            setDraft({ ...draft, albumId: id })
          }
        }}
      />

      <div className={postalStyles.filterRow} role="group" aria-label="Show swaps">
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

      <div className={postalStyles.toolTabs} role="tablist" aria-label="Postal tools">
        <button
          type="button"
          role="tab"
          id="postal-tab-inbox"
          aria-selected={tab === 'inbox'}
          aria-controls="postal-panel"
          tabIndex={tab === 'inbox' ? 0 : -1}
          className={[
            postalStyles.toolTab,
            tab === 'inbox' ? postalStyles.toolTabActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => selectTab('inbox')}
        >
          <MailOpenIcon size={18} />
          <span>Sort post</span>
        </button>
        <button
          type="button"
          role="tab"
          id="postal-tab-new"
          aria-selected={tab === 'new'}
          aria-controls="postal-panel"
          tabIndex={tab === 'new' ? 0 : -1}
          className={[postalStyles.toolTab, tab === 'new' ? postalStyles.toolTabActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => selectTab('new')}
        >
          <CirclePlusIcon size={18} />
          <span>New</span>
        </button>
        {visible.map((swap) => {
          const prog = swapProgress(swap)
          const days = daysWaiting(swap)
          return (
            <button
              key={swap.id}
              type="button"
              role="tab"
              id={`postal-tab-${swap.id}`}
              aria-selected={tab === swap.id}
              aria-controls="postal-panel"
              tabIndex={tab === swap.id ? 0 : -1}
              title={[
                swap.person,
                swap.status,
                prog.total ? `${prog.done}/${prog.total} received` : null,
                days !== null ? `${days}d waiting` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              className={[
                postalStyles.toolTab,
                postalStyles.swapTab,
                tab === swap.id ? postalStyles.toolTabActive : '',
                swap.status === 'completed' ? postalStyles.swapDone : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => selectTab(swap.id)}
            >
              <UserRoundIcon size={18} />
              <span>{shortName(swap.person || 'Swap')}</span>
            </button>
          )
        })}
      </div>

      <div
        className={postalStyles.toolPanel}
        role="tabpanel"
        id="postal-panel"
        aria-labelledby={
          tab === 'inbox'
            ? 'postal-tab-inbox'
            : tab === 'new'
              ? 'postal-tab-new'
              : `postal-tab-${tab}`
        }
      >
        {tab === 'inbox' && (
          <>
            <p className={postalStyles.panelLead}>
              Paste everything that arrived. We match it to open expected lines (oldest swaps first),
              then you confirm before anything is marked received.
            </p>
            <Textarea
              label="Stickers that arrived"
              hint="Same formats as Quick add — e.g. CIV: 11, MEX 1 2, ENG5"
              value={inboxRaw}
              onChange={(e) => setInboxRaw(e.target.value)}
              rows={5}
            />
            <div className={styles.actions}>
              <Button type="button" onClick={previewInbox}>
                Preview matches
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!inboxPreview?.matched.length || inboxPreview.applied}
                onClick={() => setConfirmInbox(true)}
              >
                Mark matched as received
              </Button>
            </div>

            {message && (
              <p
                className={[styles.notice, styles.noticeOk].join(' ')}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {message}
              </p>
            )}

            {inboxPreview && (
              <div className={postalStyles.inboxReport}>
                <h2 className={styles.panelTitle}>Report</h2>
                {inboxPreview.applied && (
                  <p className={postalStyles.reportOk}>
                    Applied: marked {inboxPreview.appliedN} as received
                    {inboxPreview.completedNames.length
                      ? `. Completed: ${inboxPreview.completedNames.join(', ')}`
                      : '.'}
                  </p>
                )}
                <InboxBucket
                  title={`Matched to swaps (${inboxPreview.matched.length})`}
                  tone="ok"
                  empty="None of this list is still expected on an open swap."
                  items={inboxPreview.matched.map((m) => `${m.label} → ${m.person}`)}
                />
                <InboxBucket
                  title={`Still missing from those swaps (${inboxPreview.stillMissing.length})`}
                  tone="warn"
                  items={inboxPreview.stillMissing.map((x) => `${x.label} — ${x.person}`)}
                />
                <InboxBucket
                  title={`Not expected on any open swap (${inboxPreview.unexpected.length})`}
                  tone="bad"
                  items={inboxPreview.unexpected.map(
                    (x) => `${x.label}${x.qty > 1 ? ` ×${x.qty}` : ''}`,
                  )}
                />
                <InboxBucket
                  title={`Extra copies beyond what was expected (${inboxPreview.extras.length})`}
                  tone="warn"
                  items={inboxPreview.extras.map(
                    (x) => `${x.label}${x.qty > 1 ? ` ×${x.qty}` : ''}`,
                  )}
                />
                <InboxBucket
                  title="Double-booked (same sticker expected from more than one person)"
                  tone="warn"
                  items={inboxPreview.doubleBooked.map(
                    (x) => `${x.label} — ${x.people.join(' & ')}`,
                  )}
                />
                <InboxBucket title="Could not parse" tone="bad" items={inboxPreview.unknown} />
              </div>
            )}

            {!albumSwaps.length && (
              <p className={postalStyles.emptyHint}>
                No swaps for this album yet — use <strong>New</strong>, or import a World Cup tracker
                backup under <Link to="/">Collection → Backup</Link>.
              </p>
            )}
          </>
        )}

        {(tab === 'new' || editingExisting) && draft && (
          <>
            <p className={postalStyles.panelLead}>
              {tab === 'new'
                ? 'Create a swap — name the person, then list what you sent and what you still expect.'
                : `Track what you posted and what you’re waiting for from ${draft.person || 'this person'}.`}{' '}
              You can only send spare copies — each sent sticker drops one (+2 → +1 → ✓).
            </p>

            {!visible.length && tab === 'new' && (
              <p className={postalStyles.emptyHint}>
                Tip: if you used the{' '}
                <a href="https://wc2026-sticker-tracker.pages.dev" target="_blank" rel="noreferrer">
                  World Cup sticker tracker
                </a>
                , export a backup there and import it under{' '}
                <Link to="/">My collection → Backup</Link>.
              </p>
            )}

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
                label="You still expect (pending)"
                hint="Received / written-off lines are kept below and not edited here"
                value={expectedText}
                onChange={(e) => setExpectedText(e.target.value)}
              />
            </div>
            {settledExpected.length > 0 && (
              <p className={postalStyles.settledHint}>
                Settled on this swap:{' '}
                {settledExpected
                  .map((l) => {
                    const info = indexes?.seqToInfo.get(l.seq)
                    const name = info ? `${info.code}${info.cardNum}` : `#${l.seq}`
                    return `${name} (${l.status})`
                  })
                  .join(', ')}
              </p>
            )}
            <div className={styles.actions}>
              <Button onClick={saveDraft}>Save swap</Button>
              {editingExisting && (
                <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )}
            </div>

            {message && (
              <p
                className={[
                  styles.notice,
                  message.startsWith("Can't") || message.startsWith('Add a name')
                    ? styles.noticeError
                    : styles.noticeOk,
                ].join(' ')}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {message}
              </p>
            )}

            {draft.expected.length > 0 && (
              <section style={{ marginTop: 'var(--space-lg)' }}>
                <h2 className={styles.panelTitle}>Incoming checklist</h2>
                <ul className={postalStyles.checkList}>
                  {draft.expected.map((line) => {
                    const info = indexes?.seqToInfo.get(line.seq)
                    return (
                      <li key={`${line.seq}-${line.status}`} className={postalStyles.checkItem}>
                        <span>
                          {info ? stickerDisplayLabel(info) : `#${line.seq}`}
                          {line.qty > 1 ? ` ×${line.qty}` : ''}
                        </span>
                        <span className={postalStyles.status}>{line.status}</span>
                        {line.status === 'pending' && (
                          <span className={postalStyles.checkActions}>
                            <Button
                              variant="secondary"
                              onClick={() => markReceived(draft, line.seq)}
                            >
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
              <section>
                <h2 className={styles.panelTitle}>Sent ({draft.sent.length})</h2>
                <StickerList
                  albumId={albumId}
                  items={draft.sent}
                  emptyMessage="Nothing sent yet."
                  accent={album?.accent}
                />
              </section>
              <section>
                <h2 className={styles.panelTitle}>Pending expected ({pendingExpected.length})</h2>
                <StickerList
                  albumId={albumId}
                  items={pendingExpected}
                  emptyMessage="Nothing pending."
                  accent={album?.accent}
                />
              </section>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmInbox}
        title={`Mark ${inboxPreview?.matched.length || 0} sticker(s) received?`}
        body={
          inboxPreview?.matched
            .slice(0, 20)
            .map((m) => `${m.label} → ${m.person}`)
            .join('\n') +
          ((inboxPreview?.matched.length || 0) > 20
            ? `\n… +${(inboxPreview?.matched.length || 0) - 20} more`
            : '')
        }
        confirmLabel="Mark received"
        cancelLabel="Cancel"
        onConfirm={applyInbox}
        onCancel={() => setConfirmInbox(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete swap with “${draft?.person || 'this person'}”?`}
        body={deleteConfirmBody}
        confirmLabel="Delete swap"
        cancelLabel="Cancel"
        danger
        onConfirm={deleteDraft}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={confirmOwned}
        title="Already in your album"
        body={ownedWarningBody}
        confirmLabel="Continue anyway"
        cancelLabel="Cancel"
        onConfirm={() => persistDraft(true)}
        onCancel={() => setConfirmOwned(false)}
      />
    </main>
  )
}

function InboxBucket({
  title,
  items,
  tone,
  empty,
}: {
  title: string
  items: string[]
  tone: 'ok' | 'warn' | 'bad'
  empty?: string
}) {
  if (!items.length && !empty) return null
  return (
    <div className={postalStyles.inboxBucket}>
      <h3 className={postalStyles[tone]}>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((t) => (
            <li key={t} className={postalStyles[tone]}>
              {t}
            </li>
          ))}
        </ul>
      ) : (
        empty && <p className={postalStyles.inboxEmpty}>{empty}</p>
      )}
    </div>
  )
}
