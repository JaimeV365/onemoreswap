import { useMemo, useState } from 'react'
import { getAlbumIndexes } from '../lib/catalogue'
import { bumpCopies, sparesOf } from '../lib/storage'
import type { CollectionAlbumState } from '../lib/types'
import { StickerChip } from './StickerChip'
import styles from './AlbumBrowse.module.css'

type AlbumBrowseProps = {
  albumId: string
  state: CollectionAlbumState
  onChange: (state: CollectionAlbumState) => void
  filter?: 'all' | 'needs' | 'spares'
  search?: string
}

export function AlbumBrowse({ albumId, state, onChange, filter = 'all', search = '' }: AlbumBrowseProps) {
  const indexes = getAlbumIndexes(albumId)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const q = search.trim().toLowerCase()

  const visibleSections = useMemo(() => {
    if (!indexes) return []
    return indexes.sections
      .map((sec) => {
        const stickers = sec.stickers.filter((s) => {
          if (filter === 'needs' && !state.missing.includes(s.seq)) return false
          if (filter === 'spares' && sparesOf(state, s.seq) < 1) return false
          if (!q) return true
          const hay = `${s.code}${s.cardNum} ${s.name} ${s.section}`.toLowerCase()
          return hay.includes(q)
        })
        return { ...sec, stickers }
      })
      .filter((sec) => sec.stickers.length > 0)
  }, [indexes, state, filter, q])

  if (!indexes) return null

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleBump = (seq: number, delta: number) => {
    onChange(bumpCopies(state, seq, delta))
  }

  if (!visibleSections.length) {
    return <p className={styles.empty}>No stickers match your filter.</p>
  }

  return (
    <div className={styles.wrap}>
      {visibleSections.map((sec) => {
        const key = `${sec.code}::${sec.name}`
        const isOpen = openSections.has(key) || !!q
        return (
          <section key={key} className={styles.section}>
            <button type="button" className={styles.sectionHead} onClick={() => toggleSection(key)}>
              <span className={styles.sectionTitle}>{sec.name}</span>
              <span className={styles.sectionMeta}>{sec.stickers.length} shown · {sec.code}</span>
              <span className={styles.chevron}>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className={styles.grid}>
                {sec.stickers.map((s) => (
                  <StickerChip
                    key={s.seq}
                    sticker={s}
                    state={state}
                    onBump={handleBump}
                    compact
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
