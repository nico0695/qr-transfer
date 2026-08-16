import type { Ref, ReactNode, RefObject } from 'react'
import { cx } from '../../../../lib/cx'
import { Card } from '../../../primitives/Card'
import { Icon } from '../../../primitives/Icon'
import { Spinner } from '../../../primitives/Spinner'
import styles from './QrDisplay.module.css'

export interface QrDisplayLoop {
  imageRef: Ref<HTMLImageElement>
  frameLabel: string
  hint: ReactNode
  speedControls: ReactNode
  actions: ReactNode
  fullscreen: boolean
  exitAction: ReactNode
}

export interface QrDisplayPreparing {
  label: string
  action?: ReactNode
}

export interface QrDisplayProps {
  isEmpty: boolean
  error: boolean
  errorLabel: string
  placeholderLabel: string
  canvasRef?: RefObject<HTMLCanvasElement | null>
  caption?: string
  /** Compact payload reminder rendered above the optical content (hidden in fullscreen). */
  header?: ReactNode
  /** Frame-render wait (Large Transfer send) — takes priority over empty/ready/error. */
  preparing?: QrDisplayPreparing
  /** Animated-loop state (Large Transfer send) — takes priority over empty/ready/error. */
  loop?: QrDisplayLoop
}

export function QrDisplay({
  isEmpty,
  error,
  errorLabel,
  placeholderLabel,
  canvasRef,
  caption,
  header,
  preparing,
  loop,
}: QrDisplayProps) {
  const fullscreen = loop?.fullscreen === true

  return (
    <Card
      radius="stage"
      padding="none"
      className={cx(styles.outer, fullscreen && styles.outerFullscreen)}
    >
      {header && !fullscreen && header}
      <div className={styles.main}>
        {loop ? (
          // The <img> stays the first, structurally-stable child across fullscreen toggles —
          // useFrameLoop writes `.src` straight to whatever DOM node its ref currently owns, so
          // unmounting/remounting it here (e.g. by swapping wrapper element types) would race.
          <div className={cx(styles.loop, fullscreen && styles.loopFullscreen)}>
            <img
              ref={loop.imageRef}
              className={cx(styles.loopImage, fullscreen && styles.loopImageFullscreen)}
              alt={loop.frameLabel}
              draggable={false}
            />
            <p className={cx(styles.loopCaption, fullscreen && styles.loopCaptionFullscreen)}>
              {loop.frameLabel}
            </p>
            {!fullscreen && <p className={styles.loopHint}>{loop.hint}</p>}
            {!fullscreen && loop.speedControls}
            {!fullscreen && <div className={styles.loopActions}>{loop.actions}</div>}
            {fullscreen && loop.exitAction}
          </div>
        ) : preparing ? (
          <div className={styles.preparing}>
            <Spinner size="md" aria-label={preparing.label} />
            <p className={styles.preparingLabel}>{preparing.label}</p>
            {preparing.action}
          </div>
        ) : isEmpty || error ? (
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
      </div>
    </Card>
  )
}
