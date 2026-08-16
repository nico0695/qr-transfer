import * as m from 'motion/react-m'
import { useState, type ReactNode } from 'react'
import { MobileViewSwitcher, type PaneView } from '../MobileViewSwitcher'
import styles from './AppShell.module.css'
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
  const reduced = useReducedMotion()
  const isDesktop = useIsDesktop()

  const composePane = paneSwitch(-1)
  const stagePane = paneSwitch(1)
  const composeActive = isDesktop || view === 'compose'
  const stageActive = isDesktop || view === 'stage'
  const transition = reducedTransition(composePane.transition, reduced)

  return (
    <div className={styles.shell}>
      {header}
      <div className={styles.body} data-view={view}>
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
      <MobileViewSwitcher
        view={view}
        onChange={onViewChange}
        composeLabel={composeLabel}
        stageLabel={stageLabel}
        groupLabel={viewGroupLabel}
      />
    </div>
  )
}
