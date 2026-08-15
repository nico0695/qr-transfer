/**
 * Tunables for the Large Transfer mode. Kept in one place so chunk size, speeds and
 * limits can be adjusted without touching the protocol or the UI.
 */

/** Payload bytes per QR frame (before Base64URL encoding). Favors scannability over density. */
export const CHUNK_SIZE = 750

/** Error correction level for the animated QR frames. */
export const QR_ERROR_CORRECTION = 'M' as const

/** Default milliseconds per frame in the animated loop. */
export const DEFAULT_FRAME_MS = 300

/** Allowed frame durations, slowest to fastest. */
export const FRAME_MS_PRESETS = [500, 400, 300, 250, 200] as const

/**
 * Hard technical limit on the UTF-8 size of the input text. Above this the app refuses to
 * prepare a transfer to protect memory and the main thread (≈2 MB ⇒ typically < 1000 frames).
 */
export const MAX_INPUT_BYTES = 2_000_000

/** UX thresholds (in original UTF-8 bytes) used only for informational warnings. */
export const LARGE_BYTES = 100_000
export const VERY_LARGE_BYTES = 500_000
