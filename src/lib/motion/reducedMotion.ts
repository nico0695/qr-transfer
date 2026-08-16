import { useEffect, useState } from 'react'
import type { Target, Transition } from 'motion/react'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  return reduced
}

export interface MotionVariant {
  initial: Target
  animate: Target
  exit?: Target
  transition?: Transition
}

/** Drops a transition's duration to zero when reduced-motion is on — the piece every collapse
 * shares, including presets like `paneSwitch` that keep two persistent targets (not an
 * enter/exit pair) and so can't go through `withReducedMotion` below without erasing the
 * distinction between them. */
export function reducedTransition(
  transition: Transition | undefined,
  reduced: boolean,
): Transition | undefined {
  return reduced ? { duration: 0 } : transition
}

/** Collapses a preset to its settled `animate` state with zero duration when reduced-motion is on. */
export function withReducedMotion(preset: MotionVariant, reduced: boolean): MotionVariant {
  if (!reduced) return preset
  return {
    initial: preset.animate,
    animate: preset.animate,
    exit: preset.animate,
    transition: reducedTransition(preset.transition, reduced),
  }
}
