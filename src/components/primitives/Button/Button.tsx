import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import { Spinner } from '../Spinner'
import styles from './Button.module.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive'
  size?: 'md' | 'sm' | 'icon'
  iconLeft?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  loadingLabel?: string
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  iconLeft,
  iconRight,
  loading = false,
  loadingLabel = 'Loading',
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const classes = cx(
    styles.button,
    styles[size],
    styles[variant],
    loading && styles.loading,
    className,
  )

  return (
    <button type="button" className={classes} disabled={disabled || loading} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
      {loading && (
        <span className={styles.spinnerOverlay}>
          <Spinner size="sm" aria-label={loadingLabel} />
        </span>
      )}
    </button>
  )
}
