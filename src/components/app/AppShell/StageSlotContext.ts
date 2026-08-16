import { createContext, useContext } from 'react'

/**
 * The `stage` pane's DOM node, so a screen rendered inside `compose` (one component instance,
 * one set of hooks — critically, one camera lifecycle) can `createPortal` its QR/camera chrome
 * into `stage` without needing a second, separately-mounted component instance.
 */
export const StageSlotContext = createContext<HTMLDivElement | null>(null)

export function useStageSlot(): HTMLDivElement | null {
  return useContext(StageSlotContext)
}
