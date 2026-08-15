import { describe, expect, it } from 'vitest'
import { QR_READER_OPTIONS } from './readerOptions'

describe('QR_READER_OPTIONS', () => {
  it('keeps every accuracy-over-speed default switched off', () => {
    // zxing-wasm defaults these to true because it assumes an arbitrary photograph. Turning any
    // of them back on to rescue a hard frame costs passes on every capture, including the vast
    // majority that decode fine — measure before changing this.
    expect(QR_READER_OPTIONS.tryHarder).toBe(false)
    expect(QR_READER_OPTIONS.tryRotate).toBe(false)
    expect(QR_READER_OPTIONS.tryInvert).toBe(false)
    expect(QR_READER_OPTIONS.tryDownscale).toBe(false)
  })

  it('looks for one QR code and stops', () => {
    // The default is every symbology and up to 255 symbols, so the scan would keep hunting for
    // codes that are never on screen after it already found the one that is.
    expect(QR_READER_OPTIONS.formats).toEqual(['QRCode'])
    expect(QR_READER_OPTIONS.maxNumberOfSymbols).toBe(1)
  })
})
