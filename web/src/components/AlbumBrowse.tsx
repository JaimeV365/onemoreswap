import { useMemo, useState } from 'react'
import { getAlbumIndexes } from '../lib/catalogue'
import { bumpCopies, copiesOf, isFavorite, sparesOf, toggleFavorite } from '../lib/storage'
import { hasSectionMarks, sectionDomId, stickerMatchesSearch } from '../lib/teamFlags'
import type { CollectionAlbumState, StickerEntry } from '../lib/types'
import { StickerChip } from './StickerChip'
import { TeamFlag } from './TeamFlag'
import styles from './AlbumBrowse.module.css'

export type BrowseFilter = 'all' | 'needs' | 'favorites' | 'spares' | 'incoming'

/** What to sort teams/clubs by — direction is separate (standard table pattern). */
export type SectionSortBy = 'album' | 'progress' | 'incoming' | 'spares' | 'favorites'
export type SectionSortDir = 'asc' | 'desc'

type AlbumBrowseProps = {
  albumId: string
  state: CollectionAlbumState
  onChange: (state: CollectionAlbumState) => void
  filter?: BrowseFilter
  search?: string
  sortBy?: SectionSortBy
  sortDir?: SectionSortDir
  /** seq → qty pending from postal swaps */
  incoming?: Map<number, number>
  /** Mark first open postal expected line as received */
  onMarkArrived?: (seq: number) => void
}

type SectionView = {
  code: string
  name: string
  stickers: StickerEntry[]
  albumIndex: number
  owned: number
  total: number
  incomingCount: number
  spareCopies: number
  favoriteCount: number
}

function sectionMetrics(
  stickers: StickerEntry[],
  state: CollectionAlbumState,
  incoming: Map<number, number>,
) {
  let owned = 0
  let incomingCount = 0
  let spareCopies = 0
  let favoriteCount = 0
  for (const s of stickers) {
    const seq = Number(s.seq)
    if (copiesOf(state, seq) >= 1) owned += 1
    if (incoming.has(seq)) incomingCount += incoming.get(seq) || 1
    spareCopies += sparesOf(state, seq)
    if (isFavorite(state, seq) && !incoming.has(seq)) favoriteCount += 1
  }
  return { owned, total: stickers.length, incomingCount, spareCopies, favoriteCount }
}

export function AlbumBrowse({
  albumId,
  state,
  onChange,
  filter = 'all',
  search = '',
  sortBy = 'album',
  sortDir = 'asc',
  incoming = new Map(),
  onMarkArrived,
}: AlbumBrowseProps) {
  const indexes = getAlbumIndexes(albumId)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [activeJump, setActiveJump] = useState<string | null>(null)

  const q = search.trim().toLowerCase()

  const visibleSections = useMemo(() => {
    if (!indexes) return [] as SectionView[]
    const rows: SectionView[] = indexes.sections
      .map((sec, albumIndex) => {
        const metrics = sectionMetrics(sec.stickers, state, incoming)
        const stickers = sec.stickers.filter((s) => {
          const isIncoming = incoming.has(Number(s.seq))
          if (filter === 'needs') {
            if (!state.missing.map(Number).includes(Number(s.seq)) || isIncoming) return false
          }
          if (filter === 'favorites') {
            if (!isFavorite(state, s.seq) || isIncoming) return false
          }
          if (filter === 'spares' && sparesOf(state, s.seq) < 1) return false
          if (filter === 'incoming' && !isIncoming) return false
          return stickerMatchesSearch(s, q)
        })
        // Want-soon stickers float to the front within a team/club
        if (filter === 'needs' || filter === 'all' || filter === 'favorites') {
          stickers.sort((a, b) => {
            const fa = isFavorite(state, a.seq) ? 0 : 1
            const fb = isFavorite(state, b.seq) ? 0 : 1
            if (fa !== fb) return fa - fb
            return a.seq - b.seq
          })
        }
        return { ...sec, stickers, albumIndex, ...metrics }
      })
      .filter((sec) => sec.stickers.length > 0)

    const sorted = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      let d = 0
      if (sortBy === 'progress') {
        const pa = a.total ? a.owned / a.total : 0
        const pb = b.total ? b.owned / b.total : 0
        d = pa - pb
      } else if (sortBy === 'incoming') {
        d = a.incomingCount - b.incomingCount
      } else if (sortBy === 'spares') {
        d = a.spareCopies - b.spareCopies
      } else if (sortBy === 'favorites') {
        d = a.favoriteCount - b.favoriteCount
      } else {
        d = a.albumIndex - b.albumIndex
      }
      if (d !== 0) return d * dir
      return a.albumIndex - b.albumIndex
    })
    return sorted
  }, [indexes, state, filter, q, incoming, sortBy, sortDir])

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

  const handleToggleFavorite = (seq: number) => {
    onChange(toggleFavorite(state, seq))
  }

  if (!visibleSections.length) {
    return (
      <p className={styles.empty}>
        {filter === 'incoming'
          ? 'No stickers currently expected in the post. Add expected stickers on a postal swap.'
          : filter === 'favorites'
            ? 'No want-soon stickers yet — star missing stickers you want first.'
            : filter === 'needs'
              ? 'No needs right now — incoming stickers are under Incoming until you own a copy or write them off.'
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
                  <TeamFlag albumId={albumId} code={sec.code} size="sm" preferEmoji />
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
          openSections.has(key) ||
          !!q ||
          filter === 'incoming' ||
          filter === 'needs' ||
          filter === 'favorites' ||
          filter === 'spares'
        const pct = sec.total ? Math.round((100 * sec.owned) / sec.total) : 0
        return (
          <section key={key} id={sectionDomId(key)} className={styles.section}>
            <button type="button" className={styles.sectionHead} onClick={() => toggleSection(key)}>
              <TeamFlag albumId={albumId} code={sec.code} size="md" />
              <span className={styles.sectionTitle}>{sec.name}</span>
              <span className={styles.sectionMeta}>
                {pct}% · {sec.owned}/{sec.total}
                {sec.incomingCount ? ` · ${sec.incomingCount} in` : ''}
                {sec.spareCopies ? ` · ${sec.spareCopies} spare` : ''}
                {' · '}
                {sec.stickers.length} shown
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
                    onToggleFavorite={handleToggleFavorite}
                    compact
                    incoming={incoming.has(Number(s.seq))}
                    onMarkArrived={
                      incoming.has(Number(s.seq)) && onMarkArrived ? onMarkArrived : undefined
                    }
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
