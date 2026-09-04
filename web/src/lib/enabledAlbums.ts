import { getAlbum, getAlbumIds } from './catalogue'
import { notifyLocalDataChanged } from './localDataEvents'
import { scopedStorageKey } from './profileScope'
import { getAlbumState, isAlbumStarted, loadCollection } from './storage'

const STORAGE_BASE = 'onemoreswap-albums-v1'

function validIds(ids: string[]): string[] {
  const known = new Set(getAlbumIds())
  return [...new Set(ids.filter((id) => known.has(id)))]
}

/** Albums the user has chosen to track for this profile. */
export function loadEnabledAlbums(): string[] {
  try {
    const raw =
      localStorage.getItem(scopedStorageKey(STORAGE_BASE)) ||
      localStorage.getItem(STORAGE_BASE)
    if (raw) {
      const data = JSON.parse(raw) as unknown
      if (Array.isArray(data)) return validIds(data.map(String))
    }
  } catch {
    /* fall through */
  }

  // One-time migrate: only albums already started in the collection store
  const store = loadCollection()
  const started = Object.keys(store.albums).filter((id) =>
    isAlbumStarted(getAlbumState(store, id)),
  )
  const migrated = validIds(started)
  if (migrated.length) saveEnabledAlbums(migrated)
  return migrated
}

export function saveEnabledAlbums(ids: string[]) {
  localStorage.setItem(scopedStorageKey(STORAGE_BASE), JSON.stringify(validIds(ids)))
  notifyLocalDataChanged()
}

export function enableAlbum(albumId: string): string[] {
  if (!getAlbum(albumId)) return loadEnabledAlbums()
  const next = validIds([...loadEnabledAlbums(), albumId])
  saveEnabledAlbums(next)
  return next
}

export function disableAlbum(albumId: string): string[] {
  const next = loadEnabledAlbums().filter((id) => id !== albumId)
  saveEnabledAlbums(next)
  return next
}

export function albumsAvailableToAdd(enabled: string[]): string[] {
  const set = new Set(enabled)
  return getAlbumIds().filter((id) => !set.has(id))
}
