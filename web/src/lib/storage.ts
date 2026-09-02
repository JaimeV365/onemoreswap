import type { CollectionAlbumState, CollectionStore } from './types'

const STORAGE_KEY = 'onemoreswap-collection-v1'

export function emptyAlbumState(): CollectionAlbumState {
  return { needs: [], spares: {} }
}

export function loadCollection(): CollectionStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 1, albums: {} }
    const data = JSON.parse(raw) as CollectionStore
    if (data.version !== 1) return { version: 1, albums: {} }
    return data
  } catch {
    return { version: 1, albums: {} }
  }
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
    ...store,
    albums: { ...store.albums, [albumId]: state },
  }
}

export function needsToSet(needs: number[]): Set<number> {
  return new Set(needs)
}

export function sparesToMap(spares: Record<number, number>): Map<number, number> {
  const m = new Map<number, number>()
  for (const [seq, qty] of Object.entries(spares)) {
    const n = Number(seq)
    if (qty > 0) m.set(n, qty)
  }
  return m
}

export function mergeParsedIntoCollection(
  state: CollectionAlbumState,
  needsCounts: Map<number, number>,
  sparesCounts: Map<number, number>,
): CollectionAlbumState {
  const needs = new Set(state.needs)
  for (const seq of needsCounts.keys()) needs.add(seq)

  const spares = { ...state.spares }
  for (const [seq, qty] of sparesCounts) {
    spares[seq] = (spares[seq] ?? 0) + qty
  }

  return {
    needs: [...needs].sort((a, b) => a - b),
    spares,
  }
}

export function exportCollectionJson(store: CollectionStore): string {
  return JSON.stringify(store, null, 2)
}

export function importCollectionJson(raw: string): CollectionStore {
  const data = JSON.parse(raw) as CollectionStore
  if (data.version !== 1 || !data.albums) throw new Error('Invalid backup file')
  return data
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
