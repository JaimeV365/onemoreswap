import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyTheme,
  initTheme,
  saveThemePref,
  type ThemePref,
  resolveTheme,
  type ResolvedTheme,
} from './theme'

type ThemeContextValue = {
  pref: ThemePref
  resolved: ResolvedTheme
  setPref: (pref: ThemePref) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    if (typeof document !== 'undefined') return initTheme()
    return 'system'
  })

  const setPref = useCallback((next: ThemePref) => {
    saveThemePref(next)
    applyTheme(next)
    setPrefState(next)
  }, [])

  useEffect(() => {
    applyTheme(pref)
    if (pref !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const value = useMemo(
    () => ({
      pref,
      resolved: resolveTheme(pref),
      setPref,
    }),
    [pref, setPref],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
