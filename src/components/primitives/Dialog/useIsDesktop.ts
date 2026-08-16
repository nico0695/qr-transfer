import { useEffect, useState } from 'react'
import { BREAKPOINT_DESKTOP } from '../../../lib/theme/breakpoints'

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia(`(min-width: ${BREAKPOINT_DESKTOP}px)`).matches,
  )

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${BREAKPOINT_DESKTOP}px)`)
    const listener = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  return isDesktop
}
