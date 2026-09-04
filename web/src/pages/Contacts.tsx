import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlbumPicker } from '../components/AlbumPicker'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StickerList } from '../components/StickerList'
import { useAuth } from '../lib/AuthContext'
import { getAlbum } from '../lib/catalogue'
import { loadEnabledAlbums } from '../lib/enabledAlbums'
import { useProfiles } from '../lib/ProfileContext'
import styles from './Page.module.css'
import contactStyles from './Contacts.module.css'

type ContactRow = {
  userId: string
  emailMasked: string
  profiles: Array<{ id: string; displayName: string }>
  since: string
}

type OverlapPayload = {
  ready?: boolean
  reason?: string
  theirProfileId?: string
  theirDisplayName?: string
  albumId?: string
  youCanSend?: Array<{ seq: number; qty: number }>
  theyCanSend?: Array<{ seq: number; qty: number }>
  yourNeedsCount?: number
  theirNeedsCount?: number
}

async function api<T>(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      error: (body as { error?: string }).error || `Something went wrong (${res.status})`,
    }
  }
  return { data: body as T }
}

export function Contacts() {
  const { user, loading } = useAuth()
  const { activeProfile } = useProfiles()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [invites, setInvites] = useState<Array<{ code: string; expiresAt: string }>>([])
  const [acceptCode, setAcceptCode] = useState(() => (params.get('code') || '').toUpperCase())
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [theirProfileId, setTheirProfileId] = useState('')
  const [albumId, setAlbumId] = useState(() => loadEnabledAlbums()[0] || '')
  const [overlap, setOverlap] = useState<OverlapPayload | null>(null)
  const [removeTarget, setRemoveTarget] = useState<ContactRow | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const selected = useMemo(
    () => contacts.find((c) => c.userId === selectedId) || null,
    [contacts, selectedId],
  )
  const album = getAlbum(albumId)

  const load = useCallback(async () => {
    const [list, inv] = await Promise.all([
      api<{ contacts: ContactRow[] }>('/api/contacts'),
      api<{ invites: Array<{ code: string; expiresAt: string }> }>('/api/contacts/invite'),
    ])
    if (list.error) {
      setError(list.error)
      return
    }
    setError(null)
    setContacts(list.data?.contacts || [])
    if (!inv.error) setInvites(inv.data?.invites || [])
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => {
    const code = params.get('code')
    if (code) setAcceptCode(code.toUpperCase())
  }, [params])

  useEffect(() => {
    if (!selected?.profiles.length) {
      setTheirProfileId('')
      return
    }
    setTheirProfileId((prev) =>
      selected.profiles.some((p) => p.id === prev) ? prev : selected.profiles[0]!.id,
    )
  }, [selected])

  const loadOverlap = useCallback(async () => {
    if (!selectedId || !activeProfile || !albumId) {
      setOverlap(null)
      return
    }
    const q = new URLSearchParams({
      contactUserId: selectedId,
      myProfileId: activeProfile.id,
      albumId,
    })
    if (theirProfileId) q.set('theirProfileId', theirProfileId)
    const res = await api<OverlapPayload>(`/api/contacts/overlap?${q}`)
    if (res.error) {
      setOverlap({ ready: false, reason: res.error })
      return
    }
    setOverlap(res.data || null)
  }, [selectedId, activeProfile, albumId, theirProfileId])

  useEffect(() => {
    if (selectedId) void loadOverlap()
  }, [selectedId, loadOverlap])

  const createInvite = async () => {
    setBusy(true)
    setMessage(null)
    setError(null)
    const res = await api<{ code: string; path: string }>('/api/contacts/invite', {
      method: 'POST',
      body: '{}',
    })
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    const link = `${window.location.origin}${res.data?.path || `/contacts?code=${res.data?.code}`}`
    setInviteLink(link)
    setMessage(`Invite code ${res.data?.code}`)
    try {
      await navigator.clipboard.writeText(link)
      setMessage(`Invite link copied — code ${res.data?.code}`)
    } catch {
      /* ignore */
    }
    await load()
  }

  const acceptInvite = async () => {
    setBusy(true)
    setMessage(null)
    setError(null)
    const res = await api<{ ok: boolean; alreadyConnected?: boolean }>('/api/contacts/accept', {
      method: 'POST',
      body: JSON.stringify({ code: acceptCode }),
    })
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setMessage(res.data?.alreadyConnected ? 'Already connected.' : 'Contact added.')
    setAcceptCode('')
    setParams({}, { replace: true })
    await load()
  }

  const removeContact = async () => {
    if (!removeTarget) return
    setBusy(true)
    const res = await api<{ ok: boolean }>(`/api/contacts/${removeTarget.userId}`, {
      method: 'DELETE',
    })
    setBusy(false)
    setRemoveTarget(null)
    if (res.error) {
      setError(res.error)
      return
    }
    if (selectedId === removeTarget.userId) {
      setSelectedId(null)
      setOverlap(null)
    }
    setMessage('Contact removed')
    await load()
  }

  if (loading) {
    return (
      <main className={styles.page} id="main-content">
        <p className={styles.lead}>Loading…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className={styles.page} id="main-content">
        <Badge>Tier 1 · free</Badge>
        <h1 className={styles.title}>Contacts</h1>
        <p className={styles.lead}>
          Connect with people you already know — school mates, family, WhatsApp groups — and compare
          needs and spares from cloud backups. Face-to-face is fine at your discretion.
        </p>
        <p className={styles.notice}>
          <Link to="/account">Sign in</Link> to create or accept an invite
          {acceptCode ? ` (code ${acceptCode} will be ready after you sign in)` : ''}.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => navigate('/account')}>Go to account</Button>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page} id="main-content">
      <Badge>Tier 1 · contacts · free</Badge>
      <h1 className={styles.title}>Contacts</h1>
      <p className={styles.lead}>
        Invite someone you know. Once connected, compare needs and spares for an album — not full
        collections. Mutual overlaps only.
      </p>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Invite someone</h2>
        <p className={contactStyles.hint}>
          Create a link they open while signed in. Codes expire after 14 days and work once.
        </p>
        <div className={styles.actions}>
          <Button type="button" disabled={busy} onClick={() => void createInvite()}>
            {busy ? 'Working…' : 'Create invite link'}
          </Button>
        </div>
        {inviteLink && (
          <p className={contactStyles.linkBox}>
            <code>{inviteLink}</code>
          </p>
        )}
        {invites.length > 0 && (
          <ul className={contactStyles.inviteList}>
            {invites.map((inv) => (
              <li key={inv.code}>
                <strong>{inv.code}</strong>
                <span>expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>Accept an invite</h2>
        <label className={contactStyles.field}>
          <span>Invite code</span>
          <input
            value={acceptCode}
            onChange={(e) => setAcceptCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABCD2345"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || acceptCode.trim().length < 6}
            onClick={() => void acceptInvite()}
          >
            Accept invite
          </Button>
        </div>
      </section>

      {error && (
        <p className={[styles.notice, styles.noticeError].join(' ')} role="alert">
          {error}
        </p>
      )}
      {message && <p className={[styles.notice, styles.noticeOk].join(' ')}>{message}</p>}

      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>Your network</h2>
        {!contacts.length ? (
          <div className={contactStyles.empty}>
            <p>No contacts yet.</p>
            <p>Create an invite above, or ask a friend for their code.</p>
          </div>
        ) : (
          <ul className={contactStyles.list}>
            {contacts.map((c) => {
              const label =
                c.profiles.map((p) => p.displayName).join(', ') || c.emailMasked
              return (
                <li key={c.userId}>
                  <button
                    type="button"
                    className={[
                      contactStyles.card,
                      selectedId === c.userId ? contactStyles.cardActive : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedId(c.userId)}
                  >
                    <strong>{label}</strong>
                    <span>
                      {c.emailMasked} · since {new Date(c.since).toLocaleDateString()}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRemoveTarget(c)}
                  >
                    Remove
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {selected && (
        <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
          <h2 className={styles.panelTitle}>
            Compare with{' '}
            {selected.profiles.map((p) => p.displayName).join(', ') || selected.emailMasked}
          </h2>
          <p className={contactStyles.hint}>
            Uses cloud backups for your active profile
            {activeProfile ? ` (${activeProfile.displayName})` : ''}. Both of you need to have
            synced this album.
          </p>
          <AlbumPicker value={albumId} onChange={setAlbumId} allowRemove={false} />
          {selected.profiles.length > 1 && (
            <label className={contactStyles.field}>
              <span>Their profile</span>
              <select
                className={contactStyles.select}
                value={theirProfileId}
                onChange={(e) => setTheirProfileId(e.target.value)}
              >
                {selected.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => void loadOverlap()}>
              Refresh overlap
            </Button>
          </div>

          {overlap && !overlap.ready && (
            <p className={styles.notice}>{overlap.reason || 'Not ready yet.'}</p>
          )}

          {overlap?.ready && (
            <div className={styles.twoCol} style={{ marginTop: 'var(--space-lg)' }}>
              <div>
                <h3 className={styles.panelTitle}>
                  You can send them ({overlap.youCanSend?.length ?? 0})
                </h3>
                <StickerList
                  albumId={albumId}
                  items={overlap.youCanSend || []}
                  emptyMessage="No overlap — they don't need your spares."
                  accent={album?.accent}
                />
              </div>
              <div>
                <h3 className={styles.panelTitle}>
                  They can send you ({overlap.theyCanSend?.length ?? 0})
                </h3>
                <StickerList
                  albumId={albumId}
                  items={overlap.theyCanSend || []}
                  emptyMessage="No overlap — you don't need their spares."
                  accent={album?.accent}
                />
              </div>
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove this contact?"
        body="You will no longer see needs/spares overlaps with them. Either of you can invite again later."
        confirmLabel="Remove contact"
        cancelLabel="Keep"
        danger
        onConfirm={() => void removeContact()}
        onCancel={() => setRemoveTarget(null)}
      />
    </main>
  )
}
