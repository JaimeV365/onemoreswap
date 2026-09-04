import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import {
  changePasswordRequest,
  deleteAccountRequest,
  useAuth,
} from '../lib/AuthContext'
import { validatePassword } from '../lib/password'
import styles from '../pages/Page.module.css'
import authStyles from '../pages/Account.module.css'

export function AccountSecurityPanel() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busyPw, setBusyPw] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwOk, setPwOk] = useState<string | null>(null)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [busyDel, setBusyDel] = useState(false)
  const [delError, setDelError] = useState<string | null>(null)

  const pwCheck = validatePassword(newPassword)
  const canChange =
    !!currentPassword && pwCheck.ok && newPassword !== currentPassword && !busyPw

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwOk(null)
    if (!pwCheck.ok) {
      setPwError(pwCheck.errors?.[0] || 'Password does not meet the rules')
      return
    }
    setBusyPw(true)
    const res = await changePasswordRequest({ currentPassword, newPassword })
    setBusyPw(false)
    if (res.error) {
      setPwError(res.error)
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setPwOk('Password updated. Other devices were signed out.')
  }

  const runDelete = async () => {
    setDelError(null)
    setBusyDel(true)
    const res = await deleteAccountRequest({
      password: deletePassword,
      confirm: deleteConfirm.trim().toUpperCase() === 'DELETE' ? 'DELETE' : deleteConfirm,
    })
    setBusyDel(false)
    if (res.error) {
      setConfirmDeleteOpen(false)
      setDelError(res.error)
      return
    }
    setConfirmDeleteOpen(false)
    await logout()
    navigate('/account')
  }

  return (
    <>
      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>Change password</h2>
        <p className={authStyles.hint}>
          Use a strong password you do not reuse elsewhere. Changing it signs out other devices.
        </p>
        <form className={authStyles.form} onSubmit={onChangePassword}>
          <label className={authStyles.field}>
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className={authStyles.field}>
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          {newPassword ? (
            <ul className={authStyles.rules} aria-label="Password requirements">
              {pwCheck.rules.map((r) => (
                <li key={r.id} className={r.met ? authStyles.ruleMet : authStyles.ruleMiss}>
                  {r.met ? '✓' : '·'} {r.label}
                </li>
              ))}
            </ul>
          ) : null}
          {pwError && (
            <p className={[styles.notice, styles.noticeError].join(' ')} role="alert">
              {pwError}
            </p>
          )}
          {pwOk && <p className={[styles.notice, styles.noticeOk].join(' ')}>{pwOk}</p>}
          <div className={styles.actions}>
            <Button type="submit" disabled={!canChange}>
              {busyPw ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </section>

      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>Delete account</h2>
        <p className={authStyles.hint}>
          Permanently deletes this guardian login, all collector profiles, and cloud backups. Local
          sticker data on this device is not erased automatically. This cannot be undone.
        </p>
        <label className={authStyles.field}>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
        </label>
        <label className={authStyles.field} style={{ marginTop: 'var(--space-md)' }}>
          <span>
            Type <strong>DELETE</strong> to enable
          </span>
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {delError && (
          <p className={[styles.notice, styles.noticeError].join(' ')} role="alert">
            {delError}
          </p>
        )}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="danger"
            disabled={!deletePassword || deleteConfirm.trim().toUpperCase() !== 'DELETE' || busyDel}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete my account
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this account forever?"
        body="All profiles and cloud sync data for this login will be removed. You will be signed out."
        confirmLabel={busyDel ? 'Deleting…' : 'Delete account'}
        cancelLabel="Keep account"
        danger
        onConfirm={() => void runDelete()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  )
}
