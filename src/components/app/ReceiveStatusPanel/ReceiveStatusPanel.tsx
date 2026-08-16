import { Card } from '../../primitives/Card'
import { Chip } from '../../primitives/Chip'
import { Icon, type IconName } from '../../primitives/Icon'
import { ProgressBar } from '../../primitives/ProgressBar'
import { formatBytes } from '../../../lib/format'
import type { Progress, ReceiverState } from '../../large-transfer/useTransferScanner'
import styles from './ReceiveStatusPanel.module.css'

/** Longest list of missing frames worth rendering as chips; beyond this it stops being readable. */
const MAX_LISTED_MISSING = 200

export type NonTerminalState = Extract<
  ReceiverState,
  { status: 'idle' | 'scanning' | 'receiving' | 'assembling' }
>

export interface ReceiveStatusPanelProps {
  state: NonTerminalState
  title: string
  sourceLabel: string
  receivingLabel: string
  missingFramesLabel: string
  framesProgress: (received: number, total: number) => string
}

const ICON_BY_STATUS: Record<NonTerminalState['status'], IconName> = {
  idle: 'camera',
  scanning: 'scan-line',
  receiving: 'zap',
  assembling: 'loader-circle',
}

function metaLine(progress: Progress, sourceLabel: string): string {
  if (progress.metadata === null) return ''
  return progress.metadata.type === 'file'
    ? `${progress.metadata.filename} · ${formatBytes(progress.metadata.originalSize)}`
    : `${sourceLabel} · ${formatBytes(progress.metadata.originalSize)}`
}

/**
 * The in-progress states of `useTransferScanner` (idle/scanning/receiving/assembling) as one
 * card: status icon, title, right-aligned meta, body copy, and — once frames are arriving — a
 * progress sub-block. `complete`/`error` are rendered by the caller instead (`ResultPanel`,
 * `Feedback`), so this component never receives them.
 */
export function ReceiveStatusPanel({
  state,
  title,
  sourceLabel,
  receivingLabel,
  missingFramesLabel,
  framesProgress,
}: ReceiveStatusPanelProps) {
  const progress =
    state.status === 'receiving' || state.status === 'assembling' ? state.progress : null
  const percent =
    progress !== null && progress.total > 0
      ? Math.round((progress.received / progress.total) * 100)
      : 0

  return (
    <Card radius="card" className={styles.card} aria-live="polite">
      <div className={styles.header}>
        <span className={styles.headerLeft}>
          <Icon
            name={ICON_BY_STATUS[state.status]}
            size={16}
            className={state.status === 'assembling' ? styles.spin : undefined}
          />
          <span className={styles.title}>{title}</span>
        </span>
        {progress !== null && <span className={styles.meta}>{percent}%</span>}
      </div>
      {progress !== null && (
        <div className={styles.progress}>
          {progress.metadata !== null && (
            <p className={styles.progressMeta}>{metaLine(progress, sourceLabel)}</p>
          )}
          <ProgressBar
            value={progress.received}
            max={progress.total}
            label={framesProgress(progress.received, progress.total)}
          />
          <p className={styles.progressLabel}>{receivingLabel}</p>
          {progress.missing.length > 0 && progress.missing.length <= MAX_LISTED_MISSING && (
            <details className={styles.missing}>
              <summary className={styles.missingSummary}>{missingFramesLabel}</summary>
              <div className={styles.missingList}>
                {progress.missing.map((index) => (
                  <Chip key={index}>{index + 1}</Chip>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </Card>
  )
}
