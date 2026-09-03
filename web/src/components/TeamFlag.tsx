import { useState } from 'react'
import { sectionImageUrl, TEAM_FLAG_ISO, PL_CREST_ESPN_ID } from '../lib/teamFlags'
import styles from './TeamFlag.module.css'

type TeamFlagProps = {
  albumId: string
  code: string
  /** Slightly larger mark in section headers */
  size?: 'sm' | 'md'
  className?: string
}

function knownMark(albumId: string, code: string): boolean {
  if (albumId === 'wc2026') return Object.prototype.hasOwnProperty.call(TEAM_FLAG_ISO, code)
  if (albumId === 'pl2526') return Boolean(PL_CREST_ESPN_ID[code]) || code === 'PL'
  return false
}

export function TeamFlag({ albumId, code, size = 'sm', className }: TeamFlagProps) {
  const known = knownMark(albumId, code)
  const src = known ? sectionImageUrl(albumId, code, size === 'md' ? 40 : 32) : null
  const [imgFailed, setImgFailed] = useState(false)
  const isCrest = albumId === 'pl2526'

  if (!known) return null

  if (!src || imgFailed) {
    return (
      <span
        className={[styles.mark, styles[size], isCrest ? styles.crestMark : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      >
        {code === '00' ? '★' : code.slice(0, 3)}
      </span>
    )
  }

  return (
    <span
      className={[styles.flag, styles[size], isCrest ? styles.crest : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        width={size === 'md' ? 24 : 20}
        height={size === 'md' ? (isCrest ? 24 : 18) : isCrest ? 20 : 15}
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    </span>
  )
}
