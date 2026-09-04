import { useMemo, useState } from 'react'
import { getAlbumIndexes } from '../lib/catalogue'
import { copiesOf, bumpCopies, sparesOf } from '../lib/storage'
import { hasSectionMarks, sectionDomId, stickerMatchesSearch } from '../lib/teamFlags'
import type { CollectionAlbumState, StickerEntry } from '../lib/types'
import { StickerChip } from './StickerChip'
import { TeamFlag } from './TeamFlag'
import styles from './AlbumBrowse.module.css'

export type BrowseFilter = 'all' | 'needs' | 'spares' | 'incoming'

export type SectionSort =
  | 'album'
  | 'complete-asc'
  | 'complete-desc'
  | 'incoming-desc'
  | 'incoming-asc'
  | 'spares-desc'
  | 'spares-asc'

type AlbumBrowseProps = {
  albumId: string
  state: CollectionAlbumState
  onChange: (state: CollectionAlbumState) => void
  filter?: BrowseFilter
  search?: string
  sectionSort?: SectionSort
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
}

function sectionMetrics(
  stickers: StickerEntry[],
  state: CollectionAlbumState,
  incoming: Map<number, number>,
) {
  let owned = 0
  let incomingCount = 0
  let spareCopies = 0
  for (const s of stickers) {
    const seq = Number(s.seq)
    if (copiesOf(state, seq) >= 1) owned += 1
    if (incoming.has(seq)) incomingCount += incoming.get(seq) || 1
    spareCopies += sparesOf(state, seq)
  }
  return { owned, total: stickers.length, incomingCount, spareCopies }
}

export function AlbumBrowse({
  albumId,
  state,
  onChange,
  filter = 'all',
  search = '',
  sectionSort = 'album',
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
          if (filter === 'spares' && sparesOf(state, s.seq) < 1) return false
          if (filter === 'incoming' && !isIncoming) return false
          return stickerMatchesSearch(s, q)
        })
        return { ...sec, stickers, albumIndex, ...metrics }
      })
      .filter((sec) => sec.stickers.length > 0)

    const sorted = [...rows]
    sorted.sort((a, b) => {
      if (sectionSort === 'album') return a.albumIndex - b.albumIndex
      if (sectionSort === 'complete-asc' || sectionSort === 'complete-desc') {
        const pa = a.total ? a.owned / a.total : 0
        const pb = b.total ? b.owned / b.total : 0
        const d = pa - pb
        if (d !== 0) return sectionSort === 'complete-asc' ? d : -d
        return a.albumIndex - b.albumIndex
      }
      if (sectionSort === 'incoming-asc' || sectionSort === 'incoming-desc') {
        const d = a.incomingCount - b.incomingCount
        if (d !== 0) return sectionSort === 'incoming-asc' ? d : -d
        return a.albumIndex - b.albumIndex
      }
      if (sectionSort === 'spares-asc' || sectionSort === 'spares-desc') {
        const d = a.spareCopies - b.spareCopies
        if (d !== 0) return sectionSort === 'spares-asc' ? d : -d
        return a.albumIndex - b.albumIndex
      }
      return a.albumIndex - b.albumIndex
    })
    return sorted
  }, [indexes, state, filter, q, incoming, sectionSort])

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
          openSections.has(key) || !!q || filter === 'incoming' || filter === 'needs' || filter === 'spares'
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
