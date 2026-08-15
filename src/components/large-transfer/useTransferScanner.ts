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
  /**
   * Which engine is running, known as soon as it starts. Not a debug-only concern: the framed
   * viewfinder applies only to the WASM engine, because forcing a height on the video would move
   * the region html5-qrcode analyses without telling anyone.
   */
  engine: EngineName | null
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
  const [engine, setEngine] = useState<EngineName | null>(null)
  const collectorRef = useRef(new ChunkCollector())

  useEffect(() => {
    const collector = collectorRef.current
    collector.reset()
    const container = document.getElementById(SCAN_REGION_ID)
    if (container === null) return

    let finished = false
    let running: ScanEngine | null = null
    setState({ status: 'idle' })
    setEngine(null)

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
      await running?.stop()
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
        if (finished) return
        // Timed for both outcomes: a capture that decodes and one that comes up empty both cost
        // the decoder time, and averaging only the empty ones reports the cost of failing.
        scanStats?.recordDecodeDuration(decodeMs)
        if (outcome === 'empty') scanStats?.recordFailure(performance.now())
      },
      onText: (text) => {
        if (finished) return
        const frame = decodeFrame(text)
        if (frame === null) {
          scanStats?.recordFailure(performance.now())
          const version = detectProtocolVersion(text)
          if (version !== null && version !== PROTOCOL_VERSION) {
            finished = true
            void running?.stop()
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

    const start = async (): Promise<{ name: EngineName; instance: ScanEngine }> => {
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
          return { name: 'wasm', instance: await startCaptureLoop(options('wasm')) }
        } catch (err: unknown) {
          // A denied or missing camera would fail identically on the old engine, and retrying
          // would only replace a precise message with a generic one.
          const reason = describeCameraError(err)
          if (reason === 'errorPermission' || reason === 'errorNoCamera') throw err
        }
      }
      const { startLegacyEngine } = await import('../../lib/scan/legacyEngine')
      return { name: 'legacy', instance: await startLegacyEngine(options('legacy')) }
    }

    start()
      .then(async (started) => {
        running = started.instance
        if (finished) {
          // The component unmounted (or completed) while the camera was starting.
          await started.instance.stop()
          return
        }
        // Set here rather than from onReady so the viewfinder is already framed when the first
        // frame paints.
        setEngine(started.name)
        setState((current) => (current.status === 'idle' ? { status: 'scanning' } : current))
        try {
          setCameras(await listCameras())
        } catch {
          // Only the camera picker depends on this. Letting it reject would abort a session that
          // is already scanning perfectly well, and report it as a camera error.
        }
      })
      .catch((err: unknown) => {
        if (finished) return
        finished = true
        // `running` is set only after `start()` resolves, so this covers a failure during startup;
        // anything already running is released here rather than waiting for unmount.
        void running?.stop()
        setState({ status: 'error', key: describeCameraError(err) })
      })

    return () => {
      finished = true
      if (refresh !== 0) window.clearInterval(refresh)
      void running?.stop()
    }
  }, [selection, session])

  return {
    state,
    engine,
    cameras,
    selection,
    stats,
    selectCamera: setSelection,
    restart: () => {
      setState({ status: 'idle' })
      setStats(null)
      setEngine(null)
      setSession((value) => value + 1)
    },
  }
}
