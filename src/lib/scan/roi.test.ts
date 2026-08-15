import { describe, expect, it } from 'vitest'
import { WORST_CASE_MODULES } from '../transfer/config'
import { DEFAULT_CROP_RATIO, computeRoi, pixelsPerModule, type ScanRoi } from './roi'

/** The guarantee that protects against WebKit silently shrinking an out-of-bounds bitmap. */
function expectInsideFrame(roi: ScanRoi, width: number, height: number) {
  expect(roi.sx).toBeGreaterThanOrEqual(0)
  expect(roi.sy).toBeGreaterThanOrEqual(0)
  expect(roi.sx + roi.sw).toBeLessThanOrEqual(width)
  expect(roi.sy + roi.sh).toBeLessThanOrEqual(height)
  expect(roi.sw).toBeGreaterThan(0)
  expect(roi.sh).toBeGreaterThan(0)
}

describe('computeRoi', () => {
  it('crops a centred square from the shorter side in landscape', () => {
    const roi = computeRoi(1920, 1080, { cropRatio: 0.9 })!
    expect(roi.sw).toBe(972)
    expect(roi.sh).toBe(972)
    expect(roi.sx).toBe(474)
    expect(roi.sy).toBe(54)
  })

  it('crops from the shorter side in portrait too', () => {
    const roi = computeRoi(1080, 1920, { cropRatio: 0.9 })!
    expect(roi.sw).toBe(972)
    expect(roi.sx).toBe(54)
    expect(roi.sy).toBe(474)
  })

  it('returns null while the video has no dimensions yet', () => {
    // The first frames of a getUserMedia stream, not an error.
    expect(computeRoi(0, 0)).toBeNull()
    expect(computeRoi(1920, 0)).toBeNull()
    expect(computeRoi(0, 1080)).toBeNull()
  })

  it('returns null for dimensions that are not real numbers', () => {
    expect(computeRoi(Number.NaN, 1080)).toBeNull()
    expect(computeRoi(1920, Number.POSITIVE_INFINITY)).toBeNull()
    expect(computeRoi(-1920, -1080)).toBeNull()
  })

  it('stays inside the frame for every aspect ratio and crop ratio', () => {
    for (const [width, height] of [
      [1920, 1080],
      [1080, 1920],
      [640, 480],
      [1280, 720],
      [720, 720],
      [3840, 2160],
    ]) {
      for (const cropRatio of [0.1, 0.5, 0.9, 1]) {
        const roi = computeRoi(width, height, { cropRatio })!
        expectInsideFrame(roi, width, height)
      }
    }
  })

  it('never exceeds the frame even at a crop ratio of 1', () => {
    const roi = computeRoi(1000, 600, { cropRatio: 1 })!
    expect(roi.sw).toBe(600)
    expect(roi.sx).toBe(200)
    expect(roi.sy).toBe(0)
    expectInsideFrame(roi, 1000, 600)
  })

  it('clamps a nonsensical crop ratio instead of producing an unusable region', () => {
    expect(computeRoi(1000, 1000, { cropRatio: 5 })!.sw).toBe(1000)
    expect(computeRoi(1000, 1000, { cropRatio: 0 })!.sw).toBe(100)
    expect(computeRoi(1000, 1000, { cropRatio: -1 })!.sw).toBe(100)
    expect(computeRoi(1000, 1000, { cropRatio: Number.NaN })!.sw).toBe(1000)
  })

  it('floors fractional frame dimensions so the rectangle stays whole', () => {
    const roi = computeRoi(1920.7, 1080.9, { cropRatio: 0.9 })!
    expect(Number.isInteger(roi.sx)).toBe(true)
    expect(Number.isInteger(roi.sw)).toBe(true)
    expectInsideFrame(roi, 1920, 1080)
  })

  it('caps the decode size without touching the crop', () => {
    const roi = computeRoi(1920, 1080, { cropRatio: 0.9, maxDecodeSize: 540 })!
    expect(roi.sw).toBe(972)
    expect(roi.size).toBe(540)
  })

  it('never upscales a crop that is already smaller than the cap', () => {
    // A 480p camera: enlarging invents no detail and bills the decoder for the extra pixels.
    const roi = computeRoi(640, 480, { cropRatio: 0.9, maxDecodeSize: 540 })!
    expect(roi.sw).toBe(432)
    expect(roi.size).toBe(432)
  })

  it('falls back to the crop size when the cap is nonsense', () => {
    const side = Math.floor(1080 * DEFAULT_CROP_RATIO)
    expect(computeRoi(1920, 1080, { maxDecodeSize: 0 })!.size).toBe(side)
    expect(computeRoi(1920, 1080, { maxDecodeSize: Number.NaN })!.size).toBe(side)
  })

  it('crops exactly the fraction the on-screen guide is drawn from', () => {
    // The guide is positioned at this same ratio. If the default stopped matching it, the box on
    // screen would frame a region other than the one actually decoded.
    const roi = computeRoi(1080, 1920)!
    expect(roi.sw / 1080).toBeCloseTo(DEFAULT_CROP_RATIO, 3)
    const landscape = computeRoi(1920, 1080)!
    expect(landscape.sw / 1080).toBeCloseTo(DEFAULT_CROP_RATIO, 3)
  })
})

describe('pixelsPerModule', () => {
  it('divides the decoded square across the symbol', () => {
    expect(pixelsPerModule(540, 117)).toBeCloseTo(4.62, 2)
  })

  it('reports zero rather than dividing by zero', () => {
    expect(pixelsPerModule(540, 0)).toBe(0)
    expect(Number.isNaN(pixelsPerModule(540, 0))).toBe(false)
  })

  it('keeps the default budget clear of the floor decoders need', () => {
    // 3–3.5 px/module is where decoding stops working regardless of optics, and the plateau is
    // around 6. Anything that pushes the default outside that band should fail here.
    const roi = computeRoi(1080, 1920)!
    const budget = pixelsPerModule(roi.size, WORST_CASE_MODULES)
    expect(budget).toBeGreaterThan(3.5)
    expect(budget).toBeLessThan(6)
  })

  it('still clears the floor on a 720p camera', () => {
    const roi = computeRoi(1280, 720)!
    expect(pixelsPerModule(roi.size, WORST_CASE_MODULES)).toBeGreaterThan(3.5)
  })
})
