import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Turnstile } from '../components/Turnstile'
import { loginRequest, signupRequest, useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { validateEmail, validatePassword } from '../lib/password'
import styles from './Page.module.css'
import authStyles from './Account.module.css'

type Mode = 'login' | 'signup'

export function Account() {
  const { user, loading, config, refresh, logout } = useAuth()
  const { resolved } = useTheme()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const pwCheck = validatePassword(password)
  const emailErr = email ? validateEmail(email) : null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setOkMsg(null)

    const eErr = validateEmail(email)
    if (eErr) {
      setError(eErr)
      return
    }
    if (mode === 'signup' && !pwCheck.ok) {
      setError(pwCheck.errors[0] || 'Password does not meet the rules')
      return
    }
    if (mode === 'login' && !password) {
      setError('Enter your password')
      return
    }
    if (config?.turnstileRequired && !turnstileToken) {
      setError('Complete the bot check')
      return
    }

    setBusy(true)
    const req = mode === 'signup' ? signupRequest : loginRequest
    const res = await req({
      email,
      password,
      turnstileToken: turnstileToken || '',
    })
    setBusy(false)
    setTurnstileToken('')

    if (res.error) {
      setError(res.error)
      return
    }

    await refresh()
    setOkMsg(mode === 'signup' ? 'Account created' : 'Signed in')
    setPassword('')
    navigate('/settings')
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.lead}>Loading account…</p>
      </main>
    )
  }

  if (user) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Account</h1>
        <p className={styles.lead}>Signed in as <strong>{user.email}</strong></p>
        <section className={styles.panel}>
          <p className={authStyles.hint}>
            Collection sync to the cloud comes next. Your data still lives on this device for now.
          </p>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={async () => {
                await logout()
                setOkMsg('Signed out')
              }}
            >
              Sign out
            </Button>
            <Button variant="ghost" onClick={() => navigate('/settings')}>
              Settings
            </Button>
          </div>
        </section>
      </main>
    )
  }

  if (config && !config.authConfigured) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Account</h1>
        <p className={styles.lead}>
          Sign-in is being set up. Collection, paste, and postal still work on this device.
        </p>
        <p className={styles.notice}>
          <Link to="/">Back to collection</Link>
        </p>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Account</h1>
      <p className={styles.lead}>
        Email and password — stored on One More Swap (hashed). No Google sign-in.
      </p>

      <div className={authStyles.tabs}>
        <button
          type="button"
          className={[authStyles.tab, mode === 'login' ? authStyles.tabActive : ''].join(' ')}
          onClick={() => {
            setMode('login')
            setError(null)
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={[authStyles.tab, mode === 'signup' ? authStyles.tabActive : ''].join(' ')}
          onClick={() => {
            setMode('signup')
            setError(null)
          }}
        >
          Create account
        </button>
      </div>

      <section className={styles.panel}>
        <form className={authStyles.form} onSubmit={onSubmit} autoComplete="on">
          <label className={authStyles.field}>
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              spellCheck={false}
            />
            {emailErr && <span className={authStyles.fieldError}>{emailErr}</span>}
          </label>

          <label className={authStyles.field}>
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 12 : 1}
              maxLength={128}
              spellCheck={false}
            />
          </label>

          {mode === 'signup' && (
            <ul className={authStyles.rules} aria-label="Password requirements">
              {pwCheck.rules.map((r) => (
                <li key={r.id} className={r.met ? authStyles.ruleMet : authStyles.ruleMiss}>
                  {r.met ? '✓' : '·'} {r.label}
                </li>
              ))}
            </ul>
          )}

          {config?.turnstileSiteKey ? (
            <div className={authStyles.turnstile}>
              <Turnstile
                siteKey={config.turnstileSiteKey}
                theme={resolved === 'dark' ? 'dark' : 'light'}
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
              />
            </div>
          ) : null}

          {error && (
            <p className={[styles.notice, styles.noticeError].join(' ')} role="alert">
              {error}
            </p>
          )}
          {okMsg && (
            <p className={[styles.notice, styles.noticeOk].join(' ')}>{okMsg}</p>
          )}

          <div className={styles.actions}>
            <Button type="submit" disabled={busy || (mode === 'signup' && !pwCheck.ok)}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}
