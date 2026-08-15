import type { ReaderOptions } from 'zxing-wasm/reader'

/**
 * Reader options for a QR loop on a screen.
 *
 * Every default in `zxing-wasm` is tuned for reading an arbitrary photograph as accurately as
 * possible; the documentation of `tryHarder` says so outright — "Optimize for accuracy, not
 * speed." None of that applies here. The sender is a screen a few centimetres away showing an
 * upright, non-inverted QR code, and there is another capture along in a few milliseconds, so
 * work spent rescuing a marginal frame is work not spent on the next one.
 */
export const QR_READER_OPTIONS: ReaderOptions = {
  /** Default is every symbology. Only one is ever on screen. */
  formats: ['QRCode'],
  /** Default is 255: the scan keeps going after the first hit, looking for codes that never exist. */
  maxNumberOfSymbols: 1,
  /** Extra passes to rescue a difficult image. The next capture is cheaper than the rescue. */
  tryHarder: false,
  /** Three more passes for 90/180/270. A handheld phone facing a screen is upright. */
  tryRotate: false,
  /** Another pass for reversed reflectance. The sender always renders dark on light. */
  tryInvert: false,
  /** Extra passes at reduced scale. The region is already sized for the symbol (see roi.ts). */
  tryDownscale: false,
}
