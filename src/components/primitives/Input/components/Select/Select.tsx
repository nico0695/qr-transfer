import type { SelectHTMLAttributes } from 'react'
import { cx } from '../../../../../lib/cx'
import styles from '../../Input.module.css'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, ...rest }: SelectProps) {
  return <select className={cx(styles.select, className)} {...rest} />
}
