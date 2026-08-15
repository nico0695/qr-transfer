import { useEffect, useState } from 'react'
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode'
import { CopyButton } from './CopyButton'
import { useI18n } from '../i18n'

const REGION_ID = 'qr-scanner-region'
const DEFAULT_CAMERA = { facingMode: 'environment' } as const

type CameraSelection = string | typeof DEFAULT_CAMERA

type Status = 'starting' | 'scanning' | 'done' | 'error'

type ErrorKey =
  'errorPermission' | 'errorNoCamera' | 'errorNotReadable' | 'errorGeneric' | 'errorEmptyQr'

function describeCameraError(err: unknown): ErrorKey {
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err)
  if (/NotAllowedError|Permission denied|denied/i.test(text)) return 'errorPermission'
  if (/NotFoundError|no camera|not found/i.test(text)) return 'errorNoCamera'
  if (/NotReadableError|TrackStartError|in use/i.test(text)) return 'errorNotReadable'
  return 'errorGeneric'
}

async function stopScanner(scanner: Html5Qrcode) {
  try {
    if (scanner.isScanning) await scanner.stop()
  } catch {
    // Already stopped; nothing to release.
  }
  try {
    scanner.clear()
  } catch {
    // The scan region was already cleaned up.
  }
}

export default function QRScanner() {
  const t = useI18n()
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selection, setSelection] = useState<CameraSelection | null>(null)
  const [status, setStatus] = useState<Status>('starting')
  const [result, setResult] = useState('')
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null)
  const [session, setSession] = useState(0)

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
    <section className="panel scanner">
      {showCamera && cameras.length > 1 && (
        <label className="field-label camera-select">
          {t.cameraLabel}
          <select
            className="select"
            value={typeof selection === 'string' ? selection : ''}
            onChange={(event) =>
              setSelection(event.target.value === '' ? DEFAULT_CAMERA : event.target.value)
            }
          >
            <option value="">{t.cameraDefault}</option>
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || camera.id}
              </option>
            ))}
          </select>
        </label>
      )}
      <div id={REGION_ID} className="camera-region" hidden={!showCamera} />
      {status === 'starting' && <p className="hint">{t.startingCamera}</p>}
      {status === 'scanning' && <p className="hint">{t.scanHint}</p>}
      {status === 'error' && (
        <div className="result">
          <p className="error">{errorKey !== null && t[errorKey]}</p>
          <button type="button" className="button" onClick={restart}>
            {t.tryAgain}
          </button>
        </div>
      )}
      {status === 'done' && (
        <div className="result">
          <p className="field-label">{t.scannedText}</p>
          <pre className="result-text">{result}</pre>
          <div className="actions">
            <CopyButton text={result} />
            <button type="button" className="button" onClick={restart}>
              {t.scanAgain}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
