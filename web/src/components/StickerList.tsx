import { getAlbumIndexes, stickerDisplayLabel } from '../lib/catalogue'
import type { AlbumAccent } from '../lib/types'
import styles from './StickerList.module.css'

type StickerListProps = {
  albumId: string
  items: Array<{ seq: number; qty: number }>
  emptyMessage: string
  accent?: AlbumAccent
}

export function StickerList({ albumId, items, emptyMessage, accent }: StickerListProps) {
  const indexes = getAlbumIndexes(albumId)
  if (!indexes) return null

  if (!items.length) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  return (
    <ul className={[styles.list, accent ? styles[accent] : ''].filter(Boolean).join(' ')}>
      {items.map(({ seq, qty }) => {
        const info = indexes.seqToInfo.get(seq)
        if (!info) return null
        return (
          <li key={seq} className={styles.item}>
            <span className={styles.code}>{info.code}{info.cardNum}</span>
            <span className={styles.name}>{info.name}</span>
            {qty > 1 && <span className={styles.qty}>×{qty}</span>}
          </li>
        )
      })}
    </ul>
  )
}

export function stickerListAsText(albumId: string, items: Array<{ seq: number; qty: number }>): string {
  const indexes = getAlbumIndexes(albumId)
  if (!indexes || !items.length) return ''
  return items
    .map(({ seq, qty }) => {
      const info = indexes.seqToInfo.get(seq)
      if (!info) return ''
      const label = stickerDisplayLabel(info)
      return qty > 1 ? `${label} ×${qty}` : label
    })
    .filter(Boolean)
    .join('\n')
}
