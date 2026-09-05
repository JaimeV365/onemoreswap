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
  sections: AlbumSection[]
}

export type AlbumSection = {
  code: string
  name: string
  stickers: StickerEntry[]
}

export type ParsedCounts = {
  counts: Map<number, number>
  unknown: string[]
}

export type CollectionAlbumState = {
  missing: number[]
  /** Total copies when ≥ 2. If not missing and absent here → 1 in album. */
  counts: Record<number, number>
  /** Missing stickers marked as priority / “want soon” (subset of missing). */
  favorites?: number[]
}

export type CollectionStore = {
  version: 2
  albums: Record<string, CollectionAlbumState>
}

export type OverlapResult = {
  youCanSend: Array<{ seq: number; qty: number }>
  theyCanSend: Array<{ seq: number; qty: number }>
}

export type ShareTab = 'missing' | 'spares' | 'both'
