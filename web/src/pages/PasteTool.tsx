import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { StickerList, stickerListAsText } from '../components/StickerList'
import { Textarea } from '../components/Textarea'
import { getAlbum, getAlbumIndexes } from '../lib/catalogue'
import { countsToSet, computeOverlap } from '../lib/overlap'
import { countsToText, parseStickerInput } from '../lib/parseStickers'
import {
  downloadJson,
  exportCollectionJson,
  getAlbumState,
  importCollectionJson,
  loadCollection,
  saveCollection,
  setAlbumState,
  sparesToMap,
} from '../lib/storage'
import styles from './Page.module.css'
import pasteStyles from './PasteTool.module.css'

const DEFAULT_ALBUM = 'wc2026'

export function PasteTool() {
  const [albumId, setAlbumId] = useState(DEFAULT_ALBUM)
  const [yourNeeds, setYourNeeds] = useState('')
  const [yourSpares, setYourSpares] = useState('')
  const [theirNeeds, setTheirNeeds] = useState('')
  const [theirSpares, setTheirSpares] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'warn' | 'error'; text: string } | null>(
    null,
  )

  const indexes = getAlbumIndexes(albumId)
  const album = getAlbum(albumId)

  const loadFromCollection = useCallback(() => {
    const store = loadCollection()
    const state = getAlbumState(store, albumId)
    if (!indexes) return
    const needsMap = new Map<number, number>()
    state.needs.forEach((seq) => needsMap.set(seq, 1))
    setYourNeeds(countsToText(needsMap, indexes))
    setYourSpares(countsToText(sparesToMap(state.spares), indexes))
    setMessage({ type: 'ok', text: 'Loaded your saved collection for this album.' })
  }, [albumId, indexes])

  useEffect(() => {
    loadFromCollection()
  }, [albumId]) // reload when album changes

  const parsed = useMemo(() => {
    if (!indexes) return null
    const yn = parseStickerInput(yourNeeds, indexes)
    const ys = parseStickerInput(yourSpares, indexes)
    const tn = parseStickerInput(theirNeeds, indexes)
    const ts = parseStickerInput(theirSpares, indexes)
    const overlap = computeOverlap(
      countsToSet(yn.counts),
      ys.counts,
      countsToSet(tn.counts),
      ts.counts,
    )
    const unknown = [...yn.unknown, ...ys.unknown, ...tn.unknown, ...ts.unknown]
    return { ...overlap, unknown }
  }, [indexes, yourNeeds, yourSpares, theirNeeds, theirSpares])

  const saveYourSide = () => {
    if (!indexes) return
    const store = loadCollection()
    const current = getAlbumState(store, albumId)
    const needsCounts = parseStickerInput(yourNeeds, indexes).counts
    const sparesCounts = parseStickerInput(yourSpares, indexes).counts
    const needs = [...new Set([...current.needs, ...needsCounts.keys()])].sort((a, b) => a - b)
    const spares = { ...current.spares }
    for (const [seq, qty] of sparesCounts) {
      spares[seq] = (spares[seq] ?? 0) + qty
    }
    saveCollection(setAlbumState(store, albumId, { needs, spares }))
    setMessage({ type: 'ok', text: 'Your needs and spares saved to this browser.' })
  }

  const handleExport = () => {
    downloadJson('onemoreswap-collection.json', exportCollectionJson(loadCollection()))
    setMessage({ type: 'ok', text: 'Collection backup downloaded.' })
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const store = importCollectionJson(text)
        saveCollection(store)
        loadFromCollection()
        setMessage({ type: 'ok', text: 'Collection restored from backup.' })
      } catch {
        setMessage({ type: 'error', text: 'Could not read that file — is it a One More Swap backup?' })
      }
    }
    input.click()
  }

  const copyOverlap = (side: 'you' | 'they') => {
    if (!parsed) return
    const items = side === 'you' ? parsed.youCanSend : parsed.theyCanSend
    const text = stickerListAsText(albumId, items)
    if (!text) {
      setMessage({ type: 'warn', text: 'Nothing to copy on that side yet.' })
      return
    }
    navigator.clipboard.writeText(text)
    setMessage({ type: 'ok', text: 'Copied to clipboard.' })
  }

  const mutualCount =
    parsed
      ? new Set(parsed.youCanSend.map((i) => i.seq)).size > 0 &&
        new Set(parsed.theyCanSend.map((i) => i.seq)).size > 0
      : false

  return (
    <main className={styles.page}>
      <Badge>Always free · No account</Badge>
      <h1 className={styles.title}>Paste &amp; match</h1>
      <p className={styles.lead}>
        Paste spares and needs in any common format — team codes, numbers, commas, or spaces.
        See overlaps instantly. Works for WhatsApp lists and forum posts.
      </p>

      <AlbumPicker value={albumId} onChange={setAlbumId} />

      <div className={pasteStyles.columns}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Your list</h2>
          <div className={styles.grid}>
            <Textarea
              label="Your needs (missing)"
              hint="e.g. ENG 5 7 12 or 570 571 572"
              value={yourNeeds}
              onChange={(e) => setYourNeeds(e.target.value)}
              placeholder="Stickers you still need…"
            />
            <Textarea
              label="Your spares (duplicates)"
              hint="Use X2 after a code for multiples — ENG5 X2"
              value={yourSpares}
              onChange={(e) => setYourSpares(e.target.value)}
              placeholder="Stickers you can swap away…"
            />
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={loadFromCollection}>Load saved collection</Button>
            <Button variant="secondary" onClick={saveYourSide}>Save to collection</Button>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Their list</h2>
          <div className={styles.grid}>
            <Textarea
              label="Their needs"
              value={theirNeeds}
              onChange={(e) => setTheirNeeds(e.target.value)}
              placeholder="Paste from message or post…"
            />
            <Textarea
              label="Their spares"
              value={theirSpares}
              onChange={(e) => setTheirSpares(e.target.value)}
              placeholder="Paste from message or post…"
            />
          </div>
        </section>
      </div>

      {parsed && parsed.unknown.length > 0 && (
        <p className={[styles.notice, styles.noticeWarn].join(' ')}>
          Could not parse: {parsed.unknown.slice(0, 12).join(', ')}
          {parsed.unknown.length > 12 ? ` (+${parsed.unknown.length - 12} more)` : ''}
        </p>
      )}

      {message && (
        <p
          className={[
            styles.notice,
            message.type === 'ok' ? styles.noticeOk : '',
            message.type === 'warn' ? styles.noticeWarn : '',
            message.type === 'error' ? styles.noticeError : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {message.text}
        </p>
      )}

      <div className={pasteStyles.results}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            You can send them ({parsed?.youCanSend.length ?? 0})
          </h2>
          <p className={pasteStyles.resultHint}>Your spares they still need</p>
          <StickerList
            albumId={albumId}
            items={parsed?.youCanSend ?? []}
            emptyMessage="No overlap yet — paste both sides or load your collection."
            accent={album?.accent}
          />
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => copyOverlap('you')}>Copy list</Button>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            They can send you ({parsed?.theyCanSend.length ?? 0})
          </h2>
          <p className={pasteStyles.resultHint}>Their spares you still need</p>
          <StickerList
            albumId={albumId}
            items={parsed?.theyCanSend ?? []}
            emptyMessage="No overlap yet — paste both sides or load your collection."
            accent={album?.accent}
          />
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => copyOverlap('they')}>Copy list</Button>
          </div>
        </section>
      </div>

      {mutualCount && (
        <p className={[styles.notice, styles.noticeOk].join(' ')}>
          Mutual swap potential — you both have stickers the other needs. Time to message them.
        </p>
      )}

      <div className={styles.actions} style={{ marginTop: 'var(--space-xl)' }}>
        <Button variant="ghost" onClick={handleExport}>Export backup</Button>
        <Button variant="ghost" onClick={handleImport}>Import backup</Button>
      </div>
    </main>
  )
}
