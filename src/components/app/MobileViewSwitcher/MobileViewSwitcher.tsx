import { Icon } from '../../primitives/Icon'
import styles from './MobileViewSwitcher.module.css'

export type PaneView = 'compose' | 'stage'

export interface MobileViewSwitcherProps {
  view: PaneView
  onChange: (view: PaneView) => void
  composeLabel: string
  stageLabel: string
  groupLabel: string
}

export function MobileViewSwitcher({
  view,
  onChange,
  composeLabel,
  stageLabel,
  groupLabel,
}: MobileViewSwitcherProps) {
  return (
    <nav className={styles.bar} aria-label={groupLabel}>
      <button
        type="button"
        className={styles.button}
        aria-current={view === 'compose'}
        onClick={() => onChange('compose')}
      >
        <Icon name="file" size={16} />
        {composeLabel}
      </button>
      <button
        type="button"
        className={styles.button}
        aria-current={view === 'stage'}
        onClick={() => onChange('stage')}
      >
        <Icon name="qr-code" size={16} />
        {stageLabel}
      </button>
    </nav>
  )
}
