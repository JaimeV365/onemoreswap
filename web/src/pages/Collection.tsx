import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { StickerList } from '../components/StickerList'
import { Textarea } from '../components/Textarea'
import { getAlbum, getAlbumIndexes } from '../lib/catalogue'
import { countsToText, parseStickerInput } from '../lib/parseStickers'
import {
  downloadJson,
  exportCollectionJson,
  getAlbumState,
  importCollectionJson,
  loadCollection,
  mergeParsedIntoCollection,
  saveCollection,
  setAlbumState,
} from '../lib/storage'
import styles from './Page.module.css'

const DEFAULT_ALBUM = 'wc2026'

export function Collection() {
  const [albumId, setAlbumId] = useState(DEFAULT_ALBUM)
  const [needsText, setNeedsText] = useState('')
  const [sparesText, setSparesText] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const indexes = getAlbumIndexes(albumId)
  const album = getAlbum(albumId)

  const refreshDisplay = useCallback(() => {
    if (!indexes) return
    const state = getAlbumState(loadCollection(), albumId)
    const needsMap = new Map<number, number>()
    state.needs.forEach((seq) => needsMap.set(seq, 1))
    setNeedsText(countsToText(needsMap, indexes))
    setSparesText(countsToText(new Map(Object.entries(state.spares).map(([k, v]) => [Number(k), v])), indexes))
  }, [albumId, indexes])

  useEffect(() => {
    refreshDisplay()
  }, [refreshDisplay])

  const state = getAlbumState(loadCollection(), albumId)
  const needItems = state.needs.map((seq) => ({ seq, qty: 1 }))
  const spareItems = Object.entries(state.spares)
    .filter(([, qty]) => qty > 0)
    .map(([seq, qty]) => ({ seq: Number(seq), qty }))
    .sort((a, b) => a.seq - b.seq)

  const addFromPaste = () => {
    if (!indexes) return
    const needsParsed = parseStickerInput(needsText, indexes)
    const sparesParsed = parseStickerInput(sparesText, indexes)
    const store = loadCollection()
    const current = getAlbumState(store, albumId)
    const merged = mergeParsedIntoCollection(current, needsParsed.counts, sparesParsed.counts)
    saveCollection(setAlbumState(store, albumId, merged))
    refreshDisplay()
    const unknown = [...needsParsed.unknown, ...sparesParsed.unknown]
    setMessage(
      unknown.length
        ? `Saved. Could not parse: ${unknown.slice(0, 8).join(', ')}`
        : 'Collection updated in this browser.',
    )
  }

  const clearAlbum = () => {
    const store = loadCollection()
    saveCollection(setAlbumState(store, albumId, { needs: [], spares: {} }))
    refreshDisplay()
    setMessage('Cleared this album from local storage.')
  }

  const handleExport = () => {
    downloadJson('onemoreswap-collection.json', exportCollectionJson(loadCollection()))
    setMessage('Backup downloaded.')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        saveCollection(importCollectionJson(await file.text()))
        refreshDisplay()
        setMessage('Backup restored.')
      } catch {
        setMessage('Invalid backup file.')
      }
    }
    input.click()
  }

  return (
    <main className={styles.page}>
      <Badge>Saved in your browser</Badge>
      <h1 className={styles.title}>My collection</h1>
      <p className={styles.lead}>
        Track needs and spares for each album. Data stays on this device until you sign in (coming
        soon) or export a backup. Use the{' '}
        <Link to="/paste">paste tool</Link> to compare with someone else&apos;s list.
      </p>

      <AlbumPicker value={albumId} onChange={setAlbumId} />

      <div className={styles.stats}>
        <div className={styles.stat}>
          <strong>{state.needs.length}</strong>
          needs
        </div>
        <div className={styles.stat}>
          <strong>{spareItems.length}</strong>
          spare types
        </div>
        <div className={styles.stat}>
          <strong>{spareItems.reduce((n, i) => n + i.qty, 0)}</strong>
          spare copies
        </div>
      </div>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Add or edit via paste</h2>
        <div className={styles.twoCol}>
          <Textarea
            label="Needs (missing)"
            value={needsText}
            onChange={(e) => setNeedsText(e.target.value)}
            placeholder="MEX 1 2 3, ENG 7, or sticker numbers…"
          />
          <Textarea
            label="Spares (duplicates)"
            value={sparesText}
            onChange={(e) => setSparesText(e.target.value)}
            placeholder="ARG 5 X2, 120 121…"
          />
        </div>
        <div className={styles.actions}>
          <Button onClick={addFromPaste}>Save to collection</Button>
          <Button variant="secondary" onClick={refreshDisplay}>Reload saved</Button>
          <Button variant="ghost" onClick={clearAlbum}>Clear album</Button>
        </div>
      </section>

      {message && <p className={[styles.notice, styles.noticeOk].join(' ')}>{message}</p>}

      <div className={styles.twoCol} style={{ marginTop: 'var(--space-xl)' }}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Needs ({needItems.length})</h2>
          <StickerList
            albumId={albumId}
            items={needItems}
            emptyMessage="No needs saved yet."
            accent={album?.accent}
          />
        </section>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Spares ({spareItems.length})</h2>
          <StickerList
            albumId={albumId}
            items={spareItems}
            emptyMessage="No spares saved yet."
            accent={album?.accent}
          />
        </section>
      </div>

      <div className={styles.actions} style={{ marginTop: 'var(--space-xl)' }}>
        <Button variant="ghost" onClick={handleExport}>Export backup</Button>
        <Button variant="ghost" onClick={handleImport}>Import backup</Button>
      </div>
    </main>
  )
}
