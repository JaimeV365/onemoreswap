import type { AlbumCatalogue, AlbumIndexes, AlbumSection, CollectionAlbumState, ShareTab, StickerEntry } from './types'
import wcRaw from '../data/wc2026-catalogue.json'
import plRaw from '../data/pl2526-catalogue.json'
import { copiesOf, sparesOf } from './storage'
import { pendingIncomingMap } from './postal'
import { WC_NATION_ORDER } from './teamFlags'

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

/** Match physical WC26 album order: opening → intro → 24 teams → Coca-Cola → 24 teams → history. */
function orderSections(albumId: string, sections: AlbumSection[]): AlbumSection[] {
  if (albumId !== 'wc2026') {
    return [...sections].sort((a, b) => (a.stickers[0]?.seq ?? 0) - (b.stickers[0]?.seq ?? 0))
  }

  const used = new Set<AlbumSection>()
  const out: AlbumSection[] = []
  const push = (sec: AlbumSection | undefined) => {
    if (!sec || used.has(sec)) return
    used.add(sec)
    out.push(sec)
  }

  const byCodeName = (code: string, nameMatch: RegExp) =>
    sections.find((s) => s.code === code && nameMatch.test(s.name))

  push(byCodeName('00', /./))
  push(byCodeName('FWC', /intro|host/i))
  for (const code of WC_NATION_ORDER.slice(0, 24)) {
    push(sections.find((s) => s.code === code))
  }
  push(byCodeName('CC', /./))
  for (const code of WC_NATION_ORDER.slice(24)) {
    push(sections.find((s) => s.code === code))
  }
  push(byCodeName('FWC', /history/i))

  for (const sec of sections) push(sec)
  return out
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
    sections: orderSections(id, buildSections(catalogue.stickers)),
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
  options?: { favoritesOnly?: boolean },
): string {
  const indexes = getAlbumIndexes(albumId)
  if (!indexes) return '(none)'

  const missing = new Set(state.missing.map(Number))
  const favorites = new Set((state.favorites || []).map(Number))
  const favoritesOnly = Boolean(options?.favoritesOnly)
  const incoming = pendingIncomingMap(albumId)
  const lines: string[] = []

  for (const sec of indexes.sections) {
    const missCards: number[] = []
    const dupeCards: number[] = []

    for (const s of sec.stickers) {
      // Pending inbound: hide from needs share (still tracked as Incoming / postal pending).
      // Ownership wins: if you have a copy, it is never a need — even while mail is pending.
      if (missing.has(Number(s.seq)) && !incoming.has(Number(s.seq))) {
        if (!favoritesOnly || favorites.has(Number(s.seq))) {
          missCards.push(s.cardNum)
        }
      }
      if (sparesOf(state, Number(s.seq)) >= 1) dupeCards.push(s.cardNum)
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

  if (!lines.length) {
    if (!state.missing.length && Object.keys(state.counts).length === 0) {
      return '(none)\n\nTip: use Quick add or Start fresh so needs/spares are tracked.'
    }
    if (tab === 'missing' && favoritesOnly) {
      return '(none)\n\nNo priority needs starred — tap the star on missing stickers you want soon.'
    }
    if (tab === 'missing') return '(none)\n\nNo needs marked — everything you have is in the album.'
    if (tab === 'spares') return '(none)\n\nNo spare copies yet — add a sticker twice to create a spare.'
    if (favoritesOnly && (tab === 'both' || tab === 'missing')) {
      return '(none)\n\nNo priority needs to share yet — star missing stickers first.'
    }
    return '(none)'
  }
  const header =
    favoritesOnly && (tab === 'missing' || tab === 'both')
      ? `Priority needs${tab === 'both' ? ' + spares' : ''}\n`
      : ''
  return `${header}${lines.join('\n')}\n\n— via ${SITE_URL}`
}

export function stickerStatusLabel(state: CollectionAlbumState, seq: number): string {
  const c = copiesOf(state, seq)
  if (c <= 0) return 'Need'
  if (c === 1) return 'In album'
  return `+${c - 1} spare`
}
