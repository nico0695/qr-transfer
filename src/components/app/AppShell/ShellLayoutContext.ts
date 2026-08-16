import { createContext, useContext } from 'react'
import type { PaneView } from '../MobileViewSwitcher'

/**
 * How the two shell panes occupy the body.
 * - `split` — compose + stage side by side (≥900) or toggled by the mobile switcher.
 * - `compose-hero` — compose only (Large Transfer send · editing).
 * - `stage-hero` — stage only (Large Transfer send · preparing / transferring).
 */
export type ShellLayout = 'split' | 'compose-hero' | 'stage-hero'

export interface ShellLayoutValue {
  layout: ShellLayout
  setLayout: (layout: ShellLayout) => void
  setView: (view: PaneView) => void
}

export const ShellLayoutContext = createContext<ShellLayoutValue | null>(null)

export function useShellLayout(): ShellLayoutValue {
  const value = useContext(ShellLayoutContext)
  if (value === null) {
    throw new Error('useShellLayout must be used inside AppShell')
  }
  return value
}
