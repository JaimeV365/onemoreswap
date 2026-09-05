import { useCallback, useState, type FormEvent } from 'react'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { useProfiles } from '../lib/ProfileContext'
import { AGE_BANDS, MAX_PROFILES, type AgeBandId, type ChildProfile } from '../lib/profiles'
import styles from '../pages/Page.module.css'
import authStyles from '../pages/Account.module.css'

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

function ageLabel(id: string | null) {
  if (!id) return 'Age not set'
  return AGE_BANDS.find((b) => b.id === id)?.label || id
}

export function ProfilesPanel() {
  const {
    profiles,
    profilesLoading,
    refreshProfiles,
    setActiveProfileId,
    activeProfile,
  } = useProfiles()
  const [name, setName] = useState('')
  const [ageBand, setAgeBand] = useState<AgeBandId | ''>('unspecified')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState<AgeBandId | ''>('')
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null)

  const reloadList = useCallback(async () => {
    await refreshProfiles()
  }, [refreshProfiles])

  const onAdd = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)
    const res = await api<{ profile: ChildProfile }>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({
        displayName: name,
        ageBand: ageBand || null,
      }),
    })
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setName('')
    setAgeBand('unspecified')
    setMessage('Profile added')
    await reloadList()
    if (res.data?.profile?.id) setActiveProfileId(res.data.profile.id)
  }

  const onSaveEdit = async (id: string) => {
    setBusy(true)
    setError(null)
    const res = await api<{ profile: ChildProfile }>(`/api/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: editName,
        ageBand: editAge || null,
      }),
    })
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setEditingId(null)
    setMessage('Profile updated')
    await reloadList()
  }

  const onRemove = async (id: string) => {
    setBusy(true)
    const res = await api<{ ok: boolean }>(`/api/profiles/${id}`, { method: 'DELETE' })
    setBusy(false)
    setRemoveTarget(null)
    if (res.error) {
      setError(res.error)
      return
    }
    setMessage('Profile removed')
    await reloadList()
  }

  const loading = profilesLoading && profiles.length === 0

  return (
    <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
      <h2 className={styles.panelTitle}>Collector profiles</h2>
      <p className={authStyles.hint}>
        Each profile has its own sticker collection and postal swaps on this device. Switch profiles
        in the header (“Collecting as”) without signing out. Up to {MAX_PROFILES} profiles.
        {activeProfile ? (
          <>
            {' '}
            Active now: <strong>{activeProfile.displayName}</strong>.
          </>
        ) : null}
      </p>

      {loading ? (
        <p className={authStyles.hint}>Loading profiles…</p>
      ) : profiles.length === 0 ? (
        <p className={authStyles.hint}>No profiles yet — add the first collector below.</p>
      ) : (
        <ul className={authStyles.profileList}>
          {profiles.map((p) => (
            <li key={p.id} className={authStyles.profileItem}>
              {editingId === p.id ? (
                <div className={authStyles.profileEdit}>
                  <label className={authStyles.field}>
                    <span>Display name</span>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={40}
                    />
                  </label>
                  <label className={authStyles.field}>
                    <span>Age band</span>
                    <select
                      className={authStyles.select}
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value as AgeBandId | '')}
                    >
                      {AGE_BANDS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.actions}>
                    <Button type="button" disabled={busy} onClick={() => onSaveEdit(p.id)}>
                      Save
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={authStyles.profileMeta}>
                    <strong>{p.displayName}</strong>
                    <span>{ageLabel(p.ageBand)}</span>
                  </div>
                  <div className={authStyles.profileActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(p.id)
                        setEditName(p.displayName)
                        setEditAge((p.ageBand as AgeBandId) || 'unspecified')
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setRemoveTarget({ id: p.id, label: p.displayName })}
                    >
                      Remove
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {profiles.length < MAX_PROFILES && (
        <form className={authStyles.form} onSubmit={onAdd} style={{ marginTop: 'var(--space-md)' }}>
          <h3 className={authStyles.subheading}>Add profile</h3>
          <label className={authStyles.field}>
            <span>Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={40}
              required
              autoComplete="off"
            />
          </label>
          <label className={authStyles.field}>
            <span>Age band</span>
            <select
              className={authStyles.select}
              value={ageBand}
              onChange={(e) => setAgeBand(e.target.value as AgeBandId | '')}
            >
              {AGE_BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.actions}>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? 'Saving…' : 'Add profile'}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p className={[styles.notice, styles.noticeError].join(' ')} role="alert">
          {error}
        </p>
      )}
      {message && <p className={[styles.notice, styles.noticeOk].join(' ')}>{message}</p>}

      <ConfirmDialog
        open={!!removeTarget}
        title={`Remove profile “${removeTarget?.label || ''}”?`}
        body="Cloud backup for this profile is deleted. Sticker data still on this device stays until you clear it. This cannot be undone."
        confirmLabel="Remove profile"
        cancelLabel="Keep"
        danger
        onConfirm={() => {
          if (removeTarget) void onRemove(removeTarget.id)
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </section>
  )
}
