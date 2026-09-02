import type { AlbumIndexes, CollectionAlbumState } from '../lib/types'
import { countsToText } from './parseStickers'
import { sparesToMap } from './storage'

export function stateToPasteText(
  state: CollectionAlbumState,
  indexes: AlbumIndexes,
  excludeNeeds: Set<number> = new Set(),
) {
  const needsMap = new Map<number, number>()
  state.missing.forEach((seq) => {
    if (!excludeNeeds.has(Number(seq))) needsMap.set(seq, 1)
  })
  return {
    needs: countsToText(needsMap, indexes),
    spares: countsToText(sparesToMap(state), indexes),
  }
}

/** Needs for matching: missing, but not pending inbound (WC26). */
export function needsForMatching(
  state: CollectionAlbumState,
  incoming: Set<number>,
): Set<number> {
  return new Set(state.missing.map(Number).filter((seq) => !incoming.has(seq)))
}
