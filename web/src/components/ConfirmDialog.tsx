import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

type ConfirmDialogProps = {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Single OK button — for errors / notices after an action. */
  alertOnly?: boolean
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  alertOnly = false,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const bodyId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const primaryLabel = confirmLabel || (alertOnly ? 'OK' : 'Confirm')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onCancel, alertOnly])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={alertOnly ? onConfirm : onCancel}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div id={bodyId} className={styles.body}>
          {typeof body === 'string' ? <p className={styles.bodyText}>{body}</p> : body}
        </div>
        <div className={styles.actions}>
          {!alertOnly && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            variant={danger && !alertOnly ? 'secondary' : 'primary'}
            className={danger && !alertOnly ? styles.danger : undefined}
            onClick={onConfirm}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Key/value rows for confirm summaries (backup preview, etc.). */
export function ConfirmStatList({
  rows,
}: {
  rows: Array<{ label: string; value: string }>
}) {
  if (!rows.length) return null
  return (
    <dl className={styles.statList}>
      {rows.map((row) => (
        <div key={row.label} className={styles.statRow}>
          <dt className={styles.statLabel}>{row.label}</dt>
          <dd className={styles.statValue}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
