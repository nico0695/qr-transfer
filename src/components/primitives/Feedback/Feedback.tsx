import * as m from 'motion/react-m'
import type { ReactNode } from 'react'
import {
  useReducedMotion,
  withReducedMotion,
  type MotionVariant,
} from '../../../lib/motion/reducedMotion'
import { presence } from '../../../lib/motion/presets'
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
  /** Mount/unmount transition — wrap the call site in `AnimatePresence` for the exit to play. */
  motionPreset?: MotionVariant
}

export function Feedback({ level, title, children, actions, motionPreset }: FeedbackProps) {
  const reduced = useReducedMotion()
  const variant = withReducedMotion(motionPreset ?? presence(), reduced)

  return (
    <m.div
      className={`${styles.feedback} ${styles[level]}`}
      role={level === 'error' ? 'alert' : 'status'}
      initial={variant.initial}
      animate={variant.animate}
      exit={variant.exit}
      transition={variant.transition}
    >
      <Icon name={ICON_BY_LEVEL[level]} size={22} className={styles.icon} />
      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        {children && <div className={styles.text}>{children}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </m.div>
  )
}
