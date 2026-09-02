import styles from './Badge.module.css'

type BadgeProps = {
  children: string
  variant?: 'default' | 'need' | 'spare' | 'match'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return <span className={[styles.badge, styles[variant]].join(' ')}>{children}</span>
}
