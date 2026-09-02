export type StickerEntry = {
  seq: number
  code: string
  cardNum: number
  name: string
  section: string
  foil?: boolean
  pages?: number[] | null
}

export type AlbumAccent = 'wc' | 'pl'

export type AlbumCatalogue = {
  id: string
  name: string
  manufacturer: string
  accent: AlbumAccent
  total: number
  stickers: StickerEntry[]
}

export type AlbumIndexes = {
  catalogue: AlbumCatalogue
  codeToSeq: Map<string, number>
  seqToInfo: Map<number, StickerEntry>
  teamCodes: Set<string>
}

export type ParsedCounts = {
  counts: Map<number, number>
  unknown: string[]
}

export type CollectionAlbumState = {
  needs: number[]
  spares: Record<number, number>
}

export type CollectionStore = {
  version: 1
  albums: Record<string, CollectionAlbumState>
}

export type OverlapResult = {
  youCanSend: Array<{ seq: number; qty: number }>
  theyCanSend: Array<{ seq: number; qty: number }>
}

export type StickerLabel = {
  seq: number
  code: string
  cardNum: number
  name: string
  section: string
  display: string
}
