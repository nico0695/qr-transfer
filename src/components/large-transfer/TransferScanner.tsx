import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats, type CameraDevice } from 'html5-qrcode'
import { useI18n } from '../../i18n'
import {
  DEFAULT_CAMERA,
  describeCameraError,
  stopScanner,
  type CameraErrorKey,
  type CameraSelection,
} from '../../lib/camera'
import { formatBytes } from '../../lib/format'
import { PROTOCOL_VERSION, decodeFrame, detectProtocolVersion } from '../../lib/transfer/protocol'
import { ChunkCollector, assembleTransfer } from '../../lib/transfer/transfer'
import type { ReceivedTransfer, TransferMetadata } from '../../lib/transfer/types'
import { ReceivedContent } from './ReceivedContent'
import { ReceivedFile } from './ReceivedFile'

const REGION_ID = 'large-transfer-scanner-region'
const SCAN_FPS = 15

interface Progress {
  received: number
  total: number
  missing: number[]
  /** Known once the header frame has been scanned. */
  metadata: TransferMetadata | null
}

type ReceiverState =
  | { status: 'idle' }
  | { status: 'scanning' }
  | { status: 'receiving'; progress: Progress }
  | { status: 'assembling'; progress: Progress }
  | { status: 'complete'; result: ReceivedTransfer }
  | { status: 'error'; key: CameraErrorKey | 'verificationFailed' | 'incompatibleSender' }

export function TransferScanner() {
  const t = useI18n()
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selection, setSelection] = useState<CameraSelection | null>(null)
  const [state, setState] = useState<ReceiverState>({ status: 'idle' })
  const [session, setSession] = useState(0)
  const collectorRef = useRef(new ChunkCollector())

  useEffect(() => {
    let cancelled = false
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (cancelled) return
        setCameras(devices)
        if (devices.length === 0) {
          setState({ status: 'error', key: 'errorNoCamera' })
        } else {
          setSelection((previous) => previous ?? DEFAULT_CAMERA)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({ status: 'error', key: describeCameraError(err) })
      })
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    if (selection === null) return
    const collector = collectorRef.current
    collector.reset()
    const scanner = new Html5Qrcode(REGION_ID, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    })
    let finished = false
    setState({ status: 'idle' })

    const progressOf = (): Progress => ({
      received: collector.received,
      total: collector.total,
      missing: collector.missingIndexes,
      metadata: collector.metadata,
    })

    const finish = async () => {
      finished = true
      const progress = progressOf()
      setState({ status: 'assembling', progress })
      await stopScanner(scanner)
      try {
        const metadata = collector.metadata
        if (metadata === null) throw new Error('Header frame missing')
        const result = await assembleTransfer(collector.chunkMap, collector.total, metadata)
        setState({ status: 'complete', result })
      } catch {
        setState({ status: 'error', key: 'verificationFailed' })
      }
    }

    scanner
      .start(
        selection,
        {
          fps: SCAN_FPS,
          qrbox: (width, height) => {
            const size = Math.floor(Math.min(width, height) * 0.85)
            return { width: size, height: size }
          },
        },
        (decodedText) => {
          if (finished) return
          const frame = decodeFrame(decodedText)
          if (frame === null) {
            const version = detectProtocolVersion(decodedText)
            if (version !== null && version !== PROTOCOL_VERSION) {
              finished = true
              void stopScanner(scanner)
              setState({ status: 'error', key: 'incompatibleSender' })
            }
            return
          }
          if (collector.add(frame) !== 'accepted') return
          if (collector.isComplete) {
            void finish()
          } else {
            setState({ status: 'receiving', progress: progressOf() })
          }
        },
        () => {
          // No QR code in this frame; keep scanning.
        },
      )
      .then(() => {
        if (finished) {
          // The component unmounted (or completed) while the camera was starting.
          void stopScanner(scanner)
        } else {
          setState((current) => (current.status === 'idle' ? { status: 'scanning' } : current))
        }
      })
      .catch((err: unknown) => {
        if (finished) return
        finished = true
        setState({ status: 'error', key: describeCameraError(err) })
      })

    return () => {
      finished = true
      void stopScanner(scanner)
    }
  }, [selection, session])

  const restart = () => {
    setState({ status: 'idle' })
    setSession((value) => value + 1)
  }

  const showCamera =
    state.status === 'idle' || state.status === 'scanning' || state.status === 'receiving'

  if (state.status === 'complete') {
    return state.result.type === 'text' ? (
      <ReceivedContent text={state.result.text} onScanAnother={restart} />
    ) : (
      <ReceivedFile file={state.result} onScanAnother={restart} />
    )
  }

  return (
    <section className="panel receiver">
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
      {state.status === 'idle' && <p className="hint">{t.startingCamera}</p>}
      {state.status === 'scanning' && <p className="hint">{t.receiverIdle}</p>}
      {(state.status === 'receiving' || state.status === 'assembling') && (
        <ReceiveProgress
          progress={state.progress}
          label={state.status === 'assembling' ? t.assembling : t.receiving}
        />
      )}
      {state.status === 'error' && (
        <div className="result">
          <p className="error">
            {state.key === 'verificationFailed'
              ? `${t.verificationFailed} ${t.scanAgainHint}`
              : state.key === 'incompatibleSender'
                ? t.incompatibleSender
                : t[state.key]}
          </p>
          <div className="actions">
            <button type="button" className="button" onClick={restart}>
              {t.tryAgain}
            </button>
          </div>
        </div>
      )}
      {showCamera && (
        <div className="actions actions-center">
          <button type="button" className="button" onClick={restart}>
            {t.cancel}
          </button>
        </div>
      )}
    </section>
  )
}

function ReceiveProgress({ progress, label }: { progress: Progress; label: string }) {
  const t = useI18n()
  const percent = progress.total === 0 ? 0 : Math.round((progress.received / progress.total) * 100)
  return (
    <div className="progress">
      <p className="progress-count">{t.framesProgress(progress.received, progress.total)}</p>
      {progress.metadata !== null && (
        <p className="hint progress-meta">
          {progress.metadata.type === 'file'
            ? `${progress.metadata.filename} · ${formatBytes(progress.metadata.originalSize)}`
            : `${t.sourceText} · ${formatBytes(progress.metadata.originalSize)}`}
        </p>
      )}
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="hint">{label}</p>
      {progress.missing.length > 0 && progress.missing.length <= 200 && (
        <details className="progress-details">
          <summary>{t.missingFrames}</summary>
          <p>{progress.missing.map((i) => i + 1).join(', ')}</p>
        </details>
      )}
    </div>
  )
}
