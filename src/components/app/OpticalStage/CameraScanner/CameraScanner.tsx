import type { CameraDevice } from 'html5-qrcode'
import { Card } from '../../../primitives/Card'
import { Input } from '../../../primitives/Input'
import { Spinner } from '../../../primitives/Spinner'
import { StatusDot } from '../../../primitives/StatusDot'
import styles from './CameraScanner.module.css'

export interface CameraScannerProps {
  regionId: string
  cameras: CameraDevice[]
  selection: string
  onSelectionChange: (value: string) => void
  cameraLabel: string
  cameraDefaultLabel: string
  starting: boolean
  startingLabel: string
  hint: string
  liveLabel: string
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
        <div id={regionId} className={styles.region} />
        {!starting && (
          <div className={styles.guide}>
            <span className={styles.corner} />
            <span className={styles.corner} />
            <span className={styles.corner} />
            <span className={styles.corner} />
            <span className={styles.sweep} />
          </div>
        )}
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
      <p className={styles.hint}>{hint}</p>
    </Card>
  )
}
