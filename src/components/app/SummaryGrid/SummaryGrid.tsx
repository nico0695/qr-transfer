import type { ReactNode } from 'react'
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
  return (
    <div className={styles.grid}>
      {cells.map((cell) => (
        <div className={styles.cell} key={cell.key}>
          <span className={styles.key}>{cell.label}</span>
          <span className={styles.value}>{cell.value}</span>
        </div>
      ))}
    </div>
  )
}
