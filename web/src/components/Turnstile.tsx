import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

let scriptLoading: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptLoading) return scriptLoading
  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-oms-turnstile]')
    if (existing) {
      window.onTurnstileLoad = () => resolve()
      return
    }
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'
    s.async = true
    s.dataset.omsTurnstile = '1'
    window.onTurnstileLoad = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(s)
  })
  return scriptLoading
}

type TurnstileProps = {
  siteKey: string
  onToken: (token: string) => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
}

export function Turnstile({ siteKey, onToken, onExpire, theme = 'auto' }: TurnstileProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const onExpireRef = useRef(onExpire)
  onTokenRef.current = onToken
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!siteKey || !hostRef.current) return
    let cancelled = false

    loadTurnstile()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) return
        if (widgetId.current) {
          try {
            window.turnstile.remove(widgetId.current)
          } catch {
            /* ignore */
          }
        }
        hostRef.current.innerHTML = ''
        widgetId.current = window.turnstile.render(hostRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onExpireRef.current?.(),
          'error-callback': () => onExpireRef.current?.(),
        })
      })
      .catch(() => {
        /* widget unavailable — form will fail bot check server-side */
      })

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          /* ignore */
        }
        widgetId.current = null
      }
    }
  }, [siteKey, theme])

  if (!siteKey) return null
  return <div ref={hostRef} />
}
