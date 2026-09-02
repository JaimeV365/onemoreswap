import styles from './Wordmark.module.css'

type WordmarkProps = {
  className?: string
  size?: 'sm' | 'lg'
}

export function Wordmark({ className, size = 'lg' }: WordmarkProps) {
  return (
    <span
      className={[styles.wordmark, size === 'sm' ? styles.sm : styles.lg, className]
        .filter(Boolean)
        .join(' ')}
    >
      One More Swap
    </span>
  )
}
