import { error, json, requireUser, type Env } from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
  params: { token: string }
}

/** GET /api/share/:token — public anonymous payload (no owner identity) */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { env, params } = context
  if (!env.DB) return error('Share service is not configured yet', 503)

  const token = String(params.token || '').trim().toLowerCase()
  if (token.length < 24) return error('Invalid or expired link', 404)

  try {
    const row = await env.DB.prepare(
      `SELECT album_id, mode, payload_json, expires_at
       FROM share_links WHERE token = ?`,
    )
      .bind(token)
      .first<{ album_id: string; mode: string; payload_json: string; expires_at: string }>()

    if (!row) return error('Invalid or expired link', 404)
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await env.DB.prepare(`DELETE FROM share_links WHERE token = ?`).bind(token).run()
      return error('This share link has expired', 410)
    }

    let payload: unknown
    try {
      payload = JSON.parse(row.payload_json)
    } catch {
      return error('Share data is corrupted', 500)
    }

    // Explicitly strip any accidental identity fields
    const clean = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
    const safe = {
      v: 1,
      albumId: row.album_id,
      spares:
        clean.spares && typeof clean.spares === 'object' && !Array.isArray(clean.spares)
          ? clean.spares
          : {},
      needs: Array.isArray(clean.needs) ? clean.needs.map(Number).filter((n) => Number.isFinite(n)) : [],
    }

    return json({
      albumId: row.album_id,
      mode: row.mode,
      payload: safe,
      expiresAt: row.expires_at,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Share tables missing — run schema-migrate-v5-share.sql on D1', 503)
    }
    return error('Could not load share link', 500)
  }
}

/** DELETE /api/share/:token — owner only (logged-in creator) */
export const onRequestDelete = async (context: PagesContext): Promise<Response> => {
  const { request, env, params } = context
  if (!env.DB) return error('Share service is not configured yet', 503)

  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  const token = String(params.token || '').trim().toLowerCase()
  if (token.length < 24) return error('Invalid link', 404)

  try {
    const row = await env.DB.prepare(
      `SELECT owner_user_id FROM share_links WHERE token = ?`,
    )
      .bind(token)
      .first<{ owner_user_id: string | null }>()

    if (!row) return error('Link not found', 404)
    if (!row.owner_user_id || row.owner_user_id !== auth.id) {
      return error('Only the creator can remove this link', 403)
    }

    await env.DB.prepare(`DELETE FROM share_links WHERE token = ?`).bind(token).run()
    return json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Share tables missing — run schema-migrate-v5-share.sql on D1', 503)
    }
    return error('Could not remove share link', 500)
  }
}
