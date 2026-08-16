import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import styles from './Chip.module.css'

export interface ChipProps {
  children: ReactNode
  onRemove?: () => void
  removeLabel?: string
}

export function Chip({ children, onRemove, removeLabel }: ChipProps) {
  return (
    <span className={styles.chip}>
      {children}
      {onRemove && (
        <button type="button" className={styles.remove} onClick={onRemove} aria-label={removeLabel}>
          <Icon name="x" size={14} />
        </button>
      )}
    </span>
  )
}
