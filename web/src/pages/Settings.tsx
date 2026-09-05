import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import type { ThemePref } from '../lib/theme'
import styles from './Page.module.css'
import settingsStyles from './Settings.module.css'

const options: { id: ThemePref; label: string; hint: string }[] = [
  { id: 'system', label: 'System', hint: 'Follow your device light/dark setting' },
  { id: 'light', label: 'Light', hint: 'Warm light surfaces' },
  { id: 'dark', label: 'Dark', hint: 'Purple-tinted dark UI' },
]

export function Settings() {
  const { pref, setPref, resolved } = useTheme()
  const { user, loading } = useAuth()

  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>Settings</h1>
      <p className={styles.lead}>Preferences stay on this device. Account is optional.</p>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Account</h2>
        {loading ? (
          <p className={settingsStyles.hint}>Checking sign-in…</p>
        ) : user ? (
          <p className={settingsStyles.hint}>
            Signed in as <strong>{user.email}</strong>.{' '}
            <Link to="/account">Manage account</Link>
          </p>
        ) : (
          <p className={settingsStyles.hint}>
            <Link to="/account">Sign in or create an account</Link> — email and password, no Google.
            Cloud sync for your collection comes next.
          </p>
        )}
      </section>

      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>Appearance</h2>
        <p className={settingsStyles.hint}>
          Currently showing <strong>{resolved}</strong> mode
          {pref === 'system' ? ' (from system)' : ''}.
        </p>
        <div className={settingsStyles.options}>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={[
                settingsStyles.option,
                pref === opt.id ? settingsStyles.active : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setPref(opt.id)}
            >
              <span className={settingsStyles.optionLabel}>{opt.label}</span>
              <span className={settingsStyles.optionHint}>{opt.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.panel} style={{ marginTop: 'var(--space-lg)' }}>
        <h2 className={styles.panelTitle}>Data</h2>
        <p className={settingsStyles.hint}>
          Collection and postal swaps stay on this device until cloud sync is ready. Import World Cup
          tracker backups from Collection → Backup.
        </p>
        <ul className={settingsStyles.links}>
          <li>
            <Link to="/">My collection</Link> — export / import
          </li>
          <li>
            <Link to="/?tab=swap&swap=postal">Postal swaps</Link> — track posts and incoming stickers
            (under Collection → Swap)
          </li>
          <li>
            <Link to="/welcome">Product overview</Link> — how the three tiers work
          </li>
        </ul>
      </section>
    </main>
  )
}
