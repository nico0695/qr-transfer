import { useState, type ReactNode } from 'react'
import { MobileViewSwitcher, type PaneView } from '../MobileViewSwitcher'
import styles from './AppShell.module.css'
import { StageSlotContext } from './StageSlotContext'

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

  return (
    <div className={styles.shell}>
      {header}
      <div className={styles.body} data-view={view}>
        <div className={styles.compose}>
          <StageSlotContext.Provider value={stageNode}>{compose}</StageSlotContext.Provider>
        </div>
        <div className={styles.stage} ref={setStageNode} />
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
