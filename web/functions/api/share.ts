import { error, json, readCookie, SESSION_COOKIE, userFromSession, type Env } from '../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

const SHARE_DAYS = 90
const MAX_SPARES = 2500
const MAX_NEEDS = 2500

type ShareMode = 'spares' | 'needs' | 'both'

function siteOrigin(request: Request): string {
  const url = new URL(request.url)
  const host = request.headers.get('X-Forwarded-Host') || request.headers.get('Host') || url.host
  const proto = request.headers.get('X-Forwarded-Proto') || url.protocol.replace(':', '') || 'https'
  return `${proto}://${host}`
}

function sanitizePayload(raw: unknown, albumId: string, mode: ShareMode) {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as { spares?: unknown; needs?: unknown }
  const spares: Record<string, number> = {}
  const needs: number[] = []

  if (mode === 'spares' || mode === 'both') {
    const src =
      o.spares && typeof o.spares === 'object' && !Array.isArray(o.spares)
        ? (o.spares as Record<string, unknown>)
        : {}
    for (const [k, v] of Object.entries(src)) {
      const seq = Number(k)
      const qty = Math.floor(Number(v))
      if (!Number.isFinite(seq) || seq < 1 || !Number.isFinite(qty) || qty < 1) continue
      spares[String(seq)] = Math.min(qty, 99)
      if (Object.keys(spares).length >= MAX_SPARES) break
    }
  }

  if (mode === 'needs' || mode === 'both') {
    const arr = Array.isArray(o.needs) ? o.needs : []
    for (const item of arr) {
      const seq = Number(item)
      if (!Number.isFinite(seq) || seq < 1) continue
      needs.push(seq)
      if (needs.length >= MAX_NEEDS) break
    }
  }

  const payload = { v: 1 as const, albumId, spares, needs }
  const has =
    mode === 'spares'
      ? Object.keys(spares).length > 0
      : mode === 'needs'
        ? needs.length > 0
        : Object.keys(spares).length > 0 || needs.length > 0
  if (!has) return null
  return payload
}

/** POST /api/share — create anonymous share link (spares/needs only) */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  if (!env.DB) return error('Share service is not configured yet', 503)

  let body: { albumId?: string; mode?: string; payload?: unknown }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  const albumId = String(body.albumId || '').trim()
  if (albumId !== 'wc2026' && albumId !== 'pl2526') {
    return error('Unknown album')
  }
  const mode = (body.mode || 'spares') as ShareMode
  if (mode !== 'spares' && mode !== 'needs' && mode !== 'both') {
    return error('Invalid share mode')
  }

  const payload = sanitizePayload(body.payload, albumId, mode)
  if (!payload) return error('Share list is empty — add spares or needs first')

  const payloadJson = JSON.stringify(payload)
  if (payloadJson.length > 120_000) return error('Share list is too large')

  const token = [...crypto.getRandomValues(new Uint8Array(18))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const expiresAt = new Date(Date.now() + SHARE_DAYS * 86400 * 1000).toISOString()

  // Owner is optional and never returned on public GET
  const session = await userFromSession(env.DB, readCookie(request, SESSION_COOKIE))
  const ownerId = session?.id ?? null

  try {
    await env.DB.prepare(
      `INSERT INTO share_links (token, album_id, mode, payload_json, owner_user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
    )
      .bind(token, albumId, mode, payloadJson, ownerId, expiresAt)
      .run()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Share tables missing — run schema-migrate-v5-share.sql on D1', 503)
    }
    return error('Could not create share link', 500)
  }

  const url = `${siteOrigin(request)}/s/${token}`
  return json({ ok: true, token, url, expiresAt, mode, albumId })
}
