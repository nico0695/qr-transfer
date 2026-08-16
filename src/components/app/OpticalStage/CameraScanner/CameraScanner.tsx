import type { CSSProperties } from 'react'
import { cx } from '../../../../lib/cx'
import { Card } from '../../../primitives/Card'
import { Input } from '../../../primitives/Input'
import { Spinner } from '../../../primitives/Spinner'
import { StatusDot } from '../../../primitives/StatusDot'
import styles from './CameraScanner.module.css'

export interface CameraScannerProps {
  regionId: string
  cameras: { id: string; label: string }[]
  selection: string
  onSelectionChange: (value: string) => void
  cameraLabel: string
  cameraDefaultLabel: string
  starting: boolean
  startingLabel: string
  hint: string
  liveLabel: string
  /**
   * Forces a square aspect-ratio on the video viewport — WASM only. Its ROI (`src/lib/scan/roi.ts`)
   * crops a centred square of the video's own native resolution, independent of CSS; a square
   * on-screen viewport is what makes `object-fit: cover`'s own crop match that region, so the
   * guide box actually points at what gets analysed instead of drifting from it. Must stay false
   * for the legacy engine, which derives its crop from `videoWidth / clientWidth` and would have
   * that silently shifted by a forced viewport shape.
   */
  framed?: boolean
  /** Fraction of the (square, when `framed`) viewfinder the guide box should outline. */
  cropRatio?: number
  /** Bump this (e.g. with the accepted-frame count) to replay the hit-flash once per new frame. */
  hitKey?: number
}

export function CameraScanner({
  regionId,
  cameras,
  selection,
  onSelectionChange,
  cameraLabel,
  cameraDefaultLabel,
  starting,
  startingLabel,
  hint,
  liveLabel,
  framed = false,
  cropRatio,
  hitKey,
}: CameraScannerProps) {
  return (
    <Card radius="stage" padding="none" className={styles.outer}>
      {cameras.length > 1 && (
        <Input.Select
          aria-label={cameraLabel}
          className={styles.cameraSelect}
          value={selection}
          onChange={(event) => onSelectionChange(event.target.value)}
        >
          <option value="">{cameraDefaultLabel}</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.label || camera.id}
            </option>
          ))}
        </Input.Select>
      )}
      <div className={styles.viewfinder}>
        {/*
         * `.frame` carries the square-crop sizing (when `framed`) so the overlay/badge that
         * letterbox around the video can share its exact box as plain siblings — see the
         * `.frame` comment in the .module.css for why they aren't DOM children of `.region`.
         */}
        <div
          className={cx(styles.frame, framed && styles.framed)}
          style={
            cropRatio !== undefined
              ? ({ '--scan-crop': `${cropRatio * 100}%` } as CSSProperties)
              : undefined
          }
        >
          <div id={regionId} className={styles.region}>
            {!starting && (
              <div className={styles.guide}>
                <span className={styles.corner} />
                <span className={styles.corner} />
                <span className={styles.corner} />
                <span className={styles.corner} />
                <span className={styles.sweep} />
                {/* Remounted on every accepted frame, restarting the fade — see the analogous
                    comment this replaces in the legacy TransferScanner.tsx markup. */}
                {hitKey !== undefined && hitKey > 0 && <span className={styles.hit} key={hitKey} />}
              </div>
            )}
          </div>
          {starting && (
            <div className={styles.overlay}>
              <Spinner size="md" aria-label={startingLabel} />
              <span>{startingLabel}</span>
            </div>
          )}
          {!starting && (
            <span className={styles.badge}>
              <StatusDot live />
              {liveLabel}
            </span>
          )}
        </div>
      </div>
      <p className={styles.hint}>{hint}</p>
    </Card>
  )
}
