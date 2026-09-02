import type { CollectionAlbumState } from './types'
import { bumpCopies, copiesOf, sparesOf } from './storage'
import { getAlbumIndexes, stickerDisplayLabel } from './catalogue'
import type { PostalSwap } from './postalTypes'
import { linesToMap, loadPostal, pendingIncomingMap } from './postal'

/** Net change in sent quantities (new − old). */
export function sentDelta(
  previous: Array<{ seq: number; qty: number }>,
  next: Array<{ seq: number; qty: number }>,
): Map<number, number> {
  const oldMap = linesToMap(previous)
  const newMap = linesToMap(next)
  const seqs = new Set([...oldMap.keys(), ...newMap.keys()])
  const delta = new Map<number, number>()
  for (const seq of seqs) {
    const d = (newMap.get(seq) || 0) - (oldMap.get(seq) || 0)
    if (d !== 0) delta.set(seq, d)
  }
  return delta
}

/**
 * WC26 rules: you can only post spare copies (not the album copy).
 * Sending 1 when you have +2 (3 copies) → +1 (2 copies).
 * Sending 1 when you have +1 → ✓ (1 copy).
 * Does not restore copies if you remove stickers from the sent list.
 */
export function analyzeSentShortfalls(
  state: CollectionAlbumState,
  deltas: Map<number, number>,
  albumId: string,
): string[] {
  const indexes = getAlbumIndexes(albumId)
  const shortfalls: string[] = []
  for (const [seq, delta] of deltas) {
    if (delta <= 0) continue
    const have = sparesOf(state, seq)
    if (have < delta) {
      const info = indexes?.seqToInfo.get(seq)
      const label = info ? stickerDisplayLabel(info) : `#${seq}`
      if (have <= 0) {
        shortfalls.push(`${label} — no spare to send (only the album copy)`)
      } else {
        shortfalls.push(`${label} — need +${delta} spare, have +${have}`)
      }
    }
  }
  return shortfalls
}

/** Apply positive sent deltas only (match WC26 — no restore on remove). */
export function applySentDeltas(
  state: CollectionAlbumState,
  deltas: Map<number, number>,
  allSeqs: number[] = [],
): CollectionAlbumState {
  let next = state
  for (const [seq, delta] of deltas) {
    if (delta > 0) {
      next = bumpCopies(next, seq, -delta, allSeqs)
    }
  }
  return next
}

/**
 * When stickers become expected/pending, remove from needs (in transit).
 * When a pending expected is removed and you still don't have it, mark need again.
 */
export function syncPendingExpected(
  state: CollectionAlbumState,
  previousPending: Map<number, number>,
  nextPending: Map<number, number>,
): CollectionAlbumState {
  let missing = state.missing.map(Number)
  const counts = { ...state.counts }

  for (const seq of previousPending.keys()) {
    if (!nextPending.has(seq) && copiesOf({ missing, counts }, seq) === 0) {
      if (!missing.includes(seq)) missing.push(seq)
    }
  }
  for (const seq of nextPending.keys()) {
    if (!previousPending.has(seq)) {
      missing = missing.filter((s) => s !== seq)
    }
  }
  missing.sort((a, b) => a - b)
  return { missing, counts }
}

export function pendingMapFromSwap(swap: PostalSwap): Map<number, number> {
  const m = new Map<number, number>()
  for (const line of swap.expected) {
    if (line.status !== 'pending') continue
    m.set(line.seq, (m.get(line.seq) || 0) + line.qty)
  }
  return m
}

/** Pending from all open swaps except one (for editing). */
export function otherPendingMap(albumId: string, excludeSwapId?: string): Map<number, number> {
  const m = new Map<number, number>()
  for (const swap of loadPostal().swaps) {
    if (swap.albumId !== albumId || swap.status !== 'open') continue
    if (excludeSwapId && swap.id === excludeSwapId) continue
    for (const line of swap.expected) {
      if (line.status !== 'pending') continue
      m.set(line.seq, (m.get(line.seq) || 0) + line.qty)
    }
  }
  return m
}

export function describePostalRevert(swap: PostalSwap): string[] {
  const parts: string[] = []
  const sentN = swap.sent.reduce((a, l) => a + l.qty, 0)
  if (sentN) {
    parts.push(
      `Restore ${sentN} sent spare${sentN === 1 ? '' : 's'} to your collection`,
    )
  }
  const pendingN = swap.expected.filter((l) => l.status === 'pending').length
  if (pendingN) {
    parts.push(
      `Put ${pendingN} pending expected sticker${pendingN === 1 ? '' : 's'} back on your need list`,
    )
  }
  const recvN = swap.expected
    .filter((l) => l.status === 'received')
    .reduce((a, l) => a + l.qty, 0)
  if (recvN) {
    parts.push(
      `Remove ${recvN} received cop${recvN === 1 ? 'y' : 'ies'} that this swap added`,
    )
  }
  return parts
}

/** Undo collection effects of a swap (WC26 delete behaviour). */
export function revertPostalSwapEffects(
  state: CollectionAlbumState,
  swap: PostalSwap,
  allSeqs: number[] = [],
): CollectionAlbumState {
  let next = state

  for (const line of swap.sent) {
    next = bumpCopies(next, line.seq, line.qty, allSeqs)
  }

  for (const line of swap.expected) {
    if (line.status === 'pending') {
      const stillPendingElsewhere = otherPendingMap(swap.albumId, swap.id).has(line.seq)
      if (copiesOf(next, line.seq) < 1 && !stillPendingElsewhere) {
        const missing = next.missing.map(Number)
        if (!missing.includes(line.seq)) {
          missing.push(line.seq)
          missing.sort((a, b) => a - b)
          next = { ...next, missing }
        }
      }
    } else if (line.status === 'received') {
      next = bumpCopies(next, line.seq, -line.qty, allSeqs)
    }
  }

  return next
}

/** Write off: put sticker back on the need list (WC26). */
export function writeOffExpected(
  state: CollectionAlbumState,
  seq: number,
): CollectionAlbumState {
  const missing = state.missing.map(Number)
  if (!missing.includes(seq)) {
    missing.push(seq)
    missing.sort((a, b) => a - b)
  }
  return { ...state, missing }
}

export { pendingIncomingMap }
