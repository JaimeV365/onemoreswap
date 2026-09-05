import type { CollectionAlbumState, CollectionStore } from './types'
import { importCollectionJson, loadCollection } from './storage'
import type { PostalSwap } from './postalTypes'

/** Shape exported by world-cup-2026-sticker-tracker */
type WcTrackerBackup = {
  version?: number
  album?: string
  missing?: number[]
  counts?: Record<string, number>
  dupes?: number[] | Record<string, number>
  postalSwaps?: unknown[]
}

export function isWcTrackerBackup(data: unknown): data is WcTrackerBackup {
  if (!data || typeof data !== 'object') return false
  const d = data as WcTrackerBackup
  return Array.isArray(d.missing) && (d.album === 'wc2026' || typeof d.version === 'number')
}

export function isOneMoreSwapBackup(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const d = data as { version?: number; albums?: unknown }
  return (d.version === 1 || d.version === 2) && !!d.albums && typeof d.albums === 'object'
}

function normalizeCounts(
  counts: Record<string, number> | undefined,
  dupes: number[] | Record<string, number> | undefined,
): Record<number, number> {
  const out: Record<number, number> = {}

  if (counts && typeof counts === 'object' && !Array.isArray(counts)) {
    for (const [k, c] of Object.entries(counts)) {
      const seq = Number(k)
      const n = Math.floor(Number(c))
      if (seq > 0 && n >= 2) out[seq] = n
    }
    return out
  }

  if (Array.isArray(dupes)) {
    for (const n of dupes) {
      const seq = Number(n)
      if (seq > 0) out[seq] = 2
    }
  } else if (dupes && typeof dupes === 'object') {
    for (const [k, c] of Object.entries(dupes)) {
      const seq = Number(k)
      const n = Math.floor(Number(c))
      if (seq > 0 && n >= 2) out[seq] = n
    }
  }
  return out
}

function normalizePostalLine(raw: unknown): { seq: number; qty: number; status?: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const l = raw as { seq?: number; qty?: number; status?: string }
  const seq = Number(l.seq)
  if (!seq) return null
  return {
    seq,
    qty: Math.max(1, Math.floor(Number(l.qty) || 1)),
    status: l.status,
  }
}

export function importWcTrackerPostal(raw: unknown[]): PostalSwap[] {
  const out: PostalSwap[] = []
  for (const item of raw || []) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    const sent = (Array.isArray(s.sent) ? s.sent : [])
      .map(normalizePostalLine)
      .filter((l): l is NonNullable<typeof l> => !!l)
      .map((l) => ({ seq: l.seq, qty: l.qty }))
    const expected = (Array.isArray(s.expected) ? s.expected : [])
      .map(normalizePostalLine)
      .filter((l): l is NonNullable<typeof l> => !!l)
      .map((l) => ({
        seq: l.seq,
        qty: l.qty,
        status: (l.status === 'received' || l.status === 'written_off'
          ? l.status
          : 'pending') as 'pending' | 'received' | 'written_off',
      }))

    out.push({
      id: String(s.id || crypto.randomUUID()),
      albumId: 'wc2026',
      status: s.status === 'completed' ? 'completed' : 'open',
      person: String(s.person || '').trim() || 'Unknown',
      source: String(s.source || '').trim(),
      notes: String(s.notes || '').trim(),
      postedDate:
        String(s.postedDate || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      createdAt: String(s.createdAt || new Date().toISOString()),
      completedAt: s.completedAt ? String(s.completedAt) : null,
      sent,
      expected,
    })
  }
  return out
}

export function importWcTrackerCollection(data: WcTrackerBackup): CollectionAlbumState {
  const missing = (data.missing || [])
    .map(Number)
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
  const counts = normalizeCounts(data.counts, data.dupes)
  for (const seq of missing) {
    delete counts[seq]
  }
  return { missing, counts, favorites: [] }
}

export type ImportResult = {
  kind: 'onemoreswap' | 'wc-tracker'
  store: CollectionStore
  postal?: PostalSwap[]
  message: string
}

export type BackupPreviewStats = {
  missing: number
  spareTypes: number
  spareExtras: number
  postalTotal: number
  postalOpen: number
  postalCompleted: number
  postalPending: number
}

function albumSpareStats(album: CollectionAlbumState): { types: number; extras: number } {
  let types = 0
  let extras = 0
  for (const qty of Object.values(album.counts || {})) {
    const n = Math.floor(Number(qty))
    if (n >= 2) {
      types += 1
      extras += n - 1
    }
  }
  return { types, extras }
}

function postalStats(swaps: PostalSwap[] | undefined): Pick<
  BackupPreviewStats,
  'postalTotal' | 'postalOpen' | 'postalCompleted' | 'postalPending'
> {
  const list = swaps || []
  let postalPending = 0
  for (const s of list) {
    for (const line of s.expected || []) {
      if (line.status === 'pending') postalPending += Math.max(1, line.qty || 1)
    }
  }
  return {
    postalTotal: list.length,
    postalOpen: list.filter((s) => s.status === 'open').length,
    postalCompleted: list.filter((s) => s.status === 'completed').length,
    postalPending,
  }
}

/** Summarise a parsed backup for the import confirm dialog. */
export function summarizeImport(result: ImportResult): BackupPreviewStats {
  let missing = 0
  let spareTypes = 0
  let spareExtras = 0
  for (const album of Object.values(result.store.albums)) {
    missing += album.missing?.length || 0
    const spare = albumSpareStats(album)
    spareTypes += spare.types
    spareExtras += spare.extras
  }
  return {
    missing,
    spareTypes,
    spareExtras,
    ...postalStats(result.postal),
  }
}

export function importPreviewRows(stats: BackupPreviewStats): Array<{ label: string; value: string }> {
  const rows = [
    { label: 'Missing', value: String(stats.missing) },
    {
      label: 'Spares',
      value: `${stats.spareTypes} types (${stats.spareExtras} extras)`,
    },
  ]
  if (stats.postalTotal > 0) {
    const parts = [`${stats.postalOpen} open`, `${stats.postalCompleted} completed`]
    if (stats.postalPending > 0) parts.push(`${stats.postalPending} still in post`)
    rows.push({
      label: 'Postal swaps',
      value: `${stats.postalTotal} (${parts.join(', ')})`,
    })
  } else {
    rows.push({ label: 'Postal swaps', value: 'none' })
  }
  return rows
}

export function importAnyBackup(raw: string): ImportResult {
  const data = JSON.parse(raw) as unknown

  if (isOneMoreSwapBackup(data)) {
    return {
      kind: 'onemoreswap',
      store: importCollectionJson(raw),
      message: 'One More Swap backup restored.',
    }
  }

  if (isWcTrackerBackup(data)) {
    const album = importWcTrackerCollection(data)
    const existing = loadCollection()
    const store: CollectionStore = {
      version: 2,
      albums: { ...existing.albums, wc2026: album },
    }
    const postal = Array.isArray(data.postalSwaps)
      ? importWcTrackerPostal(data.postalSwaps)
      : undefined
    return {
      kind: 'wc-tracker',
      store,
      postal,
      message: postal?.length
        ? `Imported World Cup tracker collection and ${postal.length} postal swap(s).`
        : 'Imported World Cup tracker collection into World Cup 2026.',
    }
  }

  throw new Error('Unrecognized backup format')
}
