import type { RefObject } from 'react'
import { Card } from '../../../primitives/Card'
import { Icon } from '../../../primitives/Icon'
import styles from './QrDisplay.module.css'

export interface QrDisplayProps {
  isEmpty: boolean
  error: boolean
  errorLabel: string
  placeholderLabel: string
  canvasRef: RefObject<HTMLCanvasElement | null>
  caption?: string
}

export function QrDisplay({
  isEmpty,
  error,
  errorLabel,
  placeholderLabel,
  canvasRef,
  caption,
}: QrDisplayProps) {
  return (
    <Card radius="stage" padding="none" className={styles.outer}>
      {isEmpty || error ? (
        <Card dashed radius="card" padding="lg" className={styles.emptyBox}>
          <Icon name="qr-code" size={26} />
          <p className={error ? styles.error : styles.placeholder}>
            {error ? errorLabel : placeholderLabel}
          </p>
        </Card>
      ) : (
        <div className={styles.readyCard}>
          <canvas ref={canvasRef} className={styles.canvas} />
          {caption && <span className={styles.caption}>{caption}</span>}
        </div>
      )}
    </Card>
  )
}
