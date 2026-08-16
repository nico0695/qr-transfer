import type { ReactNode } from 'react'
import styles from './Tabs.module.css'

export interface TabsOption<T extends string> {
  value: T
  label: ReactNode
}

export interface TabsProps<T extends string> {
  options: TabsOption<T>[]
  value: T
  onChange: (value: T) => void
  labelVariant?: boolean
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  labelVariant = false,
}: TabsProps<T>) {
  return (
    <div className={styles.list}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.tab} ${labelVariant ? styles.label : ''}`}
          aria-current={option.value === value ? 'page' : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
