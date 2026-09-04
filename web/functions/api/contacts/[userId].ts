import { areContacts, ensureContactsTables, pairUsers } from '../../lib/contacts'
import { error, json, requireUser, type Env } from '../../lib/http'

type PagesContext = {
  request: Request
  env: Env
  params: { userId: string }
}

/** DELETE /api/contacts/:userId — remove a contact link */
export const onRequestDelete = async (context: PagesContext): Promise<Response> => {
  const { request, env, params } = context
  const auth = await requireUser(request, env)
  if (auth instanceof Response) return auth

  const missing = await ensureContactsTables(env)
  if (missing) return error(missing, 503)

  const otherId = params.userId
  if (!otherId || otherId === auth.id) return error('Invalid contact')

  if (!(await areContacts(env.DB, auth.id, otherId))) {
    return error('Contact not found', 404)
  }

  const { low, high } = pairUsers(auth.id, otherId)
  await env.DB.prepare(`DELETE FROM contacts WHERE user_low = ? AND user_high = ?`)
    .bind(low, high)
    .run()

  return json({ ok: true })
}
