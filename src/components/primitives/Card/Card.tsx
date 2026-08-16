import type { HTMLAttributes, ReactNode } from 'react'
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
  const classes = [
    styles.card,
    styles[`padding-${padding}`],
    styles[`radius-${radius}`],
    dashed ? styles.dashed : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
