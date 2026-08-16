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

/** Collapses a preset to its settled `animate` state with zero duration when reduced-motion is on. */
export function withReducedMotion(preset: MotionVariant, reduced: boolean): MotionVariant {
  if (!reduced) return preset
  return {
    initial: preset.animate,
    animate: preset.animate,
    exit: preset.animate,
    transition: { duration: 0 },
  }
}
