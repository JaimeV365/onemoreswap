import type { OverlapResult } from './types'

export function computeOverlap(
  yourNeeds: Set<number>,
  yourSpares: Map<number, number>,
  theirNeeds: Set<number>,
  theirSpares: Map<number, number>,
): OverlapResult {
  const youCanSend: OverlapResult['youCanSend'] = []
  const theyCanSend: OverlapResult['theyCanSend'] = []

  for (const seq of theirNeeds) {
    const spareQty = yourSpares.get(seq) ?? 0
    if (spareQty > 0) youCanSend.push({ seq, qty: spareQty })
  }

  for (const seq of yourNeeds) {
    const spareQty = theirSpares.get(seq) ?? 0
    if (spareQty > 0) theyCanSend.push({ seq, qty: spareQty })
  }

  youCanSend.sort((a, b) => a.seq - b.seq)
  theyCanSend.sort((a, b) => a.seq - b.seq)

  return { youCanSend, theyCanSend }
}

export function countsToSet(counts: Map<number, number>): Set<number> {
  return new Set(counts.keys())
}
