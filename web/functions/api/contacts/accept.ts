import {
  areContacts,
  ensureContactsTables,
  insertContact,
  maskEmail,
} from '../../lib/contacts'
import { error, json, requireUser, type Env } from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
}

/** POST /api/contacts/accept { code } — accept an invite and become contacts */
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  const missing = await ensureContactsTables(env)
  if (missing) return error(missing, 503)

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body')
  }

  const code = (body.code || '').trim().toUpperCase()
  if (!code || code.length < 6) return error('Enter a valid invite code')

  try {
    const invite = await env.DB.prepare(
      `SELECT code, from_user_id, expires_at, accepted_at
       FROM contact_invites WHERE code = ?`,
    )
      .bind(code)
      .first<{
        code: string
        from_user_id: string
        expires_at: string
        accepted_at: string | null
      }>()

    if (!invite) return error('Invite not found')
    if (invite.accepted_at) return error('This invite was already used')
    if (Date.parse(invite.expires_at) < Date.now()) return error('This invite has expired')
    if (invite.from_user_id === auth.id) return error('You cannot accept your own invite')

    if (await areContacts(env.DB, auth.id, invite.from_user_id)) {
      await env.DB.prepare(
        `UPDATE contact_invites
         SET accepted_by_user_id = ?, accepted_at = datetime('now')
         WHERE code = ?`,
      )
        .bind(auth.id, code)
        .run()
      return json({ ok: true, alreadyConnected: true })
    }

    await insertContact(env.DB, auth.id, invite.from_user_id)
    await env.DB.prepare(
      `UPDATE contact_invites
       SET accepted_by_user_id = ?, accepted_at = datetime('now')
       WHERE code = ?`,
    )
      .bind(auth.id, code)
      .run()

    const other = await env.DB.prepare(`SELECT email FROM users WHERE id = ?`)
      .bind(invite.from_user_id)
      .first<{ email: string }>()

    return json({
      ok: true,
      contact: {
        userId: invite.from_user_id,
        emailMasked: other ? maskEmail(other.email) : '***',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(msg)) {
      return error('Contacts tables missing — run schema-migrate-v6-contacts.sql on D1', 503)
    }
    return error('Could not accept invite', 500)
  }
}
