import { cx } from '../../../lib/cx'
import styles from './StatusDot.module.css'

export interface StatusDotProps {
  live?: boolean
  className?: string
}

export function StatusDot({ live = false, className }: StatusDotProps) {
  return <span className={cx(styles.dot, live && styles.live, className)} aria-hidden="true" />
}
