import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode'
import { useStageSlot } from './app/AppShell'
import { CameraScanner } from './app/OpticalStage/CameraScanner'
import { ResultPanel } from './app/ResultPanel'
import { Button } from './primitives/Button'
import { Feedback } from './primitives/Feedback'
import { useCopy } from '../hooks/useCopy'
import { useI18n } from '../i18n'
import {
  DEFAULT_CAMERA,
  describeCameraError,
  stopScanner,
  type CameraErrorKey,
  type CameraSelection,
} from '../lib/camera'

const REGION_ID = 'qr-scanner-region'

type Status = 'starting' | 'scanning' | 'done' | 'error'

type ErrorKey = CameraErrorKey | 'errorEmptyQr'

export default function QRScanner() {
  const t = useI18n()
  const stageNode = useStageSlot()
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selection, setSelection] = useState<CameraSelection | null>(null)
  const [status, setStatus] = useState<Status>('starting')
  const [result, setResult] = useState('')
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null)
  const [session, setSession] = useState(0)
  const { feedback, copy } = useCopy()

  useEffect(() => {
    let cancelled = false
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (cancelled) return
        setCameras(devices)
        if (devices.length === 0) {
          setErrorKey('errorNoCamera')
          setStatus('error')
        } else {
          setSelection((previous) => previous ?? DEFAULT_CAMERA)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setErrorKey(describeCameraError(err))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    if (selection === null) return
    const scanner = new Html5Qrcode(REGION_ID)
    let finished = false
    setStatus('starting')
    setResult('')
    setErrorKey(null)
    scanner
      .start(
        selection,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (finished) return
          finished = true
          void stopScanner(scanner)
          if (decodedText === '') {
            setErrorKey('errorEmptyQr')
            setStatus('error')
          } else {
            setResult(decodedText)
            setStatus('done')
          }
        },
        () => {
          // No QR code in this frame; keep scanning.
        },
      )
      .then(() => {
        // The component may have unmounted while the camera was starting.
        if (finished) {
          void stopScanner(scanner)
        } else {
          setStatus('scanning')
        }
      })
      .catch((err: unknown) => {
        if (finished) return
        finished = true
        setErrorKey(describeCameraError(err))
        setStatus('error')
      })
    return () => {
      finished = true
      void stopScanner(scanner)
    }
  }, [selection, session])

  const restart = () => {
    setResult('')
    setErrorKey(null)
    setStatus('starting')
    setSession((value) => value + 1)
  }

  const showCamera = status === 'starting' || status === 'scanning'

  return (
    <>
      {status === 'error' && (
        <Feedback
          level="error"
          title={errorKey !== null ? t[errorKey] : ''}
          actions={
            <Button variant="secondary" size="sm" onClick={restart}>
              {t.tryAgain}
            </Button>
          }
        />
      )}
      {status === 'done' && (
        <ResultPanel
          title={t.scannedText}
          text={result}
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={() => void copy(result)}>
                {feedback === 'copied' ? t.copied : feedback === 'failed' ? t.copyFailed : t.copy}
              </Button>
              <Button variant="secondary" size="sm" onClick={restart}>
                {t.scanAgain}
              </Button>
            </>
          }
        />
      )}
      {showCamera &&
        stageNode &&
        createPortal(
          <CameraScanner
            regionId={REGION_ID}
            cameras={cameras}
            selection={typeof selection === 'string' ? selection : ''}
            onSelectionChange={(value) => setSelection(value === '' ? DEFAULT_CAMERA : value)}
            cameraLabel={t.cameraLabel}
            cameraDefaultLabel={t.cameraDefault}
            starting={status === 'starting'}
            startingLabel={t.startingCamera}
            hint={t.scanHint}
            liveLabel={t.liveLabel}
          />,
          stageNode,
        )}
    </>
  )
}
