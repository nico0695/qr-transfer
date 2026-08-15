import { describe, expect, it } from 'vitest'
import { DEFAULT_CAMERA, SCAN_FPS, buildScanConfig } from './camera'

describe('buildScanConfig', () => {
  it('disables the mirrored decode pass', () => {
    // Left on, every failed capture is decoded a second time flipped: double the work per tick,
    // and two error callbacks per tick, which would make the scan statistics uncountable.
    expect(buildScanConfig(DEFAULT_CAMERA).disableFlip).toBe(true)
    expect(buildScanConfig('camera-1').disableFlip).toBe(true)
    expect(buildScanConfig(DEFAULT_CAMERA).fps).toBe(SCAN_FPS)
  })

  it('repeats the camera identity inside videoConstraints', () => {
    // html5-qrcode uses videoConstraints *instead of* the camera argument rather than merging
    // them, so a device id left outside would be silently ignored.
    expect(buildScanConfig('camera-1').videoConstraints).toMatchObject({
      deviceId: { exact: 'camera-1' },
    })
    expect(buildScanConfig(DEFAULT_CAMERA).videoConstraints).toMatchObject({
      facingMode: 'environment',
    })
  })

  it('picks exactly one camera identity, never both', () => {
    const byId = buildScanConfig('camera-1').videoConstraints
    expect(byId).not.toHaveProperty('facingMode')
    const byFacing = buildScanConfig(DEFAULT_CAMERA).videoConstraints
    expect(byFacing).not.toHaveProperty('deviceId')
  })

  it('requests a high resolution as ideal, never exact', () => {
    // `exact` makes getUserMedia reject on cameras that cannot deliver it, turning a reliability
    // improvement into a hard failure.
    for (const camera of [DEFAULT_CAMERA, 'camera-1'] as const) {
      const constraints = buildScanConfig(camera).videoConstraints
      expect(constraints?.width).toEqual({ ideal: 1920 })
      expect(constraints?.height).toEqual({ ideal: 1080 })
    }
  })

  it('carries no audio constraints', () => {
    // html5-qrcode silently discards the whole videoConstraints object if it finds audio keys.
    const constraints = buildScanConfig(DEFAULT_CAMERA).videoConstraints ?? {}
    for (const key of ['echoCancellation', 'noiseSuppression', 'sampleRate', 'volume']) {
      expect(constraints).not.toHaveProperty(key)
    }
  })

  it('sizes a square scan box from the shorter side', () => {
    const qrbox = buildScanConfig(DEFAULT_CAMERA).qrbox
    expect(typeof qrbox).toBe('function')
    if (typeof qrbox !== 'function') return

    const landscape = qrbox(1920, 1080)
    expect(landscape).toEqual({ width: 1026, height: 1026 })

    const portrait = qrbox(1080, 1920)
    expect(portrait).toEqual({ width: 1026, height: 1026 })

    const square = qrbox(600, 600)
    expect(square.width).toBe(square.height)
    expect(square.width).toBeLessThan(600)
  })
})
