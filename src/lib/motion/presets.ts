import type { Easing, Transition } from 'motion/react'
import type { MotionVariant } from './reducedMotion'

function cssMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const value = parseFloat(raw)
  return Number.isFinite(value) ? value / 1000 : fallback
}

function cssEasing(name: string, fallback: Easing): Easing {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  switch (raw) {
    case 'linear':
      return 'linear'
    case 'ease-in':
      return 'easeIn'
    case 'ease-out':
      return 'easeOut'
    case 'ease-in-out':
    case 'ease':
      return 'easeInOut'
    default:
      return fallback
  }
}

function baseTransition(): Transition {
  return { duration: cssMs('--duration-base', 0.2), ease: cssEasing('--easing-out', 'easeOut') }
}

function sheetTransition(): Transition {
  return { duration: cssMs('--duration-sheet', 0.28), ease: cssEasing('--easing-out', 'easeOut') }
}

/** ResultPanel — a scan/receive result reads better sliding up than scaling in. */
export function fadeSlideUp(): MotionVariant {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: baseTransition(),
  }
}

/** Dialog enter/exit — direct port of the `@starting-style` numbers it replaces. */
export function sheetEnter(kind: 'modal' | 'sheet'): MotionVariant {
  const transition = sheetTransition()
  if (kind === 'modal') {
    return {
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.96 },
      transition,
    }
  }
  return {
    initial: { opacity: 1, y: '100%' },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 1, y: '100%' },
    transition,
  }
}

/**
 * Mobile compose/stage pane switch. Both panes stay mounted (one hosts the portal target for the
 * stage), so this isn't a mount/unmount transition — it's the `active` vs `inactive` resting
 * target for whichever pane the `view` prop currently isn't pointing at. `direction` is fixed per
 * pane (compose rests off to the left, stage off to the right) so both slide the same way.
 */
export function paneSwitch(direction: 1 | -1): {
  active: MotionVariant['animate']
  inactive: MotionVariant['animate']
  transition: Transition
} {
  return {
    active: { opacity: 1, x: 0 },
    inactive: { opacity: 0, x: direction * 24 },
    transition: baseTransition(),
  }
}

/** SummaryGrid stagger — container drives `staggerChildren`, item is the per-cell fade/slide. */
export function staggerList(): { container: MotionVariant; item: MotionVariant } {
  const transition = baseTransition()
  return {
    container: {
      initial: {},
      animate: {},
      transition: { staggerChildren: 0.04 },
    },
    item: {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition,
    },
  }
}

/** Feedback's default mount/unmount preset. */
export function presence(): MotionVariant {
  return {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: baseTransition(),
  }
}
