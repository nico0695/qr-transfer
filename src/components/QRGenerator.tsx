import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { CopyButton } from './CopyButton'
import { useI18n } from '../i18n'

const MAX_LENGTH = 2000

export function QRGenerator() {
  const t = useI18n()
  const [text, setText] = useState('')
  const [qrError, setQrError] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const qrPanelRef = useRef<HTMLDivElement | null>(null)

  const isEmpty = text === ''
  const atLimit = text.length >= MAX_LENGTH

  useEffect(() => {
    const canvas = canvasRef.current
    if (isEmpty || canvas === null) return
    let cancelled = false
    // Rendered at high resolution and scaled down with CSS so it stays sharp.
    QRCode.toCanvas(canvas, text, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
      .then(() => {
        // The library sets an inline 640px width/height; remove it so CSS controls the size.
        canvas.style.removeProperty('width')
        canvas.style.removeProperty('height')
        if (!cancelled) setQrError(false)
      })
      .catch(() => {
        if (!cancelled) setQrError(true)
      })
    return () => {
      cancelled = true
    }
  }, [text, isEmpty])

  return (
    <section className="panel generator">
      <div className="generator-form">
        <label className="field-label" htmlFor="qr-text">
          {t.textLabel}
        </label>
        <textarea
          id="qr-text"
          className="textarea"
          value={text}
          maxLength={MAX_LENGTH}
          placeholder={t.textPlaceholder}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="field-row">
          <span className={atLimit ? 'counter counter-limit' : 'counter'}>
            {text.length} / {MAX_LENGTH}
            {atLimit && t.limitReached}
          </span>
          <div className="actions">
            <button
              type="button"
              className="button mobile-only"
              disabled={isEmpty || qrError}
              onClick={() =>
                qrPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              {t.showQr}
            </button>
            <CopyButton text={text} />
            <button type="button" className="button" onClick={() => setText('')} disabled={isEmpty}>
              {t.clear}
            </button>
          </div>
        </div>
      </div>
      <div className="qr-panel" ref={qrPanelRef}>
        {isEmpty && <p className="qr-placeholder">{t.qrPlaceholder}</p>}
        {!isEmpty && qrError && <p className="error">{t.qrTooLong}</p>}
        <canvas ref={canvasRef} className="qr-canvas" hidden={isEmpty || qrError} />
      </div>
    </section>
  )
}
