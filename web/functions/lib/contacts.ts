import type { Env } from './http'

export function pairUsers(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a }
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return '***'
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const tip = local.slice(0, 1)
  return `${tip}***@${domain}`
}

export async function areContacts(db: D1Database, a: string, b: string): Promise<boolean> {
  if (a === b) return false
  const { low, high } = pairUsers(a, b)
  const row = await db
    .prepare(`SELECT 1 AS ok FROM contacts WHERE user_low = ? AND user_high = ?`)
    .bind(low, high)
    .first<{ ok: number }>()
  return !!row
}

export async function insertContact(db: D1Database, a: string, b: string): Promise<void> {
  const { low, high } = pairUsers(a, b)
  await db
    .prepare(
      `INSERT OR IGNORE INTO contacts (user_low, user_high, created_at) VALUES (?, ?, datetime('now'))`,
    )
    .bind(low, high)
    .run()
}

export function randomInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

export type AlbumStateLike = {
  missing?: unknown
  counts?: Record<string, number>
}

export function needsFromAlbumState(state: AlbumStateLike | null | undefined): number[] {
  if (!state || !Array.isArray(state.missing)) return []
  return state.missing
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
}

export function sparesFromAlbumState(
  state: AlbumStateLike | null | undefined,
): Array<{ seq: number; qty: number }> {
  if (!state?.counts || typeof state.counts !== 'object') return []
  const out: Array<{ seq: number; qty: number }> = []
  for (const [k, total] of Object.entries(state.counts)) {
    const seq = Number(k)
    const qty = Number(total) - 1
    if (!Number.isFinite(seq) || !Number.isFinite(qty) || qty < 1) continue
    out.push({ seq, qty })
  }
  return out.sort((a, b) => a.seq - b.seq)
}

export function computeOverlapLists(
  yourNeeds: number[],
  yourSpares: Array<{ seq: number; qty: number }>,
  theirNeeds: number[],
  theirSpares: Array<{ seq: number; qty: number }>,
) {
  const yourSpareMap = new Map(yourSpares.map((s) => [s.seq, s.qty]))
  const theirSpareMap = new Map(theirSpares.map((s) => [s.seq, s.qty]))
  const theirNeedSet = new Set(theirNeeds)
  const yourNeedSet = new Set(yourNeeds)

  const youCanSend: Array<{ seq: number; qty: number }> = []
  for (const seq of theirNeedSet) {
    const qty = yourSpareMap.get(seq) ?? 0
    if (qty > 0) youCanSend.push({ seq, qty })
  }

  const theyCanSend: Array<{ seq: number; qty: number }> = []
  for (const seq of yourNeedSet) {
    const qty = theirSpareMap.get(seq) ?? 0
    if (qty > 0) theyCanSend.push({ seq, qty })
  }

  youCanSend.sort((a, b) => a.seq - b.seq)
  theyCanSend.sort((a, b) => a.seq - b.seq)
  return { youCanSend, theyCanSend }
}

export async function ensureContactsTables(env: Env): Promise<string | null> {
  try {
    await env.DB.prepare(`SELECT 1 FROM contacts LIMIT 1`).first()
    return null
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return 'Contacts tables missing — run schema-migrate-v6-contacts.sql on D1'
    }
    return 'Could not reach contacts tables'
  }
}
