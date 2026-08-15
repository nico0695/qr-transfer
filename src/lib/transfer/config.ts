/**
 * Tunables for the Large Transfer mode. Kept in one place so limits and thresholds can be adjusted
 * without touching the protocol or the UI. Per-profile values (chunk size, speed, error
 * correction) live in `profiles.ts`.
 */

/** Allowed frame durations in ms, slowest to fastest (runtime speed control + Advanced setting). */
export const FRAME_MS_PRESETS = [500, 400, 300, 250, 200] as const

/**
 * Highest QR symbol version each profile's frames may reach. A version is `4 * v + 17` modules per
 * side, so a lower ceiling means physically larger modules and more camera pixels per module —
 * the parameter that decides whether a frame decodes at all. `profiles.test.ts` derives the actual
 * version from a worst-case frame and asserts it against these, so a future chunk-size tweak
 * cannot silently push a profile back into the density range that made fast transfers unreliable.
 */
export const MAX_QR_VERSION = { reliable: 22, balanced: 22, fast: 23 } as const

/**
 * Hard technical limit on the bytes that actually travel through the QR frames (after the
 * compression decision). Above this the app refuses to transfer, to protect memory and the main
 * thread (≈2 MB ⇒ a few thousand frames at most).
 */
export const MAX_TRANSFER_BYTES = 2_000_000

/**
 * Guard applied BEFORE reading/compressing a source, so a huge file is rejected without loading
 * it into memory. Content that compresses well may be up to this size and still fit the transfer
 * limit above.
 */
export const MAX_SOURCE_BYTES = 20_000_000

/** UX thresholds (in transfer bytes) used only for informational warnings. */
export const LARGE_BYTES = 100_000
export const VERY_LARGE_BYTES = 500_000

/**
 * gzip is used only when it shrinks the content to less than this fraction of the original.
 * Already-compressed formats (JPEG, PNG, ZIP, MP4…) fail this test and travel as-is.
 */
export const COMPRESSION_MIN_GAIN = 0.98

/** Maximum UTF-8 bytes of the filename carried in the header frame (truncated by the sender). */
export const MAX_FILENAME_BYTES = 120

/** Maximum length of the MIME type carried in the header frame. */
export const MAX_MIME_LENGTH = 100

export type SizeLevel = 'ok' | 'large' | 'veryLarge' | 'tooLarge'

/** Classifies the bytes to transfer against the thresholds above. */
export function sizeLevel(transferBytes: number): SizeLevel {
  if (transferBytes > MAX_TRANSFER_BYTES) return 'tooLarge'
  if (transferBytes >= VERY_LARGE_BYTES) return 'veryLarge'
  if (transferBytes >= LARGE_BYTES) return 'large'
  return 'ok'
}
