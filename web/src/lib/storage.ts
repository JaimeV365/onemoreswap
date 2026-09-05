import type { CollectionAlbumState, CollectionStore } from './types'
import { notifyLocalDataChanged } from './localDataEvents'
import { scopedStorageKey } from './profileScope'

const STORAGE_BASE = 'onemoreswap-collection-v2'

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
  return { missing: [], counts: {}, favorites: [] }
}

/** Ensure favorites only list currently-missing stickers. */
export function normalizeAlbumState(state: CollectionAlbumState): CollectionAlbumState {
  const missing = [...new Set((state.missing || []).map(Number))].sort((a, b) => a - b)
  const missingSet = new Set(missing)
  const counts: Record<number, number> = {}
  for (const [k, qty] of Object.entries(state.counts || {})) {
    const seq = Number(k)
    const n = Math.floor(Number(qty))
    if (Number.isFinite(seq) && n >= 2) counts[seq] = n
  }
  const favorites = [...new Set((state.favorites || []).map(Number))]
    .filter((seq) => missingSet.has(seq))
    .sort((a, b) => a - b)
  return { missing, counts, favorites }
}

export function isFavorite(state: CollectionAlbumState, seq: number): boolean {
  return (state.favorites || []).some((s) => Number(s) === Number(seq))
}

export function toggleFavorite(state: CollectionAlbumState, seq: number): CollectionAlbumState {
  const n = Number(seq)
  const missing = new Set(state.missing.map(Number))
  if (!missing.has(n)) return normalizeAlbumState(state)
  const set = new Set((state.favorites || []).map(Number))
  if (set.has(n)) set.delete(n)
  else set.add(n)
  return normalizeAlbumState({ ...state, favorites: [...set] })
}

function migrateAlbumV1(old: CollectionAlbumStateV1): CollectionAlbumState {
  const counts: Record<number, number> = {}
  for (const [seq, spareQty] of Object.entries(old.spares)) {
    const n = Number(seq)
    const q = Math.floor(spareQty)
    if (q > 0) counts[n] = q + 1
  }
  return normalizeAlbumState({
    missing: [...old.needs].sort((a, b) => a - b),
    counts,
  })
}

function migrateStore(raw: unknown): CollectionStore {
  if (!raw || typeof raw !== 'object') return { version: 2, albums: {} }
  const data = raw as CollectionStore | CollectionStoreV1
  if (data.version === 2 && data.albums) {
    const albums: Record<string, CollectionAlbumState> = {}
    for (const [id, state] of Object.entries(data.albums)) {
      albums[id] = normalizeAlbumState(state as CollectionAlbumState)
    }
    return { version: 2, albums }
  }

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
    const v2 = localStorage.getItem(scopedStorageKey(STORAGE_BASE))
    if (v2) return migrateStore(JSON.parse(v2))

    // Unscoped legacy (pre-profile) — only for guest key, or as migrate source
    const legacyV2 = localStorage.getItem(STORAGE_BASE)
    if (legacyV2) return migrateStore(JSON.parse(legacyV2))

    const v1 = localStorage.getItem(scopedStorageKey('onemoreswap-collection-v1'))
      || localStorage.getItem('onemoreswap-collection-v1')
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
  localStorage.setItem(scopedStorageKey(STORAGE_BASE), JSON.stringify(store))
  notifyLocalDataChanged()
}

export function getAlbumState(store: CollectionStore, albumId: string): CollectionAlbumState {
  return normalizeAlbumState(store.albums[albumId] ?? emptyAlbumState())
}

export function setAlbumState(
  store: CollectionStore,
  albumId: string,
  state: CollectionAlbumState,
): CollectionStore {
  return {
    version: 2,
    albums: { ...store.albums, [albumId]: normalizeAlbumState(state) },
  }
}

export function isAlbumStarted(state: CollectionAlbumState): boolean {
  return state.missing.length > 0 || Object.keys(state.counts).length > 0
}

export function copiesOf(state: CollectionAlbumState, seq: number): number {
  const missing = new Set(state.missing.map(Number))
  if (missing.has(Number(seq))) return 0
  const counted = state.counts[seq] ?? state.counts[Number(seq) as keyof typeof state.counts]
  if (counted !== undefined) return Number(counted)
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

/** Ensure album is started: everything missing, then owned stickers can be marked in. */
export function startAlbumIfNeeded(
  state: CollectionAlbumState,
  allSeqs: number[],
): CollectionAlbumState {
  if (isAlbumStarted(state) || allSeqs.length === 0) return normalizeAlbumState(state)
  return normalizeAlbumState({
    missing: [...allSeqs].sort((a, b) => a - b),
    counts: {},
    favorites: state.favorites || [],
  })
}

export function setCopies(state: CollectionAlbumState, seq: number, total: number): CollectionAlbumState {
  const n = Math.max(0, Math.floor(total))
  const missing = state.missing.filter((s) => Number(s) !== Number(seq))
  const counts = { ...state.counts }
  let favorites = (state.favorites || []).map(Number)

  if (n <= 0) {
    delete counts[seq]
    if (!missing.some((s) => Number(s) === Number(seq))) missing.push(seq)
    missing.sort((a, b) => a - b)
    return normalizeAlbumState({ missing, counts, favorites })
  }

  // Owned again — drop from priority needs
  favorites = favorites.filter((s) => Number(s) !== Number(seq))

  if (n === 1) {
    delete counts[seq]
  } else {
    counts[seq] = n
  }
  return normalizeAlbumState({ missing, counts, favorites })
}

export function bumpCopies(
  state: CollectionAlbumState,
  seq: number,
  delta: number,
  allSeqs: number[] = [],
): CollectionAlbumState {
  const started = startAlbumIfNeeded(state, allSeqs)
  const cur = copiesOf(started, seq)
  return setCopies(started, seq, cur + delta)
}

export function addParsedCounts(
  state: CollectionAlbumState,
  counts: Map<number, number>,
  allSeqs: number[] = [],
): CollectionAlbumState {
  let next = startAlbumIfNeeded(state, allSeqs)
  for (const [seq, qty] of counts) {
    for (let i = 0; i < qty; i++) {
      next = bumpCopies(next, seq, 1, allSeqs)
    }
  }
  return next
}

/**
 * Treat pasted stickers as the need list; every other sticker in the album is owned.
 * Keeps existing spare copies for stickers that remain owned.
 */
export function applyMissingList(
  allSeqs: number[],
  missingSeqs: Iterable<number>,
  previous: CollectionAlbumState = emptyAlbumState(),
): CollectionAlbumState {
  const allowed = new Set(allSeqs.map(Number))
  const missing = [...new Set([...missingSeqs].map(Number).filter((seq) => allowed.has(seq)))].sort(
    (a, b) => a - b,
  )
  const missingSet = new Set(missing)
  const counts: Record<number, number> = {}
  for (const [k, qty] of Object.entries(previous.counts || {})) {
    const seq = Number(k)
    const n = Math.floor(Number(qty))
    if (!missingSet.has(seq) && allowed.has(seq) && n >= 2) counts[seq] = n
  }
  const favorites = (previous.favorites || [])
    .map(Number)
    .filter((seq) => missingSet.has(seq))
  return normalizeAlbumState({ missing, counts, favorites })
}

export function albumProgress(
  state: CollectionAlbumState,
  total: number,
  allSeqs: number[],
  incoming: Set<number> = new Set(),
) {
  // WC26: pending inbound don't count as "missing" for progress
  const missing = allSeqs.filter(
    (seq) => copiesOf(state, seq) === 0 && !incoming.has(seq),
  ).length
  const pending = allSeqs.filter((seq) => incoming.has(seq) && copiesOf(state, seq) === 0).length
  const inAlbum = allSeqs.filter((seq) => copiesOf(state, seq) > 0).length
  const spareTypes = allSeqs.filter((seq) => sparesOf(state, seq) > 0).length
  const spareCopies = allSeqs.reduce((sum, seq) => sum + sparesOf(state, seq), 0)
  const pct =
    total > 0 && isAlbumStarted(state) ? Math.round((inAlbum / total) * 100) : 0
  return {
    missing,
    pending,
    inAlbum,
    spareTypes,
    spareCopies,
    pct,
    total,
    started: isAlbumStarted(state),
  }
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
