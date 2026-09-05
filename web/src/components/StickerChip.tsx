import { copiesOf, isFavorite, sparesOf } from '../lib/storage'
import type { CollectionAlbumState, StickerEntry } from '../lib/types'
import { StarIcon } from './icons'
import styles from './StickerChip.module.css'

type StickerChipProps = {
  sticker: StickerEntry
  state: CollectionAlbumState
  onBump: (seq: number, delta: number) => void
  onToggleFavorite?: (seq: number) => void
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
  onToggleFavorite,
  compact,
  incoming,
  onMarkArrived,
}: StickerChipProps) {
  const copies = copiesOf(state, sticker.seq)
  const spares = sparesOf(state, sticker.seq)
  const favorite = isFavorite(state, sticker.seq)

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
  const showStar = status === 'need' && onToggleFavorite

  return (
    <div className={[styles.wrap, favorite ? styles.isFavorite : ''].filter(Boolean).join(' ')}>
      <div className={styles.chipRow}>
        <button
          type="button"
          className={[
            styles.chip,
            styles[status],
            incoming && status !== 'incoming' ? styles.hasIncoming : '',
            compact ? styles.compact : '',
            favorite ? styles.chipFavorite : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title={`${sticker.code}${sticker.cardNum} ${sticker.name}${
            favorite ? ' · priority need' : ''
          }${
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
        {showStar && (
          <button
            type="button"
            className={[styles.starBtn, favorite ? styles.starOn : ''].filter(Boolean).join(' ')}
            aria-label={
              favorite
                ? `Remove ${sticker.code}${sticker.cardNum} from priority needs`
                : `Mark ${sticker.code}${sticker.cardNum} as priority need`
            }
            aria-pressed={favorite}
            title={favorite ? 'Want soon — click to unstar' : 'Mark as want soon'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(sticker.seq)
            }}
          >
            <StarIcon size={14} filled={favorite} />
          </button>
        )}
      </div>
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
