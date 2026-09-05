import { useEffect, useState } from 'react'

export type DelayedBusyPhase = 'off' | 'show' | 'slow'

/**
 * Avoid flicker: only surface a loading state after `softMs`,
 * then switch to a “still working” message after `slowMs`.
 */
export function useDelayedBusy(
  busy: boolean,
  softMs = 400,
  slowMs = 2500,
): DelayedBusyPhase {
  const [phase, setPhase] = useState<DelayedBusyPhase>('off')

  useEffect(() => {
    if (!busy) {
      setPhase('off')
      return
    }
    setPhase('off')
    const soft = window.setTimeout(() => setPhase('show'), softMs)
    const slow = window.setTimeout(() => setPhase('slow'), slowMs)
    return () => {
      window.clearTimeout(soft)
      window.clearTimeout(slow)
    }
  }, [busy, softMs, slowMs])

  return phase
}

export function delayedBusyLabel(
  phase: DelayedBusyPhase,
  messages: { show: string; slow: string },
): string | null {
  if (phase === 'off') return null
  return phase === 'slow' ? messages.slow : messages.show
}
