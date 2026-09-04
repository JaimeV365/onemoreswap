import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { StickerList, stickerListAsText } from '../components/StickerList'
import { Textarea } from '../components/Textarea'
import { loadEnabledAlbums } from '../lib/enabledAlbums'
import { getAlbum, getAlbumIndexes } from '../lib/catalogue'
import { countsToSet, computeOverlap } from '../lib/overlap'
import { parseStickerInput } from '../lib/parseStickers'
import { pendingIncomingMap } from '../lib/postal'
import { needsForMatching, stateToPasteText } from '../lib/stateText'
import {
  getAlbumState,
  isAlbumStarted,
  loadCollection,
  sparesToMap,
} from '../lib/storage'
import styles from './Page.module.css'
import pasteStyles from './PasteTool.module.css'

const DEFAULT_ALBUM = 'wc2026'

type Mode = 'simple' | 'full'

export function PasteTool() {
  const [albumId, setAlbumId] = useState(() => loadEnabledAlbums()[0] || DEFAULT_ALBUM)
  const [mode, setMode] = useState<Mode>('simple')
  const [yourNeeds, setYourNeeds] = useState('')
  const [yourSpares, setYourSpares] = useState('')
  const [theirNeeds, setTheirNeeds] = useState('')
  const [theirSpares, setTheirSpares] = useState('')
  const [useCollection, setUseCollection] = useState(true)
  const [message, setMessage] = useState<{ type: 'ok' | 'warn' | 'error'; text: string } | null>(
    null,
  )

  const indexes = getAlbumIndexes(albumId)
  const album = getAlbum(albumId)

  const loadFromCollection = useCallback(() => {
    if (!indexes) return
    const state = getAlbumState(loadCollection(), albumId)
    const exclude = new Set(pendingIncomingMap(albumId).keys())
    const text = stateToPasteText(state, indexes, exclude)
    setYourNeeds(text.needs)
    setYourSpares(text.spares)
  }, [albumId, indexes])

  useEffect(() => {
    if (useCollection) loadFromCollection()
  }, [albumId, useCollection, loadFromCollection])

  const yourSide = useMemo(() => {
    if (!indexes) return null
    if (useCollection) {
      const state = getAlbumState(loadCollection(), albumId)
      const incoming = new Set(pendingIncomingMap(albumId).keys())
      return {
        needs: needsForMatching(state, incoming),
        spares: sparesToMap(state),
      }
    }
    const yn = parseStickerInput(yourNeeds, indexes)
    const ys = parseStickerInput(yourSpares, indexes)
    return { needs: countsToSet(yn.counts), spares: ys.counts }
  }, [indexes, useCollection, albumId, yourNeeds, yourSpares])

  const parsed = useMemo(() => {
    if (!indexes || !yourSide) return null
    const tn = parseStickerInput(theirNeeds, indexes)
    const ts = parseStickerInput(theirSpares, indexes)
    const overlap = computeOverlap(yourSide.needs, yourSide.spares, countsToSet(tn.counts), ts.counts)

    const unknown = useCollection
      ? [...tn.unknown, ...ts.unknown]
      : [
          ...parseStickerInput(yourNeeds, indexes).unknown,
          ...parseStickerInput(yourSpares, indexes).unknown,
          ...tn.unknown,
          ...ts.unknown,
        ]

    return { ...overlap, unknown }
  }, [indexes, yourSide, theirNeeds, theirSpares, useCollection, yourNeeds, yourSpares])

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

  const tryExample = () => {
    setTheirNeeds('ENG 5 7 12')
    setTheirSpares('MEX 1 2')
    setMessage({ type: 'ok', text: 'Example list loaded — add your collection or paste your side.' })
  }

  const collectionEmpty =
    useCollection &&
    !isAlbumStarted(getAlbumState(loadCollection(), albumId))

  return (
    <main className={styles.page} id="main-content">
      <Badge>Always free · No account</Badge>
      <h1 className={styles.title}>Paste &amp; match</h1>
      <p className={styles.lead}>
        Paste a list from WhatsApp or a forum and see what you can swap. Your saved collection loads
        automatically — or{' '}
        <Link to="/collection">set it up first</Link>.
      </p>

      <AlbumPicker value={albumId} onChange={setAlbumId} />

      <div className={pasteStyles.modeTabs}>
        <button
          type="button"
          className={[pasteStyles.modeTab, mode === 'simple' ? pasteStyles.modeActive : ''].join(' ')}
          onClick={() => setMode('simple')}
        >
          Match their list
        </button>
        <button
          type="button"
          className={[pasteStyles.modeTab, mode === 'full' ? pasteStyles.modeActive : ''].join(' ')}
          onClick={() => setMode('full')}
        >
          Compare two full lists
        </button>
      </div>

      {collectionEmpty && useCollection && (
        <p className={[styles.notice, styles.noticeWarn].join(' ')}>
          Your collection is empty for this album.{' '}
          <Link to="/collection">Add stickers</Link> or switch to manual entry below.
        </p>
      )}

      {mode === 'simple' ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Their list</h2>
          <div className={styles.grid}>
            <Textarea
              label="Their needs (missing)"
              hint="What they still want"
              value={theirNeeds}
              onChange={(e) => setTheirNeeds(e.target.value)}
              placeholder="e.g. ENG 5 7 12"
            />
            <Textarea
              label="Their spares (duplicates)"
              hint="What they can swap away"
              value={theirSpares}
              onChange={(e) => setTheirSpares(e.target.value)}
              placeholder="e.g. MEX 1 2 3"
            />
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={tryExample}>Try example</Button>
            <Button variant="ghost" onClick={loadFromCollection}>Refresh my collection</Button>
          </div>
        </section>
      ) : (
        <div className={pasteStyles.columns}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Your list</h2>
            <label className={pasteStyles.checkRow}>
              <input
                type="checkbox"
                checked={useCollection}
                onChange={(e) => setUseCollection(e.target.checked)}
              />
              Use saved collection
            </label>
            {!useCollection && (
              <div className={styles.grid}>
                <Textarea
                  label="Your needs"
                  value={yourNeeds}
                  onChange={(e) => setYourNeeds(e.target.value)}
                />
                <Textarea
                  label="Your spares"
                  value={yourSpares}
                  onChange={(e) => setYourSpares(e.target.value)}
                />
              </div>
            )}
            {useCollection && indexes && (
              <div className={pasteStyles.summaryBox}>
                <p><strong>Needs:</strong> {yourSide?.needs.size ?? 0} stickers</p>
                <p><strong>Spares:</strong> {yourSide?.spares.size ?? 0} types</p>
                <Button variant="ghost" onClick={loadFromCollection}>Refresh</Button>
              </div>
            )}
          </section>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Their list</h2>
            <div className={styles.grid}>
              <Textarea label="Their needs" value={theirNeeds} onChange={(e) => setTheirNeeds(e.target.value)} />
              <Textarea label="Their spares" value={theirSpares} onChange={(e) => setTheirSpares(e.target.value)} />
            </div>
          </section>
        </div>
      )}

      {mode === 'simple' && useCollection && indexes && (
        <p className={pasteStyles.yourSummary}>
          Matching against your collection: <strong>{yourSide?.needs.size ?? 0}</strong> needs,{' '}
          <strong>{yourSide?.spares.size ?? 0}</strong> spare types.{' '}
          <Link to="/collection">Edit collection</Link>
        </p>
      )}

      {parsed && parsed.unknown.length > 0 && (
        <p className={[styles.notice, styles.noticeWarn].join(' ')}>
          Could not parse: {parsed.unknown.slice(0, 10).join(', ')}
          {parsed.unknown.length > 10 ? ` (+${parsed.unknown.length - 10} more)` : ''}
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
          <h2 className={styles.panelTitle}>You can send them ({parsed?.youCanSend.length ?? 0})</h2>
          <p className={pasteStyles.resultHint}>Your spares they still need</p>
          <StickerList
            albumId={albumId}
            items={parsed?.youCanSend ?? []}
            emptyMessage="No overlap — they don't need any of your spares (or paste their needs)."
            accent={album?.accent}
          />
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => copyOverlap('you')}>Copy list</Button>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>They can send you ({parsed?.theyCanSend.length ?? 0})</h2>
          <p className={pasteStyles.resultHint}>Their spares you still need</p>
          <StickerList
            albumId={albumId}
            items={parsed?.theyCanSend ?? []}
            emptyMessage="No overlap — you don't need any of their spares (or add your needs)."
            accent={album?.accent}
          />
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => copyOverlap('they')}>Copy list</Button>
          </div>
        </section>
      </div>

      {parsed && parsed.youCanSend.length > 0 && parsed.theyCanSend.length > 0 && (
        <p className={[styles.notice, styles.noticeOk].join(' ')}>
          Mutual swap potential — you both have stickers the other needs.
        </p>
      )}
    </main>
  )
}
