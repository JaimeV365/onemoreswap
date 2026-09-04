const EVENT = 'oms-local-data-changed'

/** Fire after any localStorage write that should sync to the cloud. */
export function notifyLocalDataChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENT))
}

export function onLocalDataChanged(handler: () => void): () => void {
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
