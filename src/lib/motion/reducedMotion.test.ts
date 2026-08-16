import { describe, expect, it } from 'vitest'
import { withReducedMotion, type MotionVariant } from './reducedMotion'

const preset: MotionVariant = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.2, ease: 'easeOut' },
}

describe('withReducedMotion', () => {
  it('returns the preset unchanged when not reduced', () => {
    expect(withReducedMotion(preset, false)).toBe(preset)
  })

  it('collapses initial/animate/exit to the settled state with zero duration when reduced', () => {
    expect(withReducedMotion(preset, true)).toEqual({
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    })
  })
})
