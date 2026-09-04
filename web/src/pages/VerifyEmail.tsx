import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { useAuth } from '../lib/AuthContext'
import styles from './Page.module.css'

export function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const { refresh, user } = useAuth()
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working')
  const [message, setMessage] = useState('Confirming your email…')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing confirmation link.')
      return
    }

    // Survive React Strict Mode remount (ref resets; sessionStorage does not)
    const lockKey = `oms-verify-lock:${token}`
    if (sessionStorage.getItem(lockKey)) return
    sessionStorage.setItem(lockKey, '1')

    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const body = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) {
        sessionStorage.removeItem(lockKey)
        setStatus('error')
        setMessage((body as { error?: string }).error || 'Could not confirm email')
        return
      }
      setStatus('ok')
      setMessage('Email confirmed. Thank you.')
      await refresh()
    })()

    return () => {
      cancelled = true
    }
  }, [token, refresh])

  // Duplicate call / refresh: account may already be confirmed
  useEffect(() => {
    if (status === 'error' && user?.emailVerified) {
      setStatus('ok')
      setMessage('Email confirmed. Thank you.')
    }
  }, [status, user?.emailVerified])

  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>Confirm email</h1>
      <p
        className={[
          styles.notice,
          status === 'ok' ? styles.noticeOk : '',
          status === 'error' ? styles.noticeError : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {message}
      </p>
      <div className={styles.actions}>
        <Button type="button" onClick={() => navigate('/account')}>
          Go to Account
        </Button>
        {status === 'error' && (
          <Button type="button" variant="ghost" onClick={() => navigate('/account')}>
            Request a new link
          </Button>
        )}
      </div>
      <p className={styles.lead}>
        <Link to="/">Back to collection</Link>
      </p>
    </main>
  )
}
