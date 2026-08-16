import type { ReactNode } from 'react'
import { Feedback } from '../../primitives/Feedback'
import styles from './ResultPanel.module.css'

export interface ResultPanelProps {
  title: string
  text: string
  actions: ReactNode
}

export function ResultPanel({ title, text, actions }: ResultPanelProps) {
  return (
    <Feedback level="verified" title={title} actions={actions}>
      <pre className={styles.body}>{text}</pre>
    </Feedback>
  )
}
