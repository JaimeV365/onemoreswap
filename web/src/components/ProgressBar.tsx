import styles from './ProgressBar.module.css'

type ProgressBarProps = {
  pct: number
  label: string
}

export function ProgressBar({ pct, label }: ProgressBarProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <span className={styles.pct}>{pct}%</span>
      </div>
      <div className={styles.track} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
