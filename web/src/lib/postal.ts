import type { PostalExpectedLine, PostalStore, PostalSwap } from './postalTypes'

const STORAGE_KEY = 'onemoreswap-postal-v1'

export function emptyPostalStore(): PostalStore {
  return { version: 1, swaps: [] }
}

export function loadPostal(): PostalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyPostalStore()
    const data = JSON.parse(raw) as PostalStore
    if (data.version !== 1 || !Array.isArray(data.swaps)) return emptyPostalStore()
    return data
  } catch {
    return emptyPostalStore()
  }
}

export function savePostal(store: PostalStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function upsertPostalSwaps(incoming: PostalSwap[], replace = false): PostalStore {
  const store = loadPostal()
  if (replace) {
    const next = { version: 1 as const, swaps: incoming }
    savePostal(next)
    return next
  }
  const byId = new Map(store.swaps.map((s) => [s.id, s]))
  for (const s of incoming) byId.set(s.id, s)
  const next = { version: 1 as const, swaps: [...byId.values()] }
  savePostal(next)
  return next
}

export function saveSwap(swap: PostalSwap): PostalStore {
  const store = loadPostal()
  const idx = store.swaps.findIndex((s) => s.id === swap.id)
  const swaps = [...store.swaps]
  if (idx >= 0) swaps[idx] = swap
  else swaps.unshift(swap)
  const next = { version: 1 as const, swaps }
  savePostal(next)
  return next
}

export function deleteSwap(id: string): PostalStore {
  const store = loadPostal()
  const next = { version: 1 as const, swaps: store.swaps.filter((s) => s.id !== id) }
  savePostal(next)
  return next
}

export function newSwapId() {
  return crypto.randomUUID()
}

export function swapProgress(swap: PostalSwap) {
  const total = swap.expected.length
  const done = swap.expected.filter((l) => l.status === 'received').length
  const off = swap.expected.filter((l) => l.status === 'written_off').length
  const pending = swap.expected.filter((l) => l.status === 'pending').length
  return { total, done, off, pending }
}

export function maybeCompleteSwap(swap: PostalSwap): PostalSwap {
  if (!swap.expected.length) return swap
  if (swap.expected.every((l) => l.status !== 'pending')) {
    return {
      ...swap,
      status: 'completed',
      completedAt: swap.completedAt || new Date().toISOString(),
    }
  }
  return { ...swap, status: 'open', completedAt: null }
}

export function setExpectedStatus(
  swap: PostalSwap,
  seq: number,
  status: PostalExpectedLine['status'],
): PostalSwap {
  const expected = swap.expected.map((l) => (l.seq === seq ? { ...l, status } : l))
  return maybeCompleteSwap({ ...swap, expected })
}

export const SWAP_SOURCES = ['WhatsApp', 'Facebook', 'Friend', 'Reddit', 'Other'] as const
