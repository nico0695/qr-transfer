import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats, type CameraDevice } from 'html5-qrcode'
import { useI18n } from '../../i18n'
import {
  DEFAULT_CAMERA,
  SCAN_FPS,
  buildScanConfig,
  describeCameraError,
  stopScanner,
  type CameraErrorKey,
  type CameraSelection,
} from '../../lib/camera'
import { copyText } from '../../lib/clipboard'
import { DEBUG_ENABLED } from '../../lib/debug'
import { formatBytes } from '../../lib/format'
import { PROTOCOL_VERSION, decodeFrame, detectProtocolVersion } from '../../lib/transfer/protocol'
import { ScanStats, formatScanReport, type ScanStatsSnapshot } from '../../lib/transfer/scanStats'
import { ChunkCollector, assembleTransfer } from '../../lib/transfer/transfer'
import type { ReceivedTransfer, TransferMetadata } from '../../lib/transfer/types'
import { ReceivedContent } from './ReceivedContent'
import { ReceivedFile } from './ReceivedFile'

const REGION_ID = 'large-transfer-scanner-region'

/** How often the debug overlay refreshes, in ms. Never on the scan path. */
const DEBUG_REFRESH_MS = 500

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
  const [stats, setStats] = useState<ScanStatsSnapshot | null>(null)

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

    const scanStats = DEBUG_ENABLED ? new ScanStats(performance.now(), SCAN_FPS) : null
    // Sampling runs on this timer, never on the scan path, so measuring cannot slow down decoding.
    const refresh =
      scanStats === null
        ? 0
        : window.setInterval(() => {
            scanStats.sample(performance.now())
            setStats(scanStats.snapshot())
          }, DEBUG_REFRESH_MS)

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
        if (scanStats !== null) {
          scanStats.recordComplete(performance.now())
          // Freeze the instrument on its final numbers: this is the measurement worth keeping.
          window.clearInterval(refresh)
          setStats(scanStats.snapshot())
        }
        setState({ status: 'complete', result })
      } catch {
        setState({ status: 'error', key: 'verificationFailed' })
      }
    }

    scanner
      .start(
        // Ignored while `videoConstraints` is valid, but kept as the library's fallback path.
        selection,
        buildScanConfig(selection),
        (decodedText) => {
          if (finished) return
          const frame = decodeFrame(decodedText)
          if (frame === null) {
            scanStats?.recordFailure(performance.now())
            const version = detectProtocolVersion(decodedText)
            if (version !== null && version !== PROTOCOL_VERSION) {
              finished = true
              void stopScanner(scanner)
              setState({ status: 'error', key: 'incompatibleSender' })
            }
            return
          }
          const outcome = collector.add(frame)
          scanStats?.recordDecode(performance.now(), frame.index, outcome)
          scanStats?.recordTotalFrames(frame.total)
          if (outcome !== 'accepted') return
          if (collector.isComplete) {
            void finish()
          } else {
            setState({ status: 'receiving', progress: progressOf() })
          }
        },
        () => {
          // No QR code in this capture; keep scanning.
          scanStats?.recordFailure(performance.now())
        },
      )
      .then(() => {
        if (finished) {
          // The component unmounted (or completed) while the camera was starting.
          void stopScanner(scanner)
        } else {
          if (scanStats !== null) {
            try {
              const track = scanner.getRunningTrackSettings()
              if (track.width !== undefined && track.height !== undefined) {
                scanStats.recordResolution(track.width, track.height)
              }
            } catch {
              // Scanner already stopped; the resolution is simply unknown.
            }
          }
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
      if (refresh !== 0) window.clearInterval(refresh)
      void stopScanner(scanner)
    }
  }, [selection, session])

  const restart = () => {
    setState({ status: 'idle' })
    setStats(null)
    setSession((value) => value + 1)
  }

  const showCamera =
    state.status === 'idle' || state.status === 'scanning' || state.status === 'receiving'

  if (state.status === 'complete') {
    // The overlay deliberately survives completion: the final numbers are the ones worth having,
    // and unmounting them here is what forced the first measurement to be read mid-scan.
    return (
      <>
        {state.result.type === 'text' ? (
          <ReceivedContent text={state.result.text} onScanAnother={restart} />
        ) : (
          <ReceivedFile file={state.result} onScanAnother={restart} />
        )}
        {DEBUG_ENABLED && stats !== null && <ScanDebug stats={stats} />}
      </>
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
      {DEBUG_ENABLED && stats !== null && <ScanDebug stats={stats} />}
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

/**
 * Diagnostics for tuning the optical channel, shown only with `?debug=1`. Labels are fixed
 * technical English on purpose: this is an instrument, not part of the product surface, so it
 * stays out of the translated dictionary.
 */
function ScanDebug({ stats }: { stats: ScanStatsSnapshot }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle')
  const seenOnce = stats.sightings.filter((entry) => entry.count === 1).length

  const copy = async () => {
    const ok = await copyText(formatScanReport(stats))
    setCopied(ok ? 'ok' : 'failed')
    window.setTimeout(() => setCopied('idle'), 2000)
  }

  return (
    <div className="scan-debug">
      <dl>
        <div>
          <dt>elapsed</dt>
          <dd>
            {`${(stats.elapsedMs / 1000).toFixed(1)}s`}
            {stats.completedAtMs !== null && ` · done ${(stats.completedAtMs / 1000).toFixed(1)}s`}
          </dd>
        </div>
        <div>
          <dt>frames</dt>
          <dd>{`${stats.accepted} / ${stats.totalFrames ?? '?'}`}</dd>
        </div>
        <div>
          <dt>video</dt>
          <dd>
            {stats.resolution === null
              ? 'unknown'
              : `${stats.resolution.width}×${stats.resolution.height}`}
          </dd>
        </div>
        <div>
          <dt>captures/s</dt>
          <dd>{stats.attemptsPerSecond.toFixed(1)}</dd>
        </div>
        <div>
          <dt>decodes/s</dt>
          <dd>{stats.decodesPerSecond.toFixed(1)}</dd>
        </div>
        <div>
          <dt>decode rate</dt>
          <dd>{(stats.decodeRate * 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt>tick</dt>
          <dd>{`${stats.meanTickMs.toFixed(0)} ms (~${stats.estimatedDecodeMs.toFixed(0)} decode)`}</dd>
        </div>
        <div>
          <dt>attempts</dt>
          <dd>{`${stats.decodes} ok / ${stats.attempts}`}</dd>
        </div>
        <div>
          <dt>duplicates</dt>
          <dd>{stats.duplicates}</dd>
        </div>
        <div>
          <dt>seen once</dt>
          <dd>{`${seenOnce} of ${stats.sightings.length}`}</dd>
        </div>
      </dl>
      <p className="scan-debug-sightings">
        {stats.sightings.map((entry) => `${entry.index}:${entry.count}`).join(' ')}
      </p>
      <div className="actions actions-center">
        <button type="button" className="button button-small" onClick={() => void copy()}>
          {copied === 'ok' ? 'copied' : copied === 'failed' ? 'copy failed' : 'copy report'}
        </button>
      </div>
    </div>
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
