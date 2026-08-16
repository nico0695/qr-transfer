import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import styles from './Card.module.css'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  radius?: 'control' | 'card' | 'stage'
  dashed?: boolean
}

export function Card({
  children,
  padding = 'md',
  radius = 'card',
  dashed = false,
  className,
  ...rest
}: CardProps) {
  const classes = cx(
    styles.card,
    styles[`padding-${padding}`],
    styles[`radius-${radius}`],
    dashed && styles.dashed,
    className,
  )

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
