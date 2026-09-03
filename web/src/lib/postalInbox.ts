import { getAlbumIndexes, stickerDisplayLabel } from './catalogue'
import { parseStickerInput } from './parseStickers'
import { loadPostal, saveSwap, setExpectedStatus } from './postal'
import type { PostalSwap } from './postalTypes'
import {
  bumpCopies,
  getAlbumState,
  loadCollection,
  saveCollection,
  setAlbumState,
} from './storage'

export type InboxSlotMatch = {
  seq: number
  swapId: string
  person: string
  label: string
}

export type InboxPreview = {
  matched: InboxSlotMatch[]
  unexpected: Array<{ seq: number; qty: number; label: string }>
  extras: Array<{ seq: number; qty: number; label: string }>
  doubleBooked: Array<{ seq: number; label: string; people: string[] }>
  stillMissing: Array<{ seq: number; person: string; swapId: string; label: string }>
  unknown: string[]
  parsed: Array<{ seq: number; qty: number; label: string }>
  applied: boolean
  appliedN: number
  completedNames: string[]
}

function labelFor(albumId: string, seq: number): string {
  const indexes = getAlbumIndexes(albumId)
  const info = indexes?.seqToInfo.get(seq)
  return info ? stickerDisplayLabel(info) : `#${seq}`
}

/** Match a pasted arrival list against open expected lines (FIFO by posted/created date). */
export function analyzePostalInbox(raw: string, albumId: string): InboxPreview {
  const indexes = getAlbumIndexes(albumId)
  if (!indexes) {
    return {
      matched: [],
      unexpected: [],
      extras: [],
      doubleBooked: [],
      stillMissing: [],
      unknown: [],
      parsed: [],
      applied: false,
      appliedN: 0,
      completedNames: [],
    }
  }

  const { counts, unknown } = parseStickerInput(raw, indexes)
  const parsed: InboxPreview['parsed'] = []
  for (const [seq, qty] of counts) {
    parsed.push({ seq, qty, label: labelFor(albumId, seq) })
  }

  type Slot = {
    swap: PostalSwap
    seq: number
    qty: number
    used: number
  }

  const slots: Slot[] = []
  for (const swap of loadPostal().swaps) {
    if (swap.albumId !== albumId || swap.status !== 'open') continue
    for (const line of swap.expected) {
      if (line.status !== 'pending') continue
      slots.push({
        swap,
        seq: line.seq,
        qty: Math.max(1, line.qty || 1),
        used: 0,
      })
    }
  }

  slots.sort(
    (a, b) =>
      String(a.swap.postedDate || '').localeCompare(String(b.swap.postedDate || '')) ||
      String(a.swap.createdAt || '').localeCompare(String(b.swap.createdAt || '')),
  )

  const bySeq = new Map<number, Slot[]>()
  for (const slot of slots) {
    const list = bySeq.get(slot.seq) || []
    list.push(slot)
    bySeq.set(slot.seq, list)
  }

  const matched: InboxSlotMatch[] = []
  const unexpected: InboxPreview['unexpected'] = []
  const extras: InboxPreview['extras'] = []
  const doubleBooked: InboxPreview['doubleBooked'] = []
  const touched = new Set<string>()
  const seenPair = new Set<string>()

  for (const [seq, qty] of counts) {
    const list = bySeq.get(seq) || []
    const people = [...new Set(list.map((s) => s.swap.person || 'swap'))]
    if (people.length > 1) {
      doubleBooked.push({ seq, label: labelFor(albumId, seq), people })
    }
    let left = qty
    for (const slot of list) {
      if (left <= 0) break
      if (slot.used >= slot.qty) continue
      slot.used += 1
      left -= 1
      const pair = `${slot.swap.id}:${slot.seq}`
      if (!seenPair.has(pair)) {
        seenPair.add(pair)
        matched.push({
          seq,
          swapId: slot.swap.id,
          person: slot.swap.person || 'swap',
          label: labelFor(albumId, seq),
        })
      }
      touched.add(slot.swap.id)
    }
    if (!list.length && left > 0) {
      unexpected.push({ seq, qty: left, label: labelFor(albumId, seq) })
    } else if (left > 0) {
      extras.push({ seq, qty: left, label: labelFor(albumId, seq) })
    }
  }

  const stillMissing: InboxPreview['stillMissing'] = []
  for (const slot of slots) {
    if (!touched.has(slot.swap.id)) continue
    if (slot.used >= slot.qty) continue
    stillMissing.push({
      seq: slot.seq,
      person: slot.swap.person || 'swap',
      swapId: slot.swap.id,
      label: labelFor(albumId, slot.seq),
    })
  }

  return {
    matched,
    unexpected,
    extras,
    doubleBooked,
    stillMissing,
    unknown,
    parsed,
    applied: false,
    appliedN: 0,
    completedNames: [],
  }
}

/** Apply inbox matches: mark expected received and bump collection copies. */
export function applyPostalInboxMatches(
  albumId: string,
  matched: InboxSlotMatch[],
): { appliedN: number; completedNames: string[] } {
  const indexes = getAlbumIndexes(albumId)
  const allSeqs = indexes?.catalogue.stickers.map((s) => s.seq) ?? []
  let appliedN = 0
  const completedNames: string[] = []

  for (const m of matched) {
    const storePostal = loadPostal()
    const swap = storePostal.swaps.find((s) => s.id === m.swapId)
    if (!swap || swap.albumId !== albumId) continue
    const line = swap.expected.find((l) => l.seq === m.seq && l.status === 'pending')
    if (!line) continue

    const next = setExpectedStatus(swap, m.seq, 'received')
    saveSwap(next)

    const store = loadCollection()
    const current = getAlbumState(store, albumId)
    saveCollection(setAlbumState(store, albumId, bumpCopies(current, m.seq, line.qty, allSeqs)))
    appliedN += 1
    if (next.status === 'completed') completedNames.push(next.person || 'swap')
  }

  return { appliedN, completedNames: [...new Set(completedNames)] }
}
