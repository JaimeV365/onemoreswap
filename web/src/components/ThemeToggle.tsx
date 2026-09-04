import { useTheme } from '../lib/ThemeContext'
import { MoonIcon, SunIcon } from './icons'
import styles from './ThemeToggle.module.css'

type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolved, setPref } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className={[styles.toggle, className].filter(Boolean).join(' ')}
      onClick={() => setPref(next)}
      aria-label={next === 'light' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={next === 'light' ? 'Light mode' : 'Dark mode'}
    >
      {resolved === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  )
}
