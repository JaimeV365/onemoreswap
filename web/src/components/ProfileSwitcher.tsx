import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useProfiles } from '../lib/ProfileContext'
import styles from './ProfileSwitcher.module.css'

function initialOf(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  return [...t][0]!.toUpperCase()
}

export function ProfileSwitcher() {
  const { user } = useAuth()
  const { profiles, activeProfile, setActiveProfileId, profilesLoading } = useProfiles()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  if (profilesLoading) {
    return <span className={styles.hint} aria-hidden />
  }

  if (!profiles.length) {
    return (
      <Link to="/account" className={styles.addLink} title="Add a collector profile">
        <span className={styles.avatar} aria-hidden>
          +
        </span>
        <span className={styles.srOnly}>Add profile</span>
      </Link>
    )
  }

  const label = activeProfile?.displayName || 'Profile'

  return (
    <div className={styles.wrap} ref={rootRef}>
      <button
        type="button"
        className={styles.avatarBtn}
        aria-label={`${label} — switch profile`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar} aria-hidden>
          {initialOf(label)}
        </span>
      </button>

      {open && (
        <div className={styles.menu} id={menuId} role="menu" aria-label="Collector profiles">
          <p className={styles.menuHeading}>Collecting as</p>
          <ul className={styles.list}>
            {profiles.map((p) => {
              const active = p.id === activeProfile?.id
              return (
                <li key={p.id} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={[styles.item, active ? styles.itemActive : ''].filter(Boolean).join(' ')}
                    onClick={() => {
                      setActiveProfileId(p.id)
                      setOpen(false)
                    }}
                  >
                    <span className={styles.itemAvatar} aria-hidden>
                      {initialOf(p.displayName)}
                    </span>
                    <span className={styles.itemName}>{p.displayName}</span>
                    {active && <span className={styles.check} aria-hidden>✓</span>}
                  </button>
                </li>
              )
            })}
          </ul>
          <Link to="/account" className={styles.manage} role="menuitem" onClick={() => setOpen(false)}>
            Manage profiles
          </Link>
        </div>
      )}
    </div>
  )
}
