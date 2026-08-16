import * as m from 'motion/react-m'
import type { ReactNode } from 'react'
import { useReducedMotion, withReducedMotion } from '../../../lib/motion/reducedMotion'
import { staggerList } from '../../../lib/motion/presets'
import styles from './SummaryGrid.module.css'

export interface SummaryGridCell {
  key: string
  label: ReactNode
  value: ReactNode
}

export interface SummaryGridProps {
  cells: SummaryGridCell[]
}

export function SummaryGrid({ cells }: SummaryGridProps) {
  const reduced = useReducedMotion()
  const { container, item } = staggerList()
  const containerVariant = withReducedMotion(container, reduced)
  const itemVariant = withReducedMotion(item, reduced)

  return (
    <m.div
      className={styles.grid}
      initial={containerVariant.initial}
      animate={containerVariant.animate}
      transition={containerVariant.transition}
    >
      {cells.map((cell) => (
        <m.div
          className={styles.cell}
          key={cell.key}
          initial={itemVariant.initial}
          animate={itemVariant.animate}
          transition={itemVariant.transition}
        >
          <span className={styles.key}>{cell.label}</span>
          <span className={styles.value}>{cell.value}</span>
        </m.div>
      ))}
    </m.div>
  )
}
