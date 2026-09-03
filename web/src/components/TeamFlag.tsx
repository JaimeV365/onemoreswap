import { useState } from 'react'
import { flagImageUrl, TEAM_FLAG_ISO } from '../lib/teamFlags'
import styles from './TeamFlag.module.css'

type TeamFlagProps = {
  code: string
  /** Slightly larger mark in section headers */
  size?: 'sm' | 'md'
  className?: string
}

export function TeamFlag({ code, size = 'sm', className }: TeamFlagProps) {
  const known = Object.prototype.hasOwnProperty.call(TEAM_FLAG_ISO, code)
  const src = known ? flagImageUrl(code, size === 'md' ? 40 : 32) : null
  const [imgFailed, setImgFailed] = useState(false)

  if (!known) return null

  if (!src || imgFailed) {
    return (
      <span className={[styles.mark, styles[size], className].filter(Boolean).join(' ')} aria-hidden>
        {code === '00' ? '★' : code.slice(0, 3)}
      </span>
    )
  }

  return (
    <span className={[styles.flag, styles[size], className].filter(Boolean).join(' ')} aria-hidden>
      <img src={src} alt="" width={size === 'md' ? 24 : 20} height={size === 'md' ? 18 : 15} loading="lazy" onError={() => setImgFailed(true)} />
    </span>
  )
}
