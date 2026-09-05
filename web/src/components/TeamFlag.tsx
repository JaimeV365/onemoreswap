import { useEffect, useState } from 'react'
import {
  PL_CREST_ESPN_ID,
  sectionFlagEmoji,
  sectionGlyph,
  sectionImageUrl,
  TEAM_FLAG_ISO,
} from '../lib/teamFlags'
import styles from './TeamFlag.module.css'

type TeamFlagProps = {
  albumId: string
  code: string
  /** Slightly larger mark in section headers */
  size?: 'sm' | 'md'
  /** Prefer emoji flags (reliable; no CDN). WC defaults to emoji. */
  preferEmoji?: boolean
  className?: string
}

function knownMark(albumId: string, code: string): boolean {
  if (albumId === 'wc2026') return Object.prototype.hasOwnProperty.call(TEAM_FLAG_ISO, code)
  if (albumId === 'pl2526') {
    return (
      Boolean(PL_CREST_ESPN_ID[code]) ||
      code === 'PL' ||
      code === 'INT' ||
      code === 'HOF' ||
      code === 'TBL' ||
      code === 'DUO' ||
      code === 'DIV'
    )
  }
  return false
}

export function TeamFlag({
  albumId,
  code,
  size = 'sm',
  preferEmoji,
  className,
}: TeamFlagProps) {
  const known = knownMark(albumId, code)
  const emoji = albumId === 'wc2026' ? sectionFlagEmoji(code) : null
  // World Cup: emoji first (flagcdn is often blocked / flaky). PL: club crests from ESPN.
  const wantEmoji = preferEmoji ?? albumId === 'wc2026'
  const src = known ? sectionImageUrl(albumId, code, size === 'md' ? 40 : 32) : null
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [src])

  const isCrest = albumId === 'pl2526'
  const showImg = Boolean(src) && !imgFailed && !(wantEmoji && emoji)

  if (!known) return null

  if (showImg) {
    return (
      <span
        className={[styles.flag, styles[size], isCrest ? styles.crest : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      >
        <img
          src={src!}
          alt=""
          width={size === 'md' ? 24 : 20}
          height={size === 'md' ? (isCrest ? 24 : 18) : isCrest ? 20 : 15}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      </span>
    )
  }

  if (emoji) {
    return (
      <span
        className={[styles.emoji, styles[size], className].filter(Boolean).join(' ')}
        aria-hidden
      >
        {emoji}
      </span>
    )
  }

  return (
    <span
      className={[styles.mark, styles[size], isCrest ? styles.crestMark : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      {sectionGlyph(code) || code.slice(0, 3)}
    </span>
  )
}
