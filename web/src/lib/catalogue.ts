import type { AlbumCatalogue, AlbumIndexes, AlbumSection, CollectionAlbumState, ShareTab, StickerEntry } from './types'
import wcRaw from '../data/wc2026-catalogue.json'
import plRaw from '../data/pl2526-catalogue.json'
import { copiesOf, sparesOf } from './storage'

const catalogues = [wcRaw, plRaw] as AlbumCatalogue[]

const indexCache = new Map<string, AlbumIndexes>()

function buildSections(stickers: StickerEntry[]): AlbumSection[] {
  const sections: AlbumSection[] = []
  const byKey = new Map<string, AlbumSection>()

  for (const sticker of stickers) {
    const key = `${sticker.code}::${sticker.section}`
    if (!byKey.has(key)) {
      const sec: AlbumSection = { code: sticker.code, name: sticker.section, stickers: [] }
      byKey.set(key, sec)
      sections.push(sec)
    }
    byKey.get(key)!.stickers.push(sticker)
  }
  return sections
}

export function getAlbumIds(): string[] {
  return catalogues.map((c) => c.id)
}

export function getAlbum(id: string): AlbumCatalogue | undefined {
  return catalogues.find((c) => c.id === id)
}

export function getAlbumIndexes(id: string): AlbumIndexes | undefined {
  if (indexCache.has(id)) return indexCache.get(id)

  const catalogue = getAlbum(id)
  if (!catalogue) return undefined

  const codeToSeq = new Map<string, number>()
  const seqToInfo = new Map<number, StickerEntry>()
  const teamCodes = new Set<string>()

  for (const sticker of catalogue.stickers) {
    codeToSeq.set(`${sticker.code}${sticker.cardNum}`, sticker.seq)
    seqToInfo.set(sticker.seq, sticker)
    if (sticker.code.length >= 2 && sticker.code.length <= 4) {
      teamCodes.add(sticker.code)
    }
  }

  const indexes: AlbumIndexes = {
    catalogue,
    codeToSeq,
    seqToInfo,
    teamCodes,
    sections: buildSections(catalogue.stickers),
  }
  indexCache.set(id, indexes)
  return indexes
}

export function formatSticker(sticker: StickerEntry): string {
  return `${sticker.code}${sticker.cardNum}`
}

export function stickerDisplayLabel(sticker: StickerEntry): string {
  return `${sticker.code}${sticker.cardNum} — ${sticker.name}`
}

const SITE_URL = 'https://onemoreswap.pages.dev'

export function buildShareText(
  albumId: string,
  state: CollectionAlbumState,
  tab: ShareTab,
): string {
  const indexes = getAlbumIndexes(albumId)
  if (!indexes) return ''

  const lines: string[] = []

  for (const sec of indexes.sections) {
    const missCards: number[] = []
    const dupeCards: number[] = []

    for (const s of sec.stickers) {
      if (state.missing.includes(s.seq)) missCards.push(s.cardNum)
      if (sparesOf(state, s.seq) >= 1) dupeCards.push(s.cardNum)
    }

    const shareCode = sec.code === 'HIS' ? 'FWC' : sec.code

    if ((tab === 'missing' || tab === 'both') && missCards.length) {
      lines.push(`${shareCode}: ${missCards.join(', ')}`)
    }
    if ((tab === 'spares' || tab === 'both') && dupeCards.length) {
      const prefix = tab === 'both' ? `${shareCode} (spare): ` : `${shareCode}: `
      lines.push(prefix + dupeCards.join(', '))
    }
  }

  if (!lines.length) return '(none)'
  return `${lines.join('\n')}\n\n— via ${SITE_URL}`
}

export function stickerStatusLabel(state: CollectionAlbumState, seq: number): string {
  const c = copiesOf(state, seq)
  if (c <= 0) return 'Need'
  if (c === 1) return 'In album'
  return `+${c - 1} spare`
}
