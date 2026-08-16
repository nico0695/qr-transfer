import styles from './StatusDot.module.css'

export interface StatusDotProps {
  live?: boolean
  className?: string
}

export function StatusDot({ live = false, className }: StatusDotProps) {
  return (
    <span
      className={[styles.dot, live ? styles.live : '', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  )
}
