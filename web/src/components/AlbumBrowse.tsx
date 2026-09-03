import { useMemo, useState } from 'react'
import { getAlbumIndexes } from '../lib/catalogue'
import { bumpCopies, sparesOf } from '../lib/storage'
import { hasSectionMarks, sectionDomId } from '../lib/teamFlags'
import type { CollectionAlbumState } from '../lib/types'
import { StickerChip } from './StickerChip'
import { TeamFlag } from './TeamFlag'
import styles from './AlbumBrowse.module.css'

export type BrowseFilter = 'all' | 'needs' | 'spares' | 'incoming'

type AlbumBrowseProps = {
  albumId: string
  state: CollectionAlbumState
  onChange: (state: CollectionAlbumState) => void
  filter?: BrowseFilter
  search?: string
  /** seq → qty pending from postal swaps */
  incoming?: Map<number, number>
}

export function AlbumBrowse({
  albumId,
  state,
  onChange,
  filter = 'all',
  search = '',
  incoming = new Map(),
}: AlbumBrowseProps) {
  const indexes = getAlbumIndexes(albumId)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [activeJump, setActiveJump] = useState<string | null>(null)

  const q = search.trim().toLowerCase()

  const visibleSections = useMemo(() => {
    if (!indexes) return []
    return indexes.sections
      .map((sec) => {
        const stickers = sec.stickers.filter((s) => {
          const isIncoming = incoming.has(Number(s.seq))
          // WC26: pending inbound are Incoming, not Needs
          if (filter === 'needs') {
            if (!state.missing.map(Number).includes(Number(s.seq)) || isIncoming) return false
          }
          if (filter === 'spares' && sparesOf(state, s.seq) < 1) return false
          if (filter === 'incoming' && !isIncoming) return false
          if (!q) return true
          const hay =
            `${s.code}${s.cardNum} ${s.code} ${s.cardNum} ${s.seq} ${s.name} ${s.section}`.toLowerCase()
          return hay.includes(q)
        })
        return { ...sec, stickers }
      })
      .filter((sec) => sec.stickers.length > 0)
  }, [indexes, state, filter, q, incoming])

  const showJumpBar = useMemo(
    () => hasSectionMarks(albumId, visibleSections.map((s) => s.code)),
    [albumId, visibleSections],
  )

  if (!indexes) return null

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const jumpToSection = (key: string) => {
    setActiveJump(key)
    setOpenSections((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
    window.setTimeout(() => {
      document.getElementById(sectionDomId(key))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 40)
  }

  const handleBump = (seq: number, delta: number) => {
    const allSeqs = indexes?.catalogue.stickers.map((s) => s.seq) ?? []
    onChange(bumpCopies(state, seq, delta, allSeqs))
  }

  if (!visibleSections.length) {
    return (
      <p className={styles.empty}>
        {filter === 'incoming'
          ? 'No stickers currently expected in the post. Add expected stickers on a postal swap.'
          : filter === 'needs'
            ? 'No needs right now — or they’re all marked Incoming.'
            : 'No stickers match your filter.'}
      </p>
    )
  }

  return (
    <div className={styles.wrap}>
      {showJumpBar && (
        <nav className={styles.jumpBar} aria-label="Jump to team">
          <span className={styles.jumpLabel}>Jump to</span>
          <div className={styles.jumpFlags}>
            {visibleSections.map((sec) => {
              const key = `${sec.code}::${sec.name}`
              const active = activeJump === key
              return (
                <button
                  key={key}
                  type="button"
                  className={[styles.jumpBtn, active ? styles.jumpBtnActive : ''].filter(Boolean).join(' ')}
                  title={sec.name}
                  aria-label={`Open ${sec.name}`}
                  onClick={() => jumpToSection(key)}
                >
                  <TeamFlag albumId={albumId} code={sec.code} size="sm" />
                  <span className={styles.jumpCode}>{sec.code}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {visibleSections.map((sec) => {
        const key = `${sec.code}::${sec.name}`
        const isOpen =
          openSections.has(key) || !!q || filter === 'incoming' || filter === 'needs' || filter === 'spares'
        return (
          <section key={key} id={sectionDomId(key)} className={styles.section}>
            <button type="button" className={styles.sectionHead} onClick={() => toggleSection(key)}>
              <TeamFlag albumId={albumId} code={sec.code} size="md" />
              <span className={styles.sectionTitle}>{sec.name}</span>
              <span className={styles.sectionMeta}>
                {sec.stickers.length} shown · {sec.code}
              </span>
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
                    incoming={incoming.has(Number(s.seq))}
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
