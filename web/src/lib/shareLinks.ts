import type { CollectionAlbumState } from './types'
import { getAlbum, getAlbumIndexes } from './catalogue'
import { pendingIncomingMap } from './postal'
import { sparesOf } from './storage'

export type ShareLinkMode = 'spares' | 'needs' | 'both'

export type SharePayload = {
  v: 1
  albumId: string
  /** seq → spare qty (≥1) */
  spares: Record<string, number>
  /** missing sticker seqs (no ownership detail) */
  needs: number[]
}

export function buildSharePayload(
  albumId: string,
  state: CollectionAlbumState,
  mode: ShareLinkMode,
): SharePayload {
  const indexes = getAlbumIndexes(albumId)
  const spares: Record<string, number> = {}
  const needs: number[] = []
  if (!indexes) return { v: 1, albumId, spares, needs }

  const incoming = pendingIncomingMap(albumId)
  const missing = new Set(state.missing.map(Number))

  for (const s of indexes.catalogue.stickers) {
    const seq = Number(s.seq)
    if (mode === 'spares' || mode === 'both') {
      const spare = sparesOf(state, seq)
      if (spare > 0) spares[String(seq)] = spare
    }
    if (mode === 'needs' || mode === 'both') {
      if (missing.has(seq) && !incoming.has(seq)) needs.push(seq)
    }
  }
  needs.sort((a, b) => a - b)
  return { v: 1, albumId, spares, needs }
}

export function sharePayloadHasContent(payload: SharePayload, mode: ShareLinkMode): boolean {
  const hasSpares = Object.keys(payload.spares).length > 0
  const hasNeeds = payload.needs.length > 0
  if (mode === 'spares') return hasSpares
  if (mode === 'needs') return hasNeeds
  return hasSpares || hasNeeds
}

export function sparesMapFromPayload(payload: SharePayload): Map<number, number> {
  const m = new Map<number, number>()
  for (const [k, qty] of Object.entries(payload.spares || {})) {
    const seq = Number(k)
    const n = Math.floor(Number(qty))
    if (Number.isFinite(seq) && n > 0) m.set(seq, n)
  }
  return m
}

export function needsSetFromPayload(payload: SharePayload): Set<number> {
  return new Set((payload.needs || []).map(Number).filter((n) => Number.isFinite(n)))
}

export function socialPostBlurb(albumId: string, mode: ShareLinkMode, url: string): string {
  const album = getAlbum(albumId)
  const name = album?.name || 'sticker album'
  if (mode === 'needs') {
    return `Looking for these ${name} stickers — click to check if your spares match:\n${url}`
  }
  if (mode === 'both') {
    return `My ${name} needs & spares — click to see overlaps with your list:\n${url}`
  }
  return `Got ${name} spares — click to see if they match your needs:\n${url}`
}

export async function createShareLink(input: {
  albumId: string
  mode: ShareLinkMode
  payload: SharePayload
}): Promise<{ data?: { token: string; url: string; expiresAt: string }; error?: string }> {
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { error: (body as { error?: string }).error || `Could not create link (${res.status})` }
    }
    return { data: body as { token: string; url: string; expiresAt: string } }
  } catch {
    return { error: 'Could not reach the server' }
  }
}

export async function fetchShareLink(token: string): Promise<{
  data?: {
    albumId: string
    mode: ShareLinkMode
    payload: SharePayload
    expiresAt: string
  }
  error?: string
}> {
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(token)}`)
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { error: (body as { error?: string }).error || `Link not found (${res.status})` }
    }
    return {
      data: body as {
        albumId: string
        mode: ShareLinkMode
        payload: SharePayload
        expiresAt: string
      },
    }
  } catch {
    return { error: 'Could not reach the server' }
  }
}
