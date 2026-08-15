/**
 * Contract between the capture side and whatever decodes the pixels.
 *
 * Frames travel as raw RGBA rather than as an `ImageBitmap` because `zxing-wasm` does not accept
 * one — its inputs are `Blob | ArrayBuffer | Uint8Array | ImageData`, and `ImageData` is the fast
 * path, since it converts to greyscale in JS and avoids copying four times as many bytes into the
 * WASM heap.
 */

/** Pixels of a single capture, in a form that survives `postMessage`. */
export interface ScanFrame {
  /** RGBA bytes. Transferred rather than copied, so the sender must not touch it afterwards. */
  buffer: ArrayBuffer
  width: number
  height: number
}

export interface Decoder {
  /** The decoded text, or `null` when the capture held no readable QR code. */
  decode(frame: ScanFrame): Promise<string | null>
  /** Releases the underlying worker. Safe to call more than once. */
  dispose(): void
}
