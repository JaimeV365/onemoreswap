import type { CollectionAlbumState, CollectionStore } from './types'

const STORAGE_KEY = 'onemoreswap-collection-v2'

/** Legacy v1 shape */
type CollectionAlbumStateV1 = {
  needs: number[]
  spares: Record<number, number>
}

type CollectionStoreV1 = {
  version: 1
  albums: Record<string, CollectionAlbumStateV1>
}

export function emptyAlbumState(): CollectionAlbumState {
  return { missing: [], counts: {} }
}

function migrateAlbumV1(old: CollectionAlbumStateV1): CollectionAlbumState {
  const counts: Record<number, number> = {}
  for (const [seq, spareQty] of Object.entries(old.spares)) {
    const n = Number(seq)
    const q = Math.floor(spareQty)
    if (q > 0) counts[n] = q + 1
  }
  return {
    missing: [...old.needs].sort((a, b) => a - b),
    counts,
  }
}

function migrateStore(raw: unknown): CollectionStore {
  if (!raw || typeof raw !== 'object') return { version: 2, albums: {} }
  const data = raw as CollectionStore | CollectionStoreV1
  if (data.version === 2 && data.albums) return data as CollectionStore

  if (data.version === 1 && data.albums) {
    const albums: Record<string, CollectionAlbumState> = {}
    for (const [id, state] of Object.entries(data.albums)) {
      albums[id] = migrateAlbumV1(state as CollectionAlbumStateV1)
    }
    return { version: 2, albums }
  }
  return { version: 2, albums: {} }
}

export function loadCollection(): CollectionStore {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY)
    if (v2) return migrateStore(JSON.parse(v2))

    const v1 = localStorage.getItem('onemoreswap-collection-v1')
    if (v1) {
      const migrated = migrateStore(JSON.parse(v1))
      saveCollection(migrated)
      return migrated
    }
  } catch {
    /* fall through */
  }
  return { version: 2, albums: {} }
}

export function saveCollection(store: CollectionStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getAlbumState(store: CollectionStore, albumId: string): CollectionAlbumState {
  return store.albums[albumId] ?? emptyAlbumState()
}

export function setAlbumState(
  store: CollectionStore,
  albumId: string,
  state: CollectionAlbumState,
): CollectionStore {
  return {
    version: 2,
    albums: { ...store.albums, [albumId]: state },
  }
}

export function isAlbumStarted(state: CollectionAlbumState): boolean {
  return state.missing.length > 0 || Object.keys(state.counts).length > 0
}

export function copiesOf(state: CollectionAlbumState, seq: number): number {
  if (state.missing.includes(seq)) return 0
  if (state.counts[seq] !== undefined) return state.counts[seq]
  return isAlbumStarted(state) ? 1 : 0
}

export function sparesOf(state: CollectionAlbumState, seq: number): number {
  return Math.max(0, copiesOf(state, seq) - 1)
}

export function needsToSet(state: CollectionAlbumState): Set<number> {
  return new Set(state.missing)
}

export function sparesToMap(state: CollectionAlbumState): Map<number, number> {
  const m = new Map<number, number>()
  for (const seq of Object.keys(state.counts).map(Number)) {
    const spare = sparesOf(state, seq)
    if (spare > 0) m.set(seq, spare)
  }
  return m
}

/** All swapable spare quantities (including stickers only tracked as duplicates). */
export function allSparesMap(state: CollectionAlbumState, allSeqs: number[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const seq of allSeqs) {
    const spare = sparesOf(state, seq)
    if (spare > 0) m.set(seq, spare)
  }
  for (const seq of Object.keys(state.counts).map(Number)) {
    const spare = sparesOf(state, seq)
    if (spare > 0) m.set(seq, spare)
  }
  return m
}

export function setCopies(state: CollectionAlbumState, seq: number, total: number): CollectionAlbumState {
  const n = Math.max(0, Math.floor(total))
  const missing = state.missing.filter((s) => s !== seq)
  const counts = { ...state.counts }

  if (n <= 0) {
    delete counts[seq]
    if (!missing.includes(seq)) missing.push(seq)
    missing.sort((a, b) => a - b)
    return { missing, counts }
  }

  if (n === 1) {
    delete counts[seq]
  } else {
    counts[seq] = n
  }
  return { missing, counts }
}

export function bumpCopies(state: CollectionAlbumState, seq: number, delta: number): CollectionAlbumState {
  const cur = copiesOf(state, seq)
  return setCopies(state, seq, cur + delta)
}

export function addParsedCounts(
  state: CollectionAlbumState,
  counts: Map<number, number>,
): CollectionAlbumState {
  let next = state
  for (const [seq, qty] of counts) {
    for (let i = 0; i < qty; i++) {
      next = bumpCopies(next, seq, 1)
    }
  }
  return next
}

export function albumProgress(state: CollectionAlbumState, total: number, allSeqs: number[]) {
  const missing = state.missing.length
  const inAlbum = allSeqs.filter((seq) => copiesOf(state, seq) > 0).length
  const spareTypes = allSeqs.filter((seq) => sparesOf(state, seq) > 0).length
  const spareCopies = allSeqs.reduce((sum, seq) => sum + sparesOf(state, seq), 0)
  const pct = total > 0 && isAlbumStarted(state) ? Math.round((inAlbum / total) * 100) : 0
  return { missing, inAlbum, spareTypes, spareCopies, pct, total, started: isAlbumStarted(state) }
}

export function exportCollectionJson(store: CollectionStore): string {
  return JSON.stringify(store, null, 2)
}

export function importCollectionJson(raw: string): CollectionStore {
  return migrateStore(JSON.parse(raw))
}

export function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text)
}
