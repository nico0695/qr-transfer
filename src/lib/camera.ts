import type { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode'

export const DEFAULT_CAMERA = { facingMode: 'environment' } as const

export type CameraSelection = string | typeof DEFAULT_CAMERA

/** A camera the user can pick. Same shape html5-qrcode used, without depending on it. */
export interface CameraOption {
  id: string
  label: string
}

/**
 * Cameras available for selection. Must run *after* a stream has been granted: without permission
 * `enumerateDevices` returns entries with empty labels, which are useless in a picker.
 */
export async function listCameras(): Promise<CameraOption[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((device) => device.kind === 'videoinput')
    .map((device) => ({ id: device.deviceId, label: device.label }))
}

/**
 * Scan tunables for the Large Transfer receiver. They live here, next to the camera lifecycle,
 * because they describe the capture side rather than the transfer protocol.
 *
 * `html5-qrcode` does not poll at a fixed rate: it chains `setTimeout(1000 / fps)` *after* each
 * decode finishes, so the real period is `decodeDuration + 1000 / fps` and the effective rate is
 * always below `fps`. The 1000/fps part is dead time added on top of every decode, which is why
 * this is well above the library default of 2.
 *
 * Only the legacy engine uses it. The WASM capture loop decodes as fast as each frame allows and
 * drops the rest, so it has no configurable rate.
 */
export const SCAN_FPS = 25

/** Fraction of the shorter viewfinder side used as the (square) scan box. */
export const SCAN_BOX_RATIO = 0.95

/** Requested capture resolution. Dense QR symbols need pixels per module; 480p is not enough. */
export const SCAN_WIDTH_IDEAL = 1920
export const SCAN_HEIGHT_IDEAL = 1080

/**
 * Builds the `start()` configuration for the transfer scanner.
 *
 * The camera identity has to be repeated inside `videoConstraints`: when `videoConstraints` is
 * present and valid, `html5-qrcode` uses it *instead of* the `cameraIdOrConfig` argument rather
 * than merging the two, so leaving the device id outside would silently ignore the user's camera
 * choice. Width and height are `ideal`, never `exact`, so a camera that cannot deliver 1080p still
 * starts instead of rejecting.
 *
 * `disableFlip` matters twice over: by default a failed tick is decoded a second time mirrored,
 * which doubles the work per tick and fires the error callback twice — useless for a
 * screen-to-camera transfer, and it would make the scan statistics uncountable.
 */
/**
 * Video constraints for a camera choice: which camera, and how much resolution to ask it for.
 *
 * Both scan engines go through here so the camera identity is assembled once. Width and height are
 * `ideal`, never `exact`, so a camera that cannot deliver 1080p still starts instead of rejecting.
 */
export function buildVideoConstraints(camera: CameraSelection): MediaTrackConstraints {
  const identity: MediaTrackConstraints =
    typeof camera === 'string' ? { deviceId: { exact: camera } } : { facingMode: camera.facingMode }
  return {
    ...identity,
    width: { ideal: SCAN_WIDTH_IDEAL },
    height: { ideal: SCAN_HEIGHT_IDEAL },
  }
}

export function buildScanConfig(camera: CameraSelection): Html5QrcodeCameraScanConfig {
  return {
    fps: SCAN_FPS,
    disableFlip: true,
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
      const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * SCAN_BOX_RATIO)
      return { width: size, height: size }
    },
    videoConstraints: buildVideoConstraints(camera),
  }
}

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
