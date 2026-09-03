import { scopedStorageKey } from './profileScope'
import { readLocalSyncBundle } from './cloudSync'

const META_BASE = 'onemoreswap-sync-meta-v1'

export type SyncMeta = {
  fingerprint: string
  updatedAt: string | null
  revision: number
}

export type SyncDirtyState = {
  dirty: boolean
  neverSynced: boolean
  lastPushedAt: string | null
  revision: number
}

function metaKey() {
  return scopedStorageKey(META_BASE)
}

export function localSyncFingerprint(): string {
  return JSON.stringify(readLocalSyncBundle())
}

export function loadSyncMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(metaKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as SyncMeta
    if (!parsed || typeof parsed.fingerprint !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function recordLocalSynced(meta: { updatedAt: string | null; revision: number }) {
  const next: SyncMeta = {
    fingerprint: localSyncFingerprint(),
    updatedAt: meta.updatedAt,
    revision: meta.revision,
  }
  try {
    localStorage.setItem(metaKey(), JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function getSyncDirtyState(): SyncDirtyState {
  const meta = loadSyncMeta()
  const fp = localSyncFingerprint()
  if (!meta) {
    return { dirty: true, neverSynced: true, lastPushedAt: null, revision: 0 }
  }
  return {
    dirty: meta.fingerprint !== fp,
    neverSynced: false,
    lastPushedAt: meta.updatedAt,
    revision: meta.revision,
  }
}

/** True when there is something worth backing up on this profile. */
export function hasLocalSyncableData(): boolean {
  const bundle = readLocalSyncBundle()
  const albums = Object.keys(bundle.collection?.albums || {})
  const hasCollection = albums.some((id) => {
    const a = bundle.collection!.albums[id]!
    return a.missing.length > 0 || Object.keys(a.counts).length > 0
  })
  const hasPostal = (bundle.postal?.swaps.length ?? 0) > 0
  const hasSources = (bundle.sources?.length ?? 0) > 0
  const hasAlbums = (bundle.enabledAlbums?.length ?? 0) > 0
  return hasCollection || hasPostal || hasSources || hasAlbums
}
