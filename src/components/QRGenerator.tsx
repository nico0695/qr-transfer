import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import styles from './QRGenerator.module.css'
import { useStageSlot } from './app/AppShell'
import { QrDisplay } from './app/OpticalStage/QrDisplay'
import { TextEditor } from './app/TextEditor'
import { Button } from './primitives/Button'
import { useCopy } from '../hooks/useCopy'
import { useI18n } from '../i18n'

const MAX_LENGTH = 2000

export interface QRGeneratorProps {
  onShowStage: () => void
}

export function QRGenerator({ onShowStage }: QRGeneratorProps) {
  const t = useI18n()
  const stageNode = useStageSlot()
  const [text, setText] = useState('')
  const [qrError, setQrError] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { feedback, copy } = useCopy()

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
    <>
      <TextEditor
        title={t.textLabel}
        value={text}
        onChange={setText}
        placeholder={t.textPlaceholder}
        maxLength={MAX_LENGTH}
        atLimit={atLimit}
        limitReachedLabel={t.limitReached}
        copyLabel={t.copy}
        copiedLabel={t.copied}
        copyFailedLabel={t.copyFailed}
        copyFeedback={feedback}
        onCopy={() => void copy(text)}
        clearLabel={t.clear}
        onClear={() => setText('')}
      />
      <Button
        variant="secondary"
        className={styles.showStageButton}
        disabled={isEmpty || qrError}
        onClick={onShowStage}
      >
        {t.showQr}
      </Button>
      {stageNode &&
        createPortal(
          <QrDisplay
            isEmpty={isEmpty}
            error={qrError}
            errorLabel={t.qrTooLong}
            placeholderLabel={t.qrPlaceholder}
            canvasRef={canvasRef}
          />,
          stageNode,
        )}
    </>
  )
}
