import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { useAuth } from '../lib/AuthContext'
import { validatePassword } from '../lib/password'
import styles from './Page.module.css'
import authStyles from './Account.module.css'

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const pwCheck = validatePassword(password)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError('Missing reset link. Request a new one from the sign-in page.')
      return
    }
    if (!pwCheck.ok) {
      setError(pwCheck.errors[0] || 'Password does not meet the rules')
      return
    }
    setBusy(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError((body as { error?: string }).error || 'Could not reset password')
      return
    }
    setOk(true)
    await refresh()
  }

  if (!token) {
    return (
      <main className={styles.page} id="main-content">
        <h1 className={styles.title}>Reset password</h1>
        <p className={[styles.notice, styles.noticeError].join(' ')}>
          This page needs a valid link from your email.
        </p>
        <div className={styles.actions}>
          <Link to="/forgot-password">
            <Button type="button">Request a new link</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>Choose a new password</h1>
      <p className={styles.lead}>Pick a strong password for the parent / guardian account.</p>

      {ok ? (
        <section className={styles.panel}>
          <p className={[styles.notice, styles.noticeOk].join(' ')}>
            Password updated. You&apos;re signed in on this device. Other devices were signed out.
          </p>
          <div className={styles.actions}>
            <Button type="button" onClick={() => navigate('/account')}>
              Go to account
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/')}>
              Open collection
            </Button>
          </div>
        </section>
      ) : (
        <section className={styles.panel}>
          <form className={authStyles.form} onSubmit={onSubmit}>
            <label className={authStyles.field}>
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                maxLength={128}
                spellCheck={false}
              />
            </label>
            {password ? (
              <ul className={authStyles.rules} aria-label="Password requirements">
                {pwCheck.rules.map((r) => (
                  <li key={r.id} className={r.met ? authStyles.ruleMet : authStyles.ruleMiss}>
                    {r.met ? '✓' : '·'} {r.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {error && (
              <p className={[styles.notice, styles.noticeError].join(' ')} role="alert">
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <Button type="submit" disabled={busy || !pwCheck.ok}>
                {busy ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}
