import type { TextareaHTMLAttributes } from 'react'
import { cx } from '../../../../../lib/cx'
import styles from '../../Input.module.css'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea className={cx(styles.textarea, className)} {...rest} />
}
