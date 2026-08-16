import type { ReactNode } from 'react'
import { Feedback } from '../../primitives/Feedback'
import styles from './ResultPanel.module.css'

export interface ResultPanelProps {
  title: string
  /** Right-aligned-under-title metadata, e.g. "1.2 KB · text/plain". */
  meta?: ReactNode
  /** Simple case (Quick QR): plain scanned text, rendered as scrollable mono `<pre>`. */
  text?: string
  /** Rich case (Large Transfer): whatever the caller needs — image preview, file row, etc. */
  body?: ReactNode
  actions: ReactNode
}

export function ResultPanel({ title, meta, text, body, actions }: ResultPanelProps) {
  return (
    <Feedback level="verified" title={title} actions={actions}>
      {meta !== undefined && <p className={styles.meta}>{meta}</p>}
      {text !== undefined && <pre className={styles.body}>{text}</pre>}
      {body}
    </Feedback>
  )
}
