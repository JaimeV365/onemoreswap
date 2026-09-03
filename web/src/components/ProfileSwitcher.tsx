import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useProfiles } from '../lib/ProfileContext'
import styles from './ProfileSwitcher.module.css'

export function ProfileSwitcher() {
  const { user } = useAuth()
  const { profiles, activeProfile, setActiveProfileId, profilesLoading } = useProfiles()

  if (!user) return null

  if (profilesLoading) {
    return <span className={styles.hint}>Profiles…</span>
  }

  if (!profiles.length) {
    return (
      <Link to="/account" className={styles.addLink}>
        Add profile
      </Link>
    )
  }

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>Collecting as</span>
      <select
        className={styles.select}
        value={activeProfile?.id || ''}
        onChange={(e) => setActiveProfileId(e.target.value)}
        aria-label="Switch collector profile"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName}
          </option>
        ))}
      </select>
    </label>
  )
}
