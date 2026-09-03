import { loadPostal, savePostal } from './postal'
import type { PostalStore } from './postalTypes'
import { loadCustomSources } from './sources'
import { scopedStorageKey } from './profileScope'
import { loadCollection, saveCollection } from './storage'
import type { CollectionStore } from './types'

export type SyncPayload = {
  exists: boolean
  profileId: string
  collection: CollectionStore | null
  postal: PostalStore | null
  sources: string[] | null
  updatedAt: string | null
  revision: number
}

async function api<T>(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      error: (body as { error?: string }).error || `Something went wrong (${res.status})`,
    }
  }
  return { data: body as T }
}

export function readLocalSyncBundle() {
  return {
    collection: loadCollection(),
    postal: loadPostal(),
    sources: loadCustomSources(),
  }
}

export async function pullCloudSync(profileId: string) {
  return api<SyncPayload>(`/api/sync?profileId=${encodeURIComponent(profileId)}`)
}

export async function pushCloudSync(profileId: string) {
  const local = readLocalSyncBundle()
  return api<{ ok: boolean; updatedAt: string; revision: number }>('/api/sync', {
    method: 'PUT',
    body: JSON.stringify({
      profileId,
      collection: local.collection,
      postal: local.postal,
      sources: local.sources,
    }),
  })
}

/** Apply cloud payload onto the current profile's localStorage (overwrite). */
export function applyCloudSyncLocally(payload: SyncPayload) {
  if (payload.collection) saveCollection(payload.collection)
  if (payload.postal) savePostal(payload.postal)
  if (payload.sources) {
    localStorage.setItem(
      scopedStorageKey('onemoreswap-sources-v1'),
      JSON.stringify(payload.sources),
    )
  }
}
