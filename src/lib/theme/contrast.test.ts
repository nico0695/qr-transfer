import { describe, expect, it } from 'vitest'
import { bestOnColor, contrastRatio } from './contrast'

describe('bestOnColor', () => {
  it('picks black text on the piedra accent', () => {
    // docs/DESIGN_SYSTEM.md §2.1: --on-accent is computed, not hardcoded, but piedra (#AAAAAD)
    // is light enough that black clears the ratio white would need to reach on a mid-gray.
    expect(bestOnColor('#AAAAAD')).toBe('#050505')
  })
})

// WCAG 2 thresholds: 7:1 is AAA for normal text, 4.5:1 is AA, 3:1 is AA for large/micro-label text.
describe('contrastRatio — DS contrast reference table (dark theme, §2.1)', () => {
  it('text-strong on bg clears AAA', () => {
    expect(contrastRatio('#FFFFFF', '#050505')).toBeGreaterThanOrEqual(7)
  })

  it('text on surface clears AAA', () => {
    expect(contrastRatio('#EBEBEB', '#111111')).toBeGreaterThanOrEqual(7)
  })

  it('text-muted on surface clears AA', () => {
    expect(contrastRatio('#888888', '#111111')).toBeGreaterThanOrEqual(4.5)
  })

  it('text-faint on bg clears AA-large for micro-labels only', () => {
    const ratio = contrastRatio('#666666', '#050505')
    expect(ratio).toBeGreaterThanOrEqual(3)
    expect(ratio).toBeLessThan(4.5)
  })

  it('qr-ink on qr-paper clears AAA', () => {
    expect(contrastRatio('#050505', '#FFFFFF')).toBeGreaterThanOrEqual(7)
  })
})
