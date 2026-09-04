import { useId, useState, type ReactNode } from 'react'
import styles from './CollapsibleSection.module.css'

type CollapsibleSectionProps = {
  title: string
  /** Short line under the title when collapsed/expanded */
  hint?: string
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  hint,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const panelId = useId()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <details
      className={[styles.section, className].filter(Boolean).join(' ')}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className={styles.summary}>
        <span className={styles.summaryText}>
          <span className={styles.title}>{title}</span>
          {hint ? <span className={styles.hint}>{hint}</span> : null}
        </span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </summary>
      <div className={styles.body} id={panelId}>
        {children}
      </div>
    </details>
  )
}
