import { copiesOf, sparesOf } from '../lib/storage'
import type { CollectionAlbumState, StickerEntry } from '../lib/types'
import styles from './StickerChip.module.css'

type StickerChipProps = {
  sticker: StickerEntry
  state: CollectionAlbumState
  onBump: (seq: number, delta: number) => void
  compact?: boolean
  /** Pending inbound from an open postal swap */
  incoming?: boolean
  /** Mark the first open postal expected line as received */
  onMarkArrived?: (seq: number) => void
}

export function StickerChip({
  sticker,
  state,
  onBump,
  compact,
  incoming,
  onMarkArrived,
}: StickerChipProps) {
  const copies = copiesOf(state, sticker.seq)
  const spares = sparesOf(state, sticker.seq)

  let status: 'need' | 'album' | 'spare' | 'incoming'
  if (incoming && copies <= 0) status = 'incoming'
  else if (incoming && copies > 0) status = copies === 1 ? 'album' : 'spare'
  else if (copies <= 0) status = 'need'
  else if (copies === 1) status = 'album'
  else status = 'spare'

  const tag =
    status === 'need'
      ? 'need'
      : status === 'incoming'
        ? 'coming'
        : status === 'album'
          ? '✓'
          : `+${spares}`

  const blockMinus = incoming && copies < 1

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={[
          styles.chip,
          styles[status],
          incoming && status !== 'incoming' ? styles.hasIncoming : '',
          compact ? styles.compact : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={`${sticker.code}${sticker.cardNum} ${sticker.name}${
          incoming
            ? copies <= 0
              ? ' · incoming in post'
              : ' · also incoming in post'
            : ''
        } — click +1, shift-click −1`}
        onClick={(e) => {
          const delta = e.shiftKey ? -1 : 1
          if (delta < 0 && blockMinus) return
          onBump(sticker.seq, delta)
        }}
      >
        <span className={styles.code}>
          {sticker.code}
          {sticker.cardNum}
        </span>
        {!compact && <span className={styles.name}>{sticker.name}</span>}
        <span className={styles.tag}>{tag}</span>
      </button>
      {incoming && onMarkArrived && (
        <button
          type="button"
          className={styles.arriveBtn}
          onClick={() => onMarkArrived(sticker.seq)}
        >
          Arrived
        </button>
      )}
    </div>
  )
}
