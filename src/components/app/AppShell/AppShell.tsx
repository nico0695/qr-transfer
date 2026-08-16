import * as m from 'motion/react-m'
import { useMemo, useState, type ReactNode } from 'react'
import { MobileViewSwitcher, type PaneView } from '../MobileViewSwitcher'
import styles from './AppShell.module.css'
import { ShellLayoutContext, type ShellLayout } from './ShellLayoutContext'
import { StageSlotContext } from './StageSlotContext'
import { reducedTransition, useReducedMotion } from '../../../lib/motion/reducedMotion'
import { paneSwitch } from '../../../lib/motion/presets'
import { useIsDesktop } from '../../../lib/theme/useIsDesktop'

export interface AppShellProps {
  header: ReactNode
  compose: ReactNode
  view: PaneView
  onViewChange: (view: PaneView) => void
  composeLabel: string
  stageLabel: string
  viewGroupLabel: string
}

export function AppShell({
  header,
  compose,
  view,
  onViewChange,
  composeLabel,
  stageLabel,
  viewGroupLabel,
}: AppShellProps) {
  const [stageNode, setStageNode] = useState<HTMLDivElement | null>(null)
  const [layout, setLayout] = useState<ShellLayout>('split')
  const reduced = useReducedMotion()
  const isDesktop = useIsDesktop()

  const composePane = paneSwitch(-1)
  const stagePane = paneSwitch(1)
  const composeActive =
    layout === 'compose-hero'
      ? true
      : layout === 'stage-hero'
        ? false
        : isDesktop || view === 'compose'
  const stageActive =
    layout === 'stage-hero'
      ? true
      : layout === 'compose-hero'
        ? false
        : isDesktop || view === 'stage'
  const transition = reducedTransition(composePane.transition, reduced)

  const shellLayout = useMemo(
    () => ({ layout, setLayout, setView: onViewChange }),
    [layout, onViewChange],
  )

  return (
    <div className={styles.shell}>
      {header}
      <ShellLayoutContext.Provider value={shellLayout}>
        <div className={styles.body} data-view={view} data-layout={layout}>
          <m.div
            className={styles.compose}
            initial={false}
            animate={composeActive ? composePane.active : composePane.inactive}
            transition={transition}
            aria-hidden={!composeActive || undefined}
            inert={!composeActive || undefined}
          >
            <StageSlotContext.Provider value={stageNode}>{compose}</StageSlotContext.Provider>
          </m.div>
          <m.div
            className={styles.stage}
            ref={setStageNode}
            initial={false}
            animate={stageActive ? stagePane.active : stagePane.inactive}
            transition={transition}
            aria-hidden={!stageActive || undefined}
            inert={!stageActive || undefined}
          />
        </div>
      </ShellLayoutContext.Provider>
      {layout === 'split' && (
        <MobileViewSwitcher
          view={view}
          onChange={onViewChange}
          composeLabel={composeLabel}
          stageLabel={stageLabel}
          groupLabel={viewGroupLabel}
        />
      )}
    </div>
  )
}
