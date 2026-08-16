import { StatusDot } from '../../primitives/StatusDot'
import styles from './ContextLabel.module.css'

export interface ContextLabelProps {
  mode: string
  role: string
  constraint?: string
  live?: boolean
}

export function ContextLabel({ mode, role, constraint, live = false }: ContextLabelProps) {
  const text = [mode, role, constraint].filter(Boolean).join(' · ')
  return (
    <p className={styles.label}>
      <StatusDot live={live} />
      {text}
    </p>
  )
}
