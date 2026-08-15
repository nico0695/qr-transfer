import QRCode from 'qrcode'
import type { ErrorCorrectionLevel } from '../../lib/transfer/profiles'

const YIELD_EVERY = 8

/**
 * Pre-renders every protocol frame as a PNG data URL so the animation only swaps `img.src`.
 * Yields to the event loop periodically to keep the UI responsive on large transfers.
 */
export async function renderFrameImages(
  frames: readonly string[],
  errorCorrectionLevel: ErrorCorrectionLevel,
  isCancelled: () => boolean,
): Promise<string[]> {
  const images: string[] = []
  for (let i = 0; i < frames.length; i++) {
    if (isCancelled()) return images
    images.push(await QRCode.toDataURL(frames[i], { errorCorrectionLevel, margin: 2, scale: 6 }))
    if (i % YIELD_EVERY === YIELD_EVERY - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    }
  }
  return images
}
