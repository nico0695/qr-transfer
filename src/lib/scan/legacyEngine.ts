/**
 * The previous scanner, kept as a safety net.
 *
 * This module is only ever reached through a dynamic import, so `html5-qrcode` stays out of the
 * receiver's chunk unless the WASM engine actually fails to start.
 *
 * It cannot time its own decode: the library gives no hook around it, only the interval between
 * callbacks, which `ScanStats` turns into an estimate. Hence the null durations.
 */
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { buildScanConfig, stopScanner } from '../camera'
import type { EngineOptions, ScanEngine } from './engine'

export async function startLegacyEngine(options: EngineOptions): Promise<ScanEngine> {
  const { container, camera, onText, onAttempt, onReady } = options
  const scanner = new Html5Qrcode(container.id, {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  })

  await scanner.start(
    camera,
    buildScanConfig(camera),
    (text) => {
      onAttempt('decoded', null)
      onText(text)
    },
    () => {
      onAttempt('empty', null)
    },
  )

  try {
    const track = scanner.getRunningTrackSettings()
    onReady({ width: track.width ?? 0, height: track.height ?? 0, roiSize: null })
  } catch {
    // Already stopped; the geometry is simply unknown.
  }

  return { stop: () => stopScanner(scanner) }
}
