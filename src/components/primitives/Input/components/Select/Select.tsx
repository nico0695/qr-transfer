import type { SelectHTMLAttributes } from 'react'
import styles from '../../Input.module.css'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, ...rest }: SelectProps) {
  return <select className={[styles.select, className].filter(Boolean).join(' ')} {...rest} />
}
