import type { ReactNode } from 'react'
import { Icon, type IconName } from '../Icon'
import styles from './Feedback.module.css'

const ICON_BY_LEVEL: Record<'notice' | 'error' | 'verified', IconName> = {
  notice: 'alert-triangle',
  error: 'octagon-alert',
  verified: 'shield-check',
}

export interface FeedbackProps {
  level: 'notice' | 'error' | 'verified'
  title: ReactNode
  children?: ReactNode
  actions?: ReactNode
}

export function Feedback({ level, title, children, actions }: FeedbackProps) {
  return (
    <div
      className={`${styles.feedback} ${styles[level]}`}
      role={level === 'error' ? 'alert' : 'status'}
    >
      <Icon name={ICON_BY_LEVEL[level]} size={22} className={styles.icon} />
      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        {children && <div className={styles.text}>{children}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  )
}
