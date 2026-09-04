import {
  ensureContactsTables,
  maskEmail,
} from '../lib/contacts'
import { error, json, requireUser, type Env } from '../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

/** GET /api/contacts — list connected accounts (masked email + profiles) */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  const missing = await ensureContactsTables(env)
  if (missing) return error(missing, 503)

  try {
    const rows = await env.DB.prepare(
      `SELECT user_low, user_high, created_at
       FROM contacts
       WHERE user_low = ? OR user_high = ?
       ORDER BY created_at DESC`,
    )
      .bind(auth.id, auth.id)
      .all<{ user_low: string; user_high: string; created_at: string }>()

    const contacts = []
    for (const row of rows.results || []) {
      const otherId = row.user_low === auth.id ? row.user_high : row.user_low
      const user = await env.DB.prepare(`SELECT email FROM users WHERE id = ?`)
        .bind(otherId)
        .first<{ email: string }>()
      if (!user) continue
      const profiles = await env.DB.prepare(
        `SELECT id, display_name AS displayName
         FROM profiles WHERE user_id = ?
         ORDER BY created_at ASC`,
      )
        .bind(otherId)
        .all<{ id: string; displayName: string }>()

      contacts.push({
        userId: otherId,
        emailMasked: maskEmail(user.email),
        profiles: profiles.results || [],
        since: row.created_at,
      })
    }

    return json({ contacts })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Contacts tables missing — run schema-migrate-v6-contacts.sql on D1', 503)
    }
    return error('Could not load contacts', 500)
  }
}
