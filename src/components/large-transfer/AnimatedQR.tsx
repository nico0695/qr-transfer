import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStageSlot } from '../app/AppShell'
import { QrDisplay } from '../app/OpticalStage/QrDisplay'
import { Button } from '../primitives/Button'
import { Icon } from '../primitives/Icon'
import { useI18n } from '../../i18n'
import { FRAME_MS_PRESETS } from '../../lib/transfer/config'
import { useFrameLoop } from './useFrameLoop'
import styles from './AnimatedQR.module.css'

interface AnimatedQRProps {
  images: readonly string[]
  frameMs: number
  profileName: string
  onFrameMsChange: (ms: number) => void
  onStop: () => void
}

export function AnimatedQR({
  images,
  frameMs,
  profileName,
  onFrameMsChange,
  onStop,
}: AnimatedQRProps) {
  const t = useI18n()
  const stageNode = useStageSlot()
  const [fullscreen, setFullscreen] = useState(false)
  const total = images.length
  const { index, imageRef } = useFrameLoop(images, frameMs)

  useEffect(() => {
    if (!fullscreen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  const presetIndex = FRAME_MS_PRESETS.indexOf(frameMs as (typeof FRAME_MS_PRESETS)[number])
  const canSlower = presetIndex > 0
  const canFaster = presetIndex >= 0 && presetIndex < FRAME_MS_PRESETS.length - 1

  // The portal's *target* changes with `fullscreen` (stage pane vs document.body). Keeping this
  // as one call site rendering one element tree (rather than two separate createPortal calls for
  // compact vs fullscreen) avoids ever having two <img>s fighting over useFrameLoop's ref — but
  // the container swap can still remount the node React's side, which is why that ref is a
  // callback ref: see useFrameLoop.ts for how a freshly (re)mounted node gets repainted.
  const target = fullscreen ? document.body : stageNode
  if (!target) return null

  return createPortal(
    <QrDisplay
      isEmpty={false}
      error={false}
      errorLabel=""
      placeholderLabel=""
      canvasRef={{ current: null }}
      loop={{
        imageRef,
        frameLabel: `${index + 1} / ${total}`,
        hint: (
          <>
            {profileName} · {t.loopingEvery(frameMs)}
            <br />
            {t.transferHint} {t.brightnessHint}
          </>
        ),
        fullscreen,
        speedControls: (
          <div className={styles.speed}>
            <Button
              variant="secondary"
              size="sm"
              disabled={!canSlower}
              onClick={() => onFrameMsChange(FRAME_MS_PRESETS[presetIndex - 1])}
            >
              {t.slower}
            </Button>
            <span className={styles.speedValue}>{frameMs} ms</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!canFaster}
              onClick={() => onFrameMsChange(FRAME_MS_PRESETS[presetIndex + 1])}
            >
              {t.faster}
            </Button>
          </div>
        ),
        actions: (
          <>
            <Button variant="secondary" size="sm" onClick={() => setFullscreen(true)}>
              <Icon name="maximize" size={14} />
              {t.fullscreen}
            </Button>
            <Button variant="secondary" size="sm" onClick={onStop}>
              {t.stopTransfer}
            </Button>
          </>
        ),
        exitAction: (
          <Button
            variant="secondary"
            size="sm"
            className={styles.exitButton}
            onClick={() => setFullscreen(false)}
          >
            <Icon name="minimize" size={14} />
            {t.exitFullscreen}
          </Button>
        ),
      }}
    />,
    target,
  )
}
