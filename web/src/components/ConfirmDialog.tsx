import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

type ConfirmDialogProps = {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const bodyId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className={styles.backdrop} role="presentation" onClick={onCancel}>
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
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? 'secondary' : 'primary'}
            className={danger ? styles.danger : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
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
