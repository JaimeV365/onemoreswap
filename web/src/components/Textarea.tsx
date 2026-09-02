import type { TextareaHTMLAttributes } from 'react'
import styles from './Textarea.module.css'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  hint?: string
}

export function Textarea({ label, hint, className, id, ...props }: TextareaProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <label className={styles.field} htmlFor={fieldId}>
      <span className={styles.label}>{label}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
      <textarea id={fieldId} className={[styles.input, className].filter(Boolean).join(' ')} {...props} />
    </label>
  )
}
