import type { AlbumIndexes, CollectionAlbumState } from '../lib/types'
import { countsToText } from './parseStickers'
import { sparesToMap } from './storage'

export function stateToPasteText(state: CollectionAlbumState, indexes: AlbumIndexes) {
  const needsMap = new Map<number, number>()
  state.missing.forEach((seq) => needsMap.set(seq, 1))
  return {
    needs: countsToText(needsMap, indexes),
    spares: countsToText(sparesToMap(state), indexes),
  }
}
