import type { InputHTMLAttributes } from 'react'
import { cx } from '../../../../../lib/cx'
import styles from '../../Input.module.css'

export type RangeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function Range({ className, ...rest }: RangeProps) {
  return <input type="range" className={cx(styles.range, className)} {...rest} />
}
