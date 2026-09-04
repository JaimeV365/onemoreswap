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

export function SharePanel({ albumId, state }: SharePanelProps) {
  const [tab, setTab] = useState<ShareTab>('both')
  const [linkMode, setLinkMode] = useState<ShareLinkMode>('spares')
  const [copied, setCopied] = useState(false)
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [postText, setPostText] = useState<string | null>(null)
  const [postCopied, setPostCopied] = useState(false)

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
    setShareUrl(res.data.url)
    setPostText(socialPostBlurb(albumId, linkMode, res.data.url))
  }

  const copyPost = async () => {
    if (!postText) return
    await copyToClipboard(postText)
    setPostCopied(true)
    setTimeout(() => setPostCopied(false), 2000)
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Share list</h2>
      <p className={styles.hint}>
        Copy a formatted list for chat, or create an <strong>anonymous match link</strong> for social
        media. The link only includes sticker numbers — never your name, email, or profile.
      </p>

      <h3 className={styles.subTitle}>Anonymous match link</h3>
      <p className={styles.hint}>
        Others open the link, paste their list, see overlaps, and copy matches to reply — no login.
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
          {linkBusy ? 'Creating…' : 'Create match link'}
        </Button>
      </div>
      {linkError && (
        <p className={styles.linkError} role="alert">
          {linkError}
        </p>
      )}
      {shareUrl && postText && (
        <div className={styles.linkBox}>
          <p className={styles.linkUrl}>{shareUrl}</p>
          <pre className={styles.output}>{postText}</pre>
          <Button type="button" variant="secondary" onClick={copyPost}>
            {postCopied ? 'Copied!' : 'Copy post text + link'}
          </Button>
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
    </section>
  )
}
