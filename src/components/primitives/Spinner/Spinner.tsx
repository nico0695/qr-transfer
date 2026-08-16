import styles from './Spinner.module.css'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  'aria-label': string
}

export function Spinner({ size = 'md', 'aria-label': ariaLabel }: SpinnerProps) {
  return (
    <span className={`${styles.spinner} ${styles[size]}`} role="status" aria-label={ariaLabel} />
  )
}
