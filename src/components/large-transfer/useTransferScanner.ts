import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats, type CameraDevice } from 'html5-qrcode'
import {
  DEFAULT_CAMERA,
  SCAN_FPS,
  buildScanConfig,
  describeCameraError,
  stopScanner,
  type CameraErrorKey,
  type CameraSelection,
} from '../../lib/camera'
import { DEBUG_ENABLED } from '../../lib/debug'
import { PROTOCOL_VERSION, decodeFrame, detectProtocolVersion } from '../../lib/transfer/protocol'
import { ScanStats, type ScanStatsSnapshot } from '../../lib/transfer/scanStats'
import { ChunkCollector, assembleTransfer } from '../../lib/transfer/transfer'
import type { ReceivedTransfer, TransferMetadata } from '../../lib/transfer/types'

export const SCAN_REGION_ID = 'large-transfer-scanner-region'

/** How often the debug overlay refreshes, in ms. Never on the scan path. */
const DEBUG_REFRESH_MS = 500

export interface Progress {
  received: number
  total: number
  missing: number[]
  /** Known once the header frame has been scanned. */
  metadata: TransferMetadata | null
}

export type ReceiverState =
  | { status: 'idle' }
  | { status: 'scanning' }
  | { status: 'receiving'; progress: Progress }
  | { status: 'assembling'; progress: Progress }
  | { status: 'complete'; result: ReceivedTransfer }
  | { status: 'error'; key: CameraErrorKey | 'verificationFailed' | 'incompatibleSender' }

export interface TransferScannerApi {
  state: ReceiverState
  cameras: CameraDevice[]
  selection: CameraSelection | null
  stats: ScanStatsSnapshot | null
  selectCamera(selection: CameraSelection): void
  restart(): void
}

/**
 * Owns everything imperative about receiving a transfer: camera lifecycle, frame collection and
 * diagnostics. The component that consumes this renders `state` and nothing else.
 *
 * The separation is what lets the capture engine be replaced without touching the UI — this
 * contract is the seam. Whatever drives the camera, the states it produces stay the same.
 */
export function useTransferScanner(): TransferScannerApi {
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selection, setSelection] = useState<CameraSelection | null>(null)
  const [state, setState] = useState<ReceiverState>({ status: 'idle' })
  const [session, setSession] = useState(0)
  const [stats, setStats] = useState<ScanStatsSnapshot | null>(null)
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
    const scanner = new Html5Qrcode(SCAN_REGION_ID, {
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

  return {
    state,
    cameras,
    selection,
    stats,
    selectCamera: setSelection,
    restart: () => {
      setState({ status: 'idle' })
      setStats(null)
      setSession((value) => value + 1)
    },
  }
}
