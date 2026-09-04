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

  const theirParsed = useMemo(() => {
    if (!indexes) return null
    const tn = parseStickerInput(theirNeeds, indexes)
    const ts = parseStickerInput(theirSpares, indexes)
    return { needs: tn, spares: ts }
  }, [indexes, theirNeeds, theirSpares])

  const parsed = useMemo(() => {
    if (!indexes || !yourSide || !theirParsed) return null
    const overlap = computeOverlap(
      yourSide.needs,
      yourSide.spares,
      countsToSet(theirParsed.needs.counts),
      theirParsed.spares.counts,
    )

    const unknown = useCollection
      ? [...theirParsed.needs.unknown, ...theirParsed.spares.unknown]
      : [
          ...parseStickerInput(yourNeeds, indexes).unknown,
          ...parseStickerInput(yourSpares, indexes).unknown,
          ...theirParsed.needs.unknown,
          ...theirParsed.spares.unknown,
        ]

    const theirSpareTypes = theirParsed.spares.counts.size
    const theirNeedTypes = theirParsed.needs.counts.size
    const theyMatch = overlap.theyCanSend.length
    const youMatch = overlap.youCanSend.length

    return {
      ...overlap,
      unknown,
      theirSpareTypes,
      theirNeedTypes,
      theyNoMatch: Math.max(0, theirSpareTypes - theyMatch),
      youNoMatch: Math.max(0, theirNeedTypes - youMatch),
    }
  }, [indexes, yourSide, theirParsed, useCollection, yourNeeds, yourSpares])

  const hasTheirInput = theirNeeds.trim().length > 0 || theirSpares.trim().length > 0

  const copyOverlap = async (side: 'you' | 'they' | 'both') => {
    if (!parsed) return
    let text = ''
    if (side === 'you' || side === 'both') {
      const list = stickerListAsText(albumId, parsed.youCanSend)
      if (list) {
        text += side === 'both' ? `I can send you:\n${list}` : list
      }
    }
    if (side === 'they' || side === 'both') {
      const list = stickerListAsText(albumId, parsed.theyCanSend)
      if (list) {
        if (text) text += '\n\n'
        text += side === 'both' ? `You can send me:\n${list}` : list
      }
    }
    if (!text) {
      setMessage({ type: 'warn', text: 'No matches to copy yet.' })
      return
    }
    await navigator.clipboard.writeText(text)
    setMessage({
      type: 'ok',
      text:
        side === 'both'
          ? 'Both match lists copied — paste into your reply.'
          : 'Match list copied — paste it wherever you like.',
    })
  }

  const collectionEmpty =
    useCollection && !isAlbumStarted(getAlbumState(loadCollection(), albumId))

  return (
    <main className={styles.page} id="main-content">
      <Badge>Always free · No account</Badge>
      <h1 className={styles.title}>Paste &amp; match</h1>
      <p className={styles.lead}>
        Paste their needs and/or spares. We compare with your collection and show what matches —
        ready to copy into a reply.
      </p>

      <AlbumPicker value={albumId} onChange={setAlbumId} />

      <div className={pasteStyles.modeTabs}>
        <button
          type="button"
          className={[pasteStyles.modeTab, mode === 'simple' ? pasteStyles.modeActive : ''].join(
            ' ',
          )}
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
          <Link to="/">Add stickers</Link> or switch to Compare two full lists and paste both sides.
        </p>
      )}

      {mode === 'simple' ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Their list</h2>
          <div className={styles.grid}>
            <Textarea
              label="Their needs (missing)"
              hint="What they still want — so we see what you can send"
              value={theirNeeds}
              onChange={(e) => setTheirNeeds(e.target.value)}
              placeholder="Paste their needs…"
            />
            <Textarea
              label="Their spares (duplicates)"
              hint="What they can give you — so we see what you can receive"
              value={theirSpares}
              onChange={(e) => setTheirSpares(e.target.value)}
              placeholder="Paste their spares…"
            />
          </div>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={loadFromCollection}>
              Refresh my collection
            </Button>
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
                <p>
                  <strong>Needs:</strong> {yourSide?.needs.size ?? 0} stickers
                </p>
                <p>
                  <strong>Spares:</strong> {yourSide?.spares.size ?? 0} types
                </p>
                <Button variant="ghost" onClick={loadFromCollection}>
                  Refresh
                </Button>
              </div>
            )}
          </section>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Their list</h2>
            <div className={styles.grid}>
              <Textarea
                label="Their needs"
                value={theirNeeds}
                onChange={(e) => setTheirNeeds(e.target.value)}
              />
              <Textarea
                label="Their spares"
                value={theirSpares}
                onChange={(e) => setTheirSpares(e.target.value)}
              />
            </div>
          </section>
        </div>
      )}

      {mode === 'simple' && useCollection && indexes && (
        <p className={pasteStyles.yourSummary}>
          Matching against your collection: <strong>{yourSide?.needs.size ?? 0}</strong> needs,{' '}
          <strong>{yourSide?.spares.size ?? 0}</strong> spare types.{' '}
          <Link to="/">Edit collection</Link>
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

      {!hasTheirInput ? (
        <p className={pasteStyles.emptyResults}>
          Paste their spares and/or needs above — results appear here with match counts and copy
          buttons.
        </p>
      ) : (
        <>
          <section className={pasteStyles.scorecard} aria-live="polite">
            <h2 className={pasteStyles.scoreTitle}>Results</h2>
            <div className={pasteStyles.scoreGrid}>
              <div className={pasteStyles.scoreCard}>
                <p className={pasteStyles.scoreLabel}>They can send you</p>
                <p className={pasteStyles.scoreMain}>
                  <strong>{parsed?.theyCanSend.length ?? 0}</strong> match
                </p>
                <p className={pasteStyles.scoreSub}>
                  {parsed?.theyNoMatch ?? 0} no match
                  {parsed?.theirSpareTypes
                    ? ` · of ${parsed.theirSpareTypes} spare types they listed`
                    : ' · paste their spares to check'}
                </p>
              </div>
              <div className={pasteStyles.scoreCard}>
                <p className={pasteStyles.scoreLabel}>You can send them</p>
                <p className={pasteStyles.scoreMain}>
                  <strong>{parsed?.youCanSend.length ?? 0}</strong> match
                </p>
                <p className={pasteStyles.scoreSub}>
                  {parsed?.youNoMatch ?? 0} no match
                  {parsed?.theirNeedTypes
                    ? ` · of ${parsed.theirNeedTypes} needs they listed`
                    : ' · paste their needs to check'}
                </p>
              </div>
            </div>
            <div className={styles.actions}>
              <Button
                type="button"
                disabled={!parsed?.theyCanSend.length && !parsed?.youCanSend.length}
                onClick={() => void copyOverlap('both')}
              >
                Copy both match lists
              </Button>
            </div>
          </section>

          <div className={pasteStyles.results}>
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>
                Matches for you ({parsed?.theyCanSend.length ?? 0})
              </h2>
              <p className={pasteStyles.resultHint}>Their spares you still need — copy to reply</p>
              <StickerList
                albumId={albumId}
                items={parsed?.theyCanSend ?? []}
                emptyMessage="No matches — none of their spares are on your need list."
                accent={album?.accent}
              />
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!parsed?.theyCanSend.length}
                  onClick={() => void copyOverlap('they')}
                >
                  Copy this list
                </Button>
              </div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>
                Matches for them ({parsed?.youCanSend.length ?? 0})
              </h2>
              <p className={pasteStyles.resultHint}>Your spares they still need — copy to reply</p>
              <StickerList
                albumId={albumId}
                items={parsed?.youCanSend ?? []}
                emptyMessage="No matches — they don’t need any of your spares (or paste their needs)."
                accent={album?.accent}
              />
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!parsed?.youCanSend.length}
                  onClick={() => void copyOverlap('you')}
                >
                  Copy this list
                </Button>
              </div>
            </section>
          </div>

          {parsed && parsed.youCanSend.length > 0 && parsed.theyCanSend.length > 0 && (
            <p className={[styles.notice, styles.noticeOk].join(' ')}>
              Mutual swap possible — you both have stickers the other needs.
            </p>
          )}
        </>
      )}
    </main>
  )
}
