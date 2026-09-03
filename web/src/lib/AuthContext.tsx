import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AuthUser = { id: string; email: string }

type AuthConfig = {
  turnstileSiteKey: string
  authConfigured: boolean
  turnstileRequired: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  config: AuthConfig | null
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function api<T>(path: string, init?: RequestInit): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = (body as { error?: string }).error
      return {
        error: msg || `Something went wrong (${res.status})`,
        status: res.status,
      }
    }
    return { data: body as T, status: res.status }
  } catch {
    return { error: 'Could not reach the server', status: 0 }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<AuthConfig | null>(null)

  const refresh = useCallback(async () => {
    const cfg = await api<AuthConfig>('/api/auth/config')
    if (cfg.data) setConfig(cfg.data)

    if (cfg.data && !cfg.data.authConfigured) {
      setUser(null)
      setLoading(false)
      return
    }

    const me = await api<{ user: AuthUser | null }>('/api/auth/me')
    setUser(me.data?.user ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST', body: '{}' })
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, config, refresh, logout }),
    [user, loading, config, refresh, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export async function signupRequest(input: {
  email: string
  password: string
  turnstileToken: string
  guardianConfirmed: boolean
  acceptedTerms: boolean
  acceptedPrivacy: boolean
}) {
  return api<{ user: AuthUser; notice?: string }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function loginRequest(input: {
  email: string
  password: string
  turnstileToken: string
}) {
  return api<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
