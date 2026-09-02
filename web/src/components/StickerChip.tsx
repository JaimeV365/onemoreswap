import { copiesOf, sparesOf } from '../lib/storage'
import type { CollectionAlbumState, StickerEntry } from '../lib/types'
import styles from './StickerChip.module.css'

type StickerChipProps = {
  sticker: StickerEntry
  state: CollectionAlbumState
  onBump: (seq: number, delta: number) => void
  compact?: boolean
}

export function StickerChip({ sticker, state, onBump, compact }: StickerChipProps) {
  const copies = copiesOf(state, sticker.seq)
  const spares = sparesOf(state, sticker.seq)
  const status =
    copies <= 0 ? 'need' : copies === 1 ? 'album' : 'spare'

  return (
    <button
      type="button"
      className={[styles.chip, styles[status], compact ? styles.compact : ''].filter(Boolean).join(' ')}
      title={`${sticker.code}${sticker.cardNum} ${sticker.name} — click +1, shift-click −1`}
      onClick={(e) => onBump(sticker.seq, e.shiftKey ? -1 : 1)}
    >
      <span className={styles.code}>{sticker.code}{sticker.cardNum}</span>
      {!compact && <span className={styles.name}>{sticker.name}</span>}
      <span className={styles.tag}>
        {status === 'need' ? 'need' : status === 'album' ? '✓' : `+${spares}`}
      </span>
    </button>
  )
}
