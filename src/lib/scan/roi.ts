/**
 * Sizing of the region the receiver actually decodes.
 *
 * This is the fix for the defect that made fast profiles unreliable. `html5-qrcode` builds its
 * decode canvas from `element.clientWidth`, so the camera frame is downscaled to the size the
 * viewfinder happens to occupy on screen: on a 390 px phone a 105-module symbol ends up with about
 * 3.0 pixels per module, right at the floor below which no decoder works. Requesting a higher
 * camera resolution does nothing, because the canvas is the bottleneck.
 *
 * Two numbers do different jobs here, and keeping them apart is the point of this module:
 *
 * - `cropRatio` decides how carefully the user has to aim. A generous crop keeps framing as
 *   forgiving as it is today.
 * - `maxDecodeSize` decides how much work the decoder does per capture, and with it the pixels per
 *   module. Coupling the two would force a choice between a fussy scanner and a slow one.
 *
 * Measured evidence for the target (Sensors 2022, 22(19), 7230, "Performance of QR Code Detectors
 * near Nyquist Limits"): decoding needs at least 3–3.5 pixels per module whatever the optics, and
 * recognition rates have already plateaued by roughly 6, so more resolution past that buys CPU
 * cost and nothing else. That study covers low QR versions only, which is why the default aims at
 * the middle of the band rather than its floor.
 */

/** A crop of the camera frame, plus the square it is reduced to before decoding. */
export interface ScanRoi {
  /** Crop in native stream pixels, already clamped to the frame. */
  sx: number
  sy: number
  sw: number
  sh: number
  /** Side of the square the crop is scaled to. Never larger than the crop itself. */
  size: number
}

export interface RoiOptions {
  /** Fraction of the frame's shorter side to crop. */
  cropRatio?: number
  /** Upper bound on the decoded square's side. */
  maxDecodeSize?: number
}

/**
 * Fraction of the frame's shorter side that is cropped and decoded.
 *
 * Exported because the on-screen guide is drawn from this same number. If the two had separate
 * constants the guide would eventually point at a region that is not the one being analysed, which
 * is worse than showing no guide at all.
 *
 * It is also a decode parameter, not just a framing one: the crop is always reduced to
 * `maxDecodeSize`, so a tighter crop enlarges the symbol in the decoded image. A QR appearing 600px
 * wide in a 1080-wide stream lands on 2.85 px/module at 0.9, and 3.42 at 0.75 — same phone, same
 * distance. The cost is that the user has to aim more carefully, which is what the guide is for.
 */
export const DEFAULT_CROP_RATIO = 0.75

/** With `WORST_CASE_MODULES` (117) this is ~4.6 pixels per module. Retune with measurements. */
const DEFAULT_MAX_DECODE_SIZE = 540

/** Keeps a caller from asking for a crop so small that nothing could be framed inside it. */
const MIN_CROP_RATIO = 0.1

/**
 * Square crop centred on the frame, and the size to decode it at.
 *
 * Returns `null` while the video has no dimensions yet — the normal state for the first moments of
 * a stream, not an error.
 *
 * The result is always inside the frame. That clamp is not a formality: passing an out-of-bounds
 * rectangle to `createImageBitmap` is handled differently by each engine — WebKit silently returns
 * a bitmap smaller than requested, while Chromium and Gecko pad with transparent black — so a
 * miscalculation here would surface as an iOS-only bug that throws nothing.
 */
export function computeRoi(
  videoWidth: number,
  videoHeight: number,
  options: RoiOptions = {},
): ScanRoi | null {
  const width = Math.floor(videoWidth)
  const height = Math.floor(videoHeight)
  if (!isUsable(width) || !isUsable(height)) return null

  const cropRatio = clamp(options.cropRatio ?? DEFAULT_CROP_RATIO, MIN_CROP_RATIO, 1)
  const maxDecodeSize = Math.floor(options.maxDecodeSize ?? DEFAULT_MAX_DECODE_SIZE)

  const side = Math.max(1, Math.floor(Math.min(width, height) * cropRatio))
  return {
    sx: Math.floor((width - side) / 2),
    sy: Math.floor((height - side) / 2),
    sw: side,
    sh: side,
    // Never upscale: on a camera that only delivers 480p, enlarging the crop invents no detail and
    // charges the decoder for the extra pixels anyway.
    size: Math.max(1, Math.min(side, isUsable(maxDecodeSize) ? maxDecodeSize : side)),
  }
}

/** Pixels available per QR module once a symbol of `modules` fills the decoded square. */
export function pixelsPerModule(size: number, modules: number): number {
  return modules <= 0 ? 0 : size / modules
}

function isUsable(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return max
  return Math.min(max, Math.max(min, value))
}
