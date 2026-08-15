import type { Html5Qrcode } from 'html5-qrcode'

export const DEFAULT_CAMERA = { facingMode: 'environment' } as const

export type CameraSelection = string | typeof DEFAULT_CAMERA

export type CameraErrorKey =
  'errorPermission' | 'errorNoCamera' | 'errorNotReadable' | 'errorGeneric'

export function describeCameraError(err: unknown): CameraErrorKey {
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err)
  if (/NotAllowedError|Permission denied|denied/i.test(text)) return 'errorPermission'
  if (/NotFoundError|no camera|not found/i.test(text)) return 'errorNoCamera'
  if (/NotReadableError|TrackStartError|in use/i.test(text)) return 'errorNotReadable'
  return 'errorGeneric'
}

/** Stops the camera and clears the scan region, tolerating an already-stopped scanner. */
export async function stopScanner(scanner: Html5Qrcode): Promise<void> {
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
