import type { AlbumCatalogue, AlbumIndexes, StickerEntry } from './types'
import wcRaw from '../data/wc2026-catalogue.json'
import plRaw from '../data/pl2526-catalogue.json'

const catalogues = [wcRaw, plRaw] as AlbumCatalogue[]

const indexCache = new Map<string, AlbumIndexes>()

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
