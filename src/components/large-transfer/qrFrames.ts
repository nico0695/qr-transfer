import QRCode from 'qrcode'
import type { ErrorCorrectionLevel } from '../../lib/transfer/profiles'

const YIELD_EVERY = 8

/** Quiet zone, in modules, on each side of the symbol. */
const MARGIN = 2

/**
 * Natural size of the rendered PNG, in pixels. The actual value is rounded up to a whole number of
 * pixels per module so the symbol is rendered exactly, with no rounding inside the image itself.
 */
const TARGET_SIZE = 900

/**
 * Pre-renders every protocol frame as a PNG data URL so the animation only swaps `img.src`.
 * Yields to the event loop periodically to keep the UI responsive on large transfers.
 *
 * Size matters for more than sharpness: the browser scales this image to whatever CSS and the
 * device pixel ratio ask for, and that factor is essentially never a whole number. Rendering at a
 * whole number of pixels per module keeps the source exact, and the surrounding CSS lets the
 * browser interpolate when it rescales — a slightly softened symbol decodes far better than one
 * whose modules have been aliased into uneven widths.
 */
export async function renderFrameImages(
  frames: readonly string[],
  errorCorrectionLevel: ErrorCorrectionLevel,
  isCancelled: () => boolean,
): Promise<string[]> {
  const images: string[] = []
  const widths = new Map<number, number>()
  for (let i = 0; i < frames.length; i++) {
    if (isCancelled()) return images
    const width = naturalWidth(frames[i], errorCorrectionLevel, widths)
    images.push(await QRCode.toDataURL(frames[i], { errorCorrectionLevel, margin: MARGIN, width }))
    if (i % YIELD_EVERY === YIELD_EVERY - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    }
  }
  return images
}

/**
 * Smallest whole number of pixels per module that reaches `TARGET_SIZE`, for this frame.
 *
 * A transfer does not use one symbol size throughout: the header carries metadata and the last
 * data frame carries a partial chunk, so both can land on a different QR version than the full
 * frames between them. Frames of equal length always produce the same version, though, so the
 * measurement is cached by length and in practice runs about three times per transfer.
 */
function naturalWidth(
  frame: string,
  errorCorrectionLevel: ErrorCorrectionLevel,
  cache: Map<number, number>,
): number {
  const cached = cache.get(frame.length)
  if (cached !== undefined) return cached
  let width = TARGET_SIZE
  try {
    const modules = QRCode.create(frame, { errorCorrectionLevel }).modules.size + MARGIN * 2
    width = modules * Math.ceil(TARGET_SIZE / modules)
  } catch {
    // Unmeasurable for some reason; the default size still renders a valid symbol.
  }
  cache.set(frame.length, width)
  return width
}
