import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { useProfiles } from './ProfileContext'

const DEVICE_KEY = 'onemoreswap-device-id-v1'
const HEARTBEAT_MS = 15_000
/** After the tab is hidden this long, drop presence so background tabs don't count. */
const HIDDEN_LEAVE_MS = 20_000

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

function postPresence(
  profileId: string,
  deviceId: string,
  leave: boolean,
  keepalive = false,
): Promise<Response> {
  return fetch('/api/presence', {
    method: 'POST',
    credentials: 'include',
    keepalive,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, deviceId, leave }),
  })
}

/**
 * Heartbeats while this tab is visible and signed in.
 * Leaves immediately on close / long background so the multi-device warning clears.
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
    let beatTimer: ReturnType<typeof setInterval> | null = null
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const leave = (keepalive = false) => {
      void postPresence(profileId, deviceId, true, keepalive).catch(() => {})
      if (!cancelled) setOtherDevices(0)
    }

    const beat = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const res = await postPresence(profileId, deviceId, false)
        if (!res.ok || cancelled) return
        const body = (await res.json()) as { otherDevices?: number }
        if (!cancelled) setOtherDevices(Math.max(0, Number(body.otherDevices) || 0))
      } catch {
        /* advisory */
      }
    }

    const startBeating = () => {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      void beat()
      if (beatTimer) clearInterval(beatTimer)
      beatTimer = setInterval(() => {
        void beat()
      }, HEARTBEAT_MS)
    }

    const stopBeating = () => {
      if (beatTimer) {
        clearInterval(beatTimer)
        beatTimer = null
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        startBeating()
        return
      }
      stopBeating()
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        leave(true)
      }, HIDDEN_LEAVE_MS)
    }

    const onPageHide = () => {
      leave(true)
    }

    if (document.visibilityState === 'visible') startBeating()
    else onVisibility()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      cancelled = true
      stopBeating()
      if (hideTimer) clearTimeout(hideTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      // Drop this tab's presence on unmount (profile switch / sign-out)
      void postPresence(profileId, deviceId, true, true).catch(() => {})
    }
  }, [user, profileId, hydrating])

  return { otherDevices }
}
