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
  const [guardianConfirmed, setGuardianConfirmed] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const pwCheck = validatePassword(password)
  const emailErr = email ? validateEmail(email) : null

  const resetTurnstile = () => {
    setTurnstileToken('')
    setTurnstileKey((k) => k + 1)
  }

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
    if (mode === 'signup') {
      if (!guardianConfirmed) {
        setError('A parent or guardian (18+) must create this account')
        return
      }
      if (!acceptedTerms || !acceptedPrivacy) {
        setError('Please accept the Terms and Privacy policy')
        return
      }
    }
    if (config?.turnstileRequired && !turnstileToken) {
      setError('Complete the bot check')
      return
    }

    setBusy(true)
    const res =
      mode === 'signup'
        ? await signupRequest({
            email,
            password,
            turnstileToken: turnstileToken || '',
            guardianConfirmed,
            acceptedTerms,
            acceptedPrivacy,
          })
        : await loginRequest({
            email,
            password,
            turnstileToken: turnstileToken || '',
          })
    setBusy(false)
    resetTurnstile()

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
        <p className={styles.lead}>
          Signed in as <strong>{user.email}</strong> (parent / guardian account)
        </p>
        <section className={styles.panel}>
          <p className={authStyles.hint}>
            This login belongs to the adult. Child collector profiles (no separate child password)
            come next, along with email verification and cloud sync.
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
        {mode === 'signup'
          ? 'A parent or guardian creates the account. Kids use profiles under that login — not their own email.'
          : 'Sign in with the parent / guardian email and password.'}
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
            <span>{mode === 'signup' ? 'Parent / guardian email' : 'Email'}</span>
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
            {mode === 'signup' && (
              <span className={authStyles.fieldHint}>
                Use an adult email you can access. This is the primary contact for the account.
              </span>
            )}
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

          {mode === 'signup' && (
            <fieldset className={authStyles.legal}>
              <legend>Adult confirmation</legend>
              <p className={authStyles.legalLead}>
                One More Swap is for families. The account holder must be an adult. Children collect
                under this account later as profiles — they do not create their own login.
              </p>
              <label className={authStyles.check}>
                <input
                  type="checkbox"
                  checked={guardianConfirmed}
                  onChange={(e) => setGuardianConfirmed(e.target.checked)}
                  required
                />
                <span>
                  I confirm I am <strong>18 or over</strong> and the parent or legal guardian creating
                  this account (or an adult creating an account for myself).
                </span>
              </label>
              <label className={authStyles.check}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />
                <span>
                  I accept the <Link to="/terms" target="_blank">Terms</Link>
                </span>
              </label>
              <label className={authStyles.check}>
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  required
                />
                <span>
                  I accept the <Link to="/privacy" target="_blank">Privacy policy</Link>
                </span>
              </label>
            </fieldset>
          )}

          {config?.turnstileSiteKey ? (
            <div className={authStyles.turnstile}>
              <Turnstile
                key={turnstileKey}
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
            <Button
              type="submit"
              disabled={
                busy ||
                (mode === 'signup' &&
                  (!pwCheck.ok || !guardianConfirmed || !acceptedTerms || !acceptedPrivacy))
              }
            >
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create adult account' : 'Sign in'}
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}
