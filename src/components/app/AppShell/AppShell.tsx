import type { ReactNode } from 'react'
import { MobileViewSwitcher, type PaneView } from '../MobileViewSwitcher'
import styles from './AppShell.module.css'

export interface AppShellProps {
  header: ReactNode
  compose: ReactNode
  stage: ReactNode
  view: PaneView
  onViewChange: (view: PaneView) => void
  composeLabel: string
  stageLabel: string
  viewGroupLabel: string
}

export function AppShell({
  header,
  compose,
  stage,
  view,
  onViewChange,
  composeLabel,
  stageLabel,
  viewGroupLabel,
}: AppShellProps) {
  return (
    <div className={styles.shell}>
      {header}
      <div className={styles.body} data-view={view}>
        <div className={styles.compose}>{compose}</div>
        <div className={styles.stage}>{stage}</div>
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
