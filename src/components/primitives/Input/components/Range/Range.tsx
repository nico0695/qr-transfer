import type { InputHTMLAttributes } from 'react'
import styles from '../../Input.module.css'

export type RangeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function Range({ className, ...rest }: RangeProps) {
  return (
    <input type="range" className={[styles.range, className].filter(Boolean).join(' ')} {...rest} />
  )
}
