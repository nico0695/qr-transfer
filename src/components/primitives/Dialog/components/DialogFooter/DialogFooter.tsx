import type { ReactNode } from 'react'
import styles from './DialogFooter.module.css'

export interface DialogFooterProps {
  children: ReactNode
}

export function DialogFooter({ children }: DialogFooterProps) {
  return <div className={styles.footer}>{children}</div>
}
