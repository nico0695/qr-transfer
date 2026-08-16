import type { ReactNode } from 'react'
import styles from './DialogBody.module.css'

export interface DialogBodyProps {
  children: ReactNode
}

export function DialogBody({ children }: DialogBodyProps) {
  return <div className={styles.body}>{children}</div>
}
