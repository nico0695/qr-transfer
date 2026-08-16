import { StatusDot } from '../../primitives/StatusDot'
import styles from './SendingStrip.module.css'

export interface SendingStripProps {
  live?: boolean
  title: string
  meta: string
}

/** Compact, non-editable reminder of what is being sent while the QR loop (or prepare) is up. */
export function SendingStrip({ live = false, title, meta }: SendingStripProps) {
  return (
    <div className={styles.strip}>
      <StatusDot live={live} />
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.meta}>{meta}</p>
      </div>
    </div>
  )
}
