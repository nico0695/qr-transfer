import type { ReactNode } from 'react'
import styles from './ProgressBar.module.css'

export interface ProgressBarProps {
  value: number
  max?: number
  label?: ReactNode
}

export function ProgressBar({ value, max = 100, label }: ProgressBarProps) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
