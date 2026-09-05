import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { useProfiles } from './ProfileContext'

const DEVICE_KEY = 'onemoreswap-device-id-v1'
const HEARTBEAT_MS = 20_000

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing && existing.length >= 8) return existing
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `d-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    return `d-ephemeral-${Date.now()}`
  }
}

/**
 * Heartbeats while signed in with an active profile.
 * Returns how many *other* devices recently heartbeated for the same profile.
 */
export function usePresence(): { otherDevices: number } {
  const { user } = useAuth()
  const { activeProfile, hydrating } = useProfiles()
  const [otherDevices, setOtherDevices] = useState(0)
  const profileId = activeProfile?.id

  useEffect(() => {
    if (!user || !profileId || hydrating) {
      setOtherDevices(0)
      return
    }

    const deviceId = getOrCreateDeviceId()
    let cancelled = false

    const beat = async () => {
      try {
        const res = await fetch('/api/presence', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, deviceId }),
        })
        if (!res.ok || cancelled) return
        const body = (await res.json()) as { otherDevices?: number }
        if (!cancelled) setOtherDevices(Math.max(0, Number(body.otherDevices) || 0))
      } catch {
        /* ignore — presence is advisory */
      }
    }

    void beat()
    const timer = window.setInterval(() => {
      void beat()
    }, HEARTBEAT_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void beat()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, profileId, hydrating])

  return { otherDevices }
}
