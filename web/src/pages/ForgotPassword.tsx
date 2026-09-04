import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Turnstile } from '../components/Turnstile'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { validateEmail } from '../lib/password'
import styles from './Page.module.css'
import authStyles from './Account.module.css'

export function ForgotPassword() {
  const { config } = useAuth()
  const { resolved } = useTheme()
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)

  const emailErr = email ? validateEmail(email) : null
  const botOk = !config?.turnstileRequired || !!turnstileToken

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const eErr = validateEmail(email)
    if (eErr) {
      setError(eErr)
      return
    }
    if (config?.turnstileRequired && !turnstileToken) {
      setError('Complete the bot check')
      return
    }
    setBusy(true)
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, turnstileToken: turnstileToken || '' }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    setTurnstileToken('')
    setTurnstileKey((k) => k + 1)
    if (!res.ok) {
      setError((body as { error?: string }).error || 'Could not send reset email')
      return
    }
    setDone(true)
    const url = (body as { resetUrl?: string }).resetUrl
    if (url) setDevResetUrl(url)
  }

  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>Forgot password</h1>
      <p className={styles.lead}>
        Enter the parent / guardian email. If we have an account for it, we&apos;ll send a reset
        link.
      </p>

      {done ? (
        <section className={styles.panel}>
          <p className={[styles.notice, styles.noticeOk].join(' ')}>
            If that email has an account, we sent a reset link. Check your inbox (and spam).
          </p>
          {devResetUrl && (
            <p className={styles.notice}>
              Email isn&apos;t fully configured on the server yet. Use this link:{' '}
              <a href={devResetUrl}>{devResetUrl}</a>
            </p>
          )}
          <div className={styles.actions}>
            <Link to="/account">
              <Button type="button" variant="secondary">
                Back to sign in
              </Button>
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.panel}>
          <form className={authStyles.form} onSubmit={onSubmit}>
            <label className={authStyles.field}>
              <span>Email</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                spellCheck={false}
              />
              {emailErr && <span className={authStyles.fieldError}>{emailErr}</span>}
            </label>

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

            <div className={styles.actions}>
              <Button type="submit" disabled={busy || !!emailErr || !email || !botOk}>
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
              <Link to="/account">
                <Button type="button" variant="ghost">
                  Back to sign in
                </Button>
              </Link>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}
