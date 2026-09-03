import {
  error,
  json,
  requireUser,
  type Env,
} from '../lib/http'
import {
  isAgeBand,
  MAX_PROFILES,
  normalizeDisplayName,
  validateDisplayName,
} from '../lib/profiles'

type PagesContext = {
  request: Request
  env: Env
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, display_name AS displayName, age_band AS ageBand, created_at AS createdAt
       FROM profiles WHERE user_id = ? ORDER BY created_at ASC`,
    )
      .bind(auth.id)
      .all<{ id: string; displayName: string; ageBand: string | null; createdAt: string }>()

    return json({ profiles: results || [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Profiles table missing — run schema on D1', 503)
    }
    return error('Could not load profiles', 500)
  }
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  let body: { displayName?: string; ageBand?: string | null }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  const nameErr = validateDisplayName(body.displayName || '')
  if (nameErr) return error(nameErr)
  const displayName = normalizeDisplayName(body.displayName!)

  let ageBand: string | null = null
  if (body.ageBand != null && body.ageBand !== '') {
    if (!isAgeBand(body.ageBand)) return error('Invalid age band')
    ageBand = body.ageBand
  }

  try {
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM profiles WHERE user_id = ?`,
    )
      .bind(auth.id)
      .first<{ n: number }>()
    if ((countRow?.n || 0) >= MAX_PROFILES) {
      return error(`You can add up to ${MAX_PROFILES} profiles on this account`)
    }

    const id = crypto.randomUUID()
    await env.DB.prepare(
      `INSERT INTO profiles (id, user_id, display_name, age_band, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    )
      .bind(id, auth.id, displayName, ageBand)
      .run()

    return json(
      {
        profile: {
          id,
          displayName,
          ageBand,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Profiles table missing — run schema on D1', 503)
    }
    return error('Could not create profile', 500)
  }
}
