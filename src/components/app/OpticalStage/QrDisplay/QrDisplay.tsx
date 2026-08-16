import type { Ref, ReactNode, RefObject } from 'react'
import { cx } from '../../../../lib/cx'
import { Card } from '../../../primitives/Card'
import { Icon } from '../../../primitives/Icon'
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

export interface QrDisplayProps {
  isEmpty: boolean
  error: boolean
  errorLabel: string
  placeholderLabel: string
  canvasRef: RefObject<HTMLCanvasElement | null>
  caption?: string
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
  loop,
}: QrDisplayProps) {
  return (
    <Card
      radius="stage"
      padding="none"
      className={cx(styles.outer, loop?.fullscreen && styles.outerFullscreen)}
    >
      {loop ? (
        // The <img> stays the first, structurally-stable child across fullscreen toggles —
        // useFrameLoop writes `.src` straight to whatever DOM node its ref currently owns, so
        // unmounting/remounting it here (e.g. by swapping wrapper element types) would race.
        <div className={cx(styles.loop, loop.fullscreen && styles.loopFullscreen)}>
          <img
            ref={loop.imageRef}
            className={cx(styles.loopImage, loop.fullscreen && styles.loopImageFullscreen)}
            alt={loop.frameLabel}
            draggable={false}
          />
          <p className={cx(styles.loopCaption, loop.fullscreen && styles.loopCaptionFullscreen)}>
            {loop.frameLabel}
          </p>
          {!loop.fullscreen && <p className={styles.loopHint}>{loop.hint}</p>}
          {!loop.fullscreen && loop.speedControls}
          {!loop.fullscreen && <div className={styles.loopActions}>{loop.actions}</div>}
          {loop.fullscreen && loop.exitAction}
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
    </Card>
  )
}
