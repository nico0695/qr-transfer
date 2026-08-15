import { describe, expect, it } from 'vitest'
import { frameIndexAt, preloadWindow } from './frameLoop'

describe('frameIndexAt', () => {
  it('advances one frame per duration', () => {
    expect(frameIndexAt(0, 300, 6)).toBe(0)
    expect(frameIndexAt(299, 300, 6)).toBe(0)
    expect(frameIndexAt(300, 300, 6)).toBe(1)
    expect(frameIndexAt(1500, 300, 6)).toBe(5)
  })

  it('wraps around the loop', () => {
    expect(frameIndexAt(1800, 300, 6)).toBe(0)
    expect(frameIndexAt(2100, 300, 6)).toBe(1)
  })

  it('survives a backgrounded tab', () => {
    // A throttled tab can come back hours later; the index must still be valid, not drift.
    const index = frameIndexAt(6 * 60 * 60 * 1000, 200, 7)
    expect(Number.isInteger(index)).toBe(true)
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(7)
  })

  it('returns 0 for degenerate input instead of throwing', () => {
    expect(frameIndexAt(1000, 300, 1)).toBe(0)
    expect(frameIndexAt(1000, 300, 0)).toBe(0)
    expect(frameIndexAt(1000, 300, -3)).toBe(0)
    expect(frameIndexAt(-50, 300, 6)).toBe(0)
    expect(frameIndexAt(1000, 0, 6)).toBe(0)
    expect(frameIndexAt(Number.NaN, 300, 6)).toBe(0)
    expect(frameIndexAt(Number.POSITIVE_INFINITY, 300, 6)).toBe(0)
    expect(frameIndexAt(1000, 300, Number.NaN)).toBe(0)
  })
})

describe('preloadWindow', () => {
  it('returns the current frame plus the ones after it', () => {
    expect(preloadWindow(0, 6, 3)).toEqual([0, 1, 2, 3])
    expect(preloadWindow(2, 6, 2)).toEqual([2, 3, 4])
  })

  it('wraps past the end of the loop', () => {
    expect(preloadWindow(4, 6, 3)).toEqual([4, 5, 0, 1])
  })

  it('never asks for more frames than exist', () => {
    expect(preloadWindow(0, 2, 5)).toEqual([0, 1])
    expect(preloadWindow(0, 1, 3)).toEqual([0])
  })

  it('returns nothing when there is nothing to show', () => {
    expect(preloadWindow(0, 0, 3)).toEqual([])
    expect(preloadWindow(0, Number.NaN, 3)).toEqual([])
  })
})
