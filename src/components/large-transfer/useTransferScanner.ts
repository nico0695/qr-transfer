import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CAMERA,
  SCAN_FPS,
  describeCameraError,
  listCameras,
  type CameraErrorKey,
  type CameraOption,
  type CameraSelection,
} from '../../lib/camera'
import { DEBUG_ENABLED, FORCE_LEGACY_SCANNER } from '../../lib/debug'
import { startCaptureLoop, supportsCaptureLoop } from '../../lib/scan/captureLoop'
import type { EngineName, EngineOptions, ScanEngine } from '../../lib/scan/engine'
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
  cameras: CameraOption[]
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
  const [cameras, setCameras] = useState<CameraOption[]>([])
  const [selection, setSelection] = useState<CameraSelection>(DEFAULT_CAMERA)
  const [state, setState] = useState<ReceiverState>({ status: 'idle' })
  const [session, setSession] = useState(0)
  const [stats, setStats] = useState<ScanStatsSnapshot | null>(null)
  const collectorRef = useRef(new ChunkCollector())

  useEffect(() => {
    const collector = collectorRef.current
    collector.reset()
    const container = document.getElementById(SCAN_REGION_ID)
    if (container === null) return

    let finished = false
    let engine: ScanEngine | null = null
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
      setState({ status: 'assembling', progress: progressOf() })
      await engine?.stop()
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

    const callbacks: Omit<EngineOptions, 'container' | 'camera'> = {
      onAttempt: (outcome, decodeMs) => {
        if (finished || outcome !== 'empty') return
        scanStats?.recordFailure(performance.now(), decodeMs)
      },
      onText: (text) => {
        if (finished) return
        const frame = decodeFrame(text)
        if (frame === null) {
          scanStats?.recordFailure(performance.now())
          const version = detectProtocolVersion(text)
          if (version !== null && version !== PROTOCOL_VERSION) {
            finished = true
            void engine?.stop()
            setState({ status: 'error', key: 'incompatibleSender' })
          }
          return
        }
        const outcome = collector.add(frame)
        scanStats?.recordDecode(performance.now(), frame.index, outcome)
        scanStats?.recordTotalFrames(frame.total)
        if (outcome !== 'accepted') return
        if (collector.isComplete) void finish()
        else setState({ status: 'receiving', progress: progressOf() })
      },
      onReady: () => {},
    }

    const start = async () => {
      const options = (name: EngineName): EngineOptions => ({
        ...callbacks,
        container,
        camera: selection,
        onReady: (info) => {
          if (info.width > 0) scanStats?.recordResolution(info.width, info.height)
          scanStats?.recordEngine(name, info.roiSize)
        },
      })

      if (!FORCE_LEGACY_SCANNER && supportsCaptureLoop()) {
        try {
          return await startCaptureLoop(options('wasm'))
        } catch (err: unknown) {
          // A denied or missing camera would fail identically on the old engine, and retrying
          // would only replace a precise message with a generic one.
          const reason = describeCameraError(err)
          if (reason === 'errorPermission' || reason === 'errorNoCamera') throw err
        }
      }
      const { startLegacyEngine } = await import('../../lib/scan/legacyEngine')
      return await startLegacyEngine(options('legacy'))
    }

    start()
      .then(async (started) => {
        engine = started
        if (finished) {
          // The component unmounted (or completed) while the camera was starting.
          await started.stop()
          return
        }
        setState((current) => (current.status === 'idle' ? { status: 'scanning' } : current))
        setCameras(await listCameras())
      })
      .catch((err: unknown) => {
        if (finished) return
        finished = true
        setState({ status: 'error', key: describeCameraError(err) })
      })

    return () => {
      finished = true
      if (refresh !== 0) window.clearInterval(refresh)
      void engine?.stop()
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
