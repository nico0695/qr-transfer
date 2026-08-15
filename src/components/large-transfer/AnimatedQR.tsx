import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { FRAME_MS_PRESETS } from '../../lib/transfer/config'

interface AnimatedQRProps {
  images: readonly string[]
  frameMs: number
  onFrameMsChange: (ms: number) => void
  onStop: () => void
}

export function AnimatedQR({ images, frameMs, onFrameMsChange, onStop }: AnimatedQRProps) {
  const t = useI18n()
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const total = images.length

  useEffect(() => {
    if (total <= 1) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % total), frameMs)
    return () => window.clearInterval(timer)
  }, [total, frameMs])

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

  return (
    <section className={`transfer${fullscreen ? ' is-fullscreen' : ''}`}>
      <div className="transfer-stage">
        <img
          className="transfer-qr"
          src={images[index]}
          alt={`QR frame ${index + 1} of ${total}`}
          draggable={false}
        />
        <p className="transfer-index">
          {index + 1} / {total}
        </p>
      </div>
      <div className="transfer-controls">
        <p className="hint">{t.loopingEvery(frameMs)}</p>
        <div className="speed">
          <button
            type="button"
            className="button button-small"
            disabled={!canSlower}
            onClick={() => onFrameMsChange(FRAME_MS_PRESETS[presetIndex - 1])}
          >
            {t.slower}
          </button>
          <span className="speed-value">{frameMs} ms</span>
          <button
            type="button"
            className="button button-small"
            disabled={!canFaster}
            onClick={() => onFrameMsChange(FRAME_MS_PRESETS[presetIndex + 1])}
          >
            {t.faster}
          </button>
        </div>
        <div className="actions actions-center">
          <button
            type="button"
            className="button"
            aria-pressed={fullscreen}
            onClick={() => setFullscreen((f) => !f)}
          >
            {fullscreen ? t.exitFullscreen : t.fullscreen}
          </button>
          <button type="button" className="button" onClick={onStop}>
            {t.stopTransfer}
          </button>
        </div>
        {!fullscreen && <p className="hint">{t.transferHint}</p>}
      </div>
    </section>
  )
}
