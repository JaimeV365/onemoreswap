import { useState } from 'react'
import { buildShareText, getAlbum } from '../lib/catalogue'
import {
  buildSharePayload,
  createShareLink,
  sharePayloadHasContent,
  socialPostBlurb,
  type ShareLinkMode,
} from '../lib/shareLinks'
import { copyToClipboard } from '../lib/storage'
import type { CollectionAlbumState, ShareTab } from '../lib/types'
import { Button } from './Button'
import styles from './SharePanel.module.css'

type SharePanelProps = {
  albumId: string
  state: CollectionAlbumState
  /** Skip outer panel chrome when nested in a collapsible section */
  bare?: boolean
}

const tabs: { id: ShareTab; label: string }[] = [
  { id: 'missing', label: 'Needs only' },
  { id: 'spares', label: 'Spares only' },
  { id: 'both', label: 'Both' },
]

const linkModes: { id: ShareLinkMode; label: string }[] = [
  { id: 'spares', label: 'Spares link' },
  { id: 'needs', label: 'Needs link' },
  { id: 'both', label: 'Both link' },
]

export function SharePanel({ albumId, state, bare = false }: SharePanelProps) {
  const [tab, setTab] = useState<ShareTab>('both')
  const [linkMode, setLinkMode] = useState<ShareLinkMode>('spares')
  const [copied, setCopied] = useState(false)
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [postText, setPostText] = useState<string | null>(null)
  const [postCopied, setPostCopied] = useState(false)
  /** Show Copy only after the user edits the auto-copied post text. */
  const [postDirty, setPostDirty] = useState(false)

  const text = buildShareText(albumId, state, tab)
  const album = getAlbum(albumId)

  const handleCopy = async () => {
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const createLink = async () => {
    setLinkBusy(true)
    setLinkError(null)
    const payload = buildSharePayload(albumId, state, linkMode)
    if (!sharePayloadHasContent(payload, linkMode)) {
      setLinkBusy(false)
      setLinkError(
        linkMode === 'needs'
          ? 'No needs to share yet.'
          : linkMode === 'spares'
            ? 'No spares to share yet — mark duplicates first.'
            : 'No needs or spares to share yet.',
      )
      return
    }
    const res = await createShareLink({ albumId, mode: linkMode, payload })
    setLinkBusy(false)
    if (res.error || !res.data) {
      setLinkError(res.error || 'Could not create link')
      return
    }
    const listTab: ShareTab = linkMode === 'needs' ? 'missing' : linkMode
    const blurb = socialPostBlurb(
      albumId,
      linkMode,
      res.data.url,
      buildShareText(albumId, state, listTab),
    )
    setShareUrl(res.data.url)
    setPostText(blurb)
    setPostDirty(false)
    await copyToClipboard(blurb)
    setPostCopied(true)
    setTimeout(() => setPostCopied(false), 2500)
  }

  const copyPost = async () => {
    if (!postText) return
    await copyToClipboard(postText)
    setPostDirty(false)
    setPostCopied(true)
    setTimeout(() => setPostCopied(false), 2500)
  }

  return (
    <div className={bare ? styles.bare : styles.panel}>
      {!bare && <h2 className={styles.title}>Share list</h2>}
      <p className={styles.hint}>
        Copy a list for chat, or post a match link so friends outside One More Swap can find swaps
        with you — no account, no name on the link.
      </p>

      <h3 className={styles.subTitle}>Match link</h3>
      <p className={styles.hint}>
        For WhatsApp, Facebook, forums. Creates post text + link; edit below if you like.
      </p>
      <div className={styles.tabs}>
        {linkModes.map((t) => (
          <button
            key={t.id}
            type="button"
            className={[styles.tab, linkMode === t.id ? styles.tabActive : ''].join(' ')}
            onClick={() => setLinkMode(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.linkActions}>
        <Button type="button" disabled={linkBusy || !album} onClick={createLink}>
          {linkBusy ? 'Creating…' : 'Create & copy match link'}
        </Button>
      </div>
      {linkError && (
        <p className={styles.linkError} role="alert">
          {linkError}
        </p>
      )}
      {shareUrl && postText !== null && (
        <div className={styles.linkBox}>
          {postCopied && !postDirty && (
            <p className={styles.copiedBanner} role="status">
              Copied to clipboard — paste into your post
            </p>
          )}
          <label className={styles.postLabel} htmlFor="share-post-text">
            Post text
          </label>
          <textarea
            id="share-post-text"
            className={styles.postEdit}
            value={postText}
            rows={10}
            spellCheck={false}
            onChange={(e) => {
              setPostText(e.target.value)
              setPostDirty(true)
              setPostCopied(false)
            }}
          />
          {postDirty && (
            <Button type="button" variant="secondary" onClick={copyPost}>
              Copy to clipboard
            </Button>
          )}
        </div>
      )}

      <h3 className={styles.subTitle}>Plain text</h3>
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={[styles.tab, tab === t.id ? styles.tabActive : ''].join(' ')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre className={styles.output}>{text}</pre>
      <Button type="button" variant="secondary" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy to clipboard'}
      </Button>
    </div>
  )
}
