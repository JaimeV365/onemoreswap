import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { StickerList, stickerListAsText } from '../components/StickerList'
import { Textarea } from '../components/Textarea'
import { getAlbum, getAlbumIndexes } from '../lib/catalogue'
import { countsToSet, computeOverlap } from '../lib/overlap'
import { parseStickerInput } from '../lib/parseStickers'
import {
  fetchShareLink,
  needsSetFromPayload,
  sparesMapFromPayload,
  type ShareLinkMode,
  type SharePayload,
} from '../lib/shareLinks'
import { copyToClipboard } from '../lib/storage'
import styles from './Page.module.css'
import matchStyles from './ShareMatch.module.css'

export function ShareMatch() {
  const { token = '' } = useParams()
  const resultsRef = useRef<HTMLElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [albumId, setAlbumId] = useState('')
  const [mode, setMode] = useState<ShareLinkMode>('spares')
  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [theirNeedsPaste, setTheirNeedsPaste] = useState('')
  const [theirSparesPaste, setTheirSparesPaste] = useState('')
  const [ran, setRan] = useState(false)
  const [copied, setCopied] = useState(false)
  const [unknown, setUnknown] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetchShareLink(token)
      if (cancelled) return
      setLoading(false)
      if (res.error || !res.data) {
        setError(res.error || 'Link not found')
        return
      }
      setAlbumId(res.data.albumId)
      setMode(res.data.mode)
      setPayload(res.data.payload)
      setExpiresAt(res.data.expiresAt)
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const album = getAlbum(albumId)
  const indexes = getAlbumIndexes(albumId)

  const sharedSpares = useMemo(
    () => (payload ? [...sparesMapFromPayload(payload).entries()].map(([seq, qty]) => ({ seq, qty })) : []),
    [payload],
  )
  const sharedNeeds = useMemo(
    () => (payload ? [...needsSetFromPayload(payload)].map((seq) => ({ seq, qty: 1 })) : []),
    [payload],
  )

  const overlap = useMemo(() => {
    if (!payload || !indexes || !ran) return null
    const sharedSpareMap = sparesMapFromPayload(payload)
    const sharedNeedSet = needsSetFromPayload(payload)

    const visitorNeeds = parseStickerInput(theirNeedsPaste, indexes)
    const visitorSpares = parseStickerInput(theirSparesPaste, indexes)
    const unk = [...visitorNeeds.unknown, ...visitorSpares.unknown]

    // Direction A: visitor needs ∩ shared spares → stickers they can ask for
    // Direction B: shared needs ∩ visitor spares → stickers visitor can offer
    const result = computeOverlap(
      sharedNeedSet,
      sharedSpareMap,
      countsToSet(visitorNeeds.counts),
      visitorSpares.counts,
    )
    return { result, unk }
  }, [payload, indexes, ran, theirNeedsPaste, theirSparesPaste])

  const showSpares = mode === 'spares' || mode === 'both'
  const showNeeds = mode === 'needs' || mode === 'both'

  const runMatch = () => {
    setRan(true)
    setCopied(false)
  }

  // After match runs: refresh unknowns and scroll results into view
  useEffect(() => {
    if (!ran || !overlap) return
    setUnknown(overlap.unk)
    // Defer so the Matches panel is in the DOM before scrolling
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [ran, overlap])

  const matchesForVisitor = overlap?.result.youCanSend || [] // shared spares they need
  const matchesVisitorCanOffer = overlap?.result.theyCanSend || [] // visitor spares for shared needs

  const copyMatches = async () => {
    const parts: string[] = []
    if (matchesForVisitor.length) {
      parts.push('Matches from the shared spares (I need these):')
      parts.push(stickerListAsText(albumId, matchesForVisitor, { hideQty: true }))
    }
    if (matchesVisitorCanOffer.length) {
      parts.push('I can offer these for their needs:')
      parts.push(stickerListAsText(albumId, matchesVisitorCanOffer, { hideQty: true }))
    }
    if (!parts.length) parts.push('(no matches)')
    await copyToClipboard(parts.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <main className={styles.page} id="main-content">
        <h1 className={styles.title}>Shared list</h1>
        <p className={styles.lead}>Loading…</p>
      </main>
    )
  }

  if (error || !payload) {
    return (
      <main className={styles.page} id="main-content">
        <h1 className={styles.title}>Shared list</h1>
        <p className={[styles.notice, styles.noticeError].join(' ')}>{error || 'Not found'}</p>
        <p className={styles.lead}>
          <Link to="/">Open my collection</Link> · <Link to="/swap">Swap</Link>
        </p>
      </main>
    )
  }

  return (
    <main className={styles.page} id="main-content">
      <p className={matchStyles.anon}>Anonymous swap list — no names or accounts shown</p>
      <h1 className={styles.title}>{album?.name || 'Sticker'} share</h1>
      <p className={styles.lead}>
        Check overlaps with this list, copy the matches, and reply on social media. Nothing here
        identifies who shared it.
      </p>
      {expiresAt && (
        <p className={matchStyles.meta}>
          Link expires {new Date(expiresAt).toLocaleDateString()}
        </p>
      )}

      {showSpares && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Shared spares ({sharedSpares.length})</h2>
          <StickerList
            albumId={albumId}
            items={sharedSpares}
            emptyMessage="No spares on this link."
            accent={album?.accent}
            hideQty
          />
        </section>
      )}

      {showNeeds && (
        <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
          <h2 className={styles.panelTitle}>Shared needs ({sharedNeeds.length})</h2>
          <StickerList
            albumId={albumId}
            items={sharedNeeds}
            emptyMessage="No needs on this link."
            accent={album?.accent}
            hideQty
          />
        </section>
      )}

      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>Your list</h2>
        <p className={matchStyles.hint}>
          Paste below — no account needed. Use the same formats as elsewhere (e.g.{' '}
          <code>MEX: 1, 2, 14</code>).
        </p>
        {showSpares && (
          <Textarea
            label="Your needs"
            hint="We'll show stickers from the shared spares that you still need"
            value={theirNeedsPaste}
            onChange={(e) => {
              setTheirNeedsPaste(e.target.value)
              setRan(false)
            }}
            rows={4}
          />
        )}
        {showNeeds && (
          <div style={{ marginTop: showSpares ? 'var(--space-md)' : 0 }}>
            <Textarea
              label="Your spares"
              hint="We'll show stickers you can offer for their needs"
              value={theirSparesPaste}
              onChange={(e) => {
                setTheirSparesPaste(e.target.value)
                setRan(false)
              }}
              rows={4}
            />
          </div>
        )}
        <div className={styles.actions}>
          <Button type="button" onClick={runMatch}>
            Find matches
          </Button>
        </div>
      </section>

      {ran && overlap && (
        <section
          ref={resultsRef}
          className={styles.panel}
          style={{ marginTop: 'var(--space-lg)' }}
        >
          <h2 className={styles.panelTitle}>Matches</h2>
          {unknown.length > 0 && (
            <p className={[styles.notice, styles.noticeError].join(' ')}>
              Could not parse: {unknown.slice(0, 8).join(', ')}
            </p>
          )}
          {showSpares && (
            <>
              <h3 className={matchStyles.sub}>From their spares (you need)</h3>
              <StickerList
                albumId={albumId}
                items={matchesForVisitor}
                emptyMessage="No overlap with your needs."
                accent={album?.accent}
                hideQty
              />
            </>
          )}
          {showNeeds && (
            <>
              <h3 className={matchStyles.sub}>You can offer (their needs)</h3>
              <StickerList
                albumId={albumId}
                items={matchesVisitorCanOffer}
                emptyMessage="No overlap with your spares."
                accent={album?.accent}
                hideQty
              />
            </>
          )}
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              disabled={!matchesForVisitor.length && !matchesVisitorCanOffer.length}
              onClick={copyMatches}
            >
              {copied ? 'Copied!' : 'Copy matches for reply'}
            </Button>
          </div>
        </section>
      )}

      <section className={matchStyles.cta}>
        <h2 className={styles.panelTitle}>Want your own list online?</h2>
        <p>
          Track your album on this device (no account), then create the same kind of anonymous share
          link for social media. Sign in later if you want cloud backup.
        </p>
        <div className={styles.actions}>
          <Link to="/">
            <Button type="button">Open my collection</Button>
          </Link>
          <Link to="/account">
            <Button type="button" variant="secondary">
              Create account
            </Button>
          </Link>
          <Link to="/swap">
            <Button type="button" variant="ghost">
              Swap
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
