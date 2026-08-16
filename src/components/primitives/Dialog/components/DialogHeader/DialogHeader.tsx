import type { ReactNode } from 'react'
import { Icon } from '../../../Icon'
import styles from './DialogHeader.module.css'

export interface DialogHeaderProps {
  children: ReactNode
  onClose?: () => void
  closeLabel?: string
}

export function DialogHeader({ children, onClose, closeLabel = 'Close' }: DialogHeaderProps) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{children}</h2>
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose} aria-label={closeLabel}>
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  )
}
