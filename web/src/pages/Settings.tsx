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

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
      <p className={styles.lead}>
        Preferences stay on this device. Sign-in and cloud sync come later.
      </p>

      <section className={styles.panel}>
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
    </main>
  )
}
