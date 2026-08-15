import { useI18n } from '../../i18n'
import { formatBytes } from '../../lib/format'
import type { Progress } from './useTransferScanner'

/** Longest list of missing frames worth rendering; beyond this it stops being readable. */
const MAX_LISTED_MISSING = 200

export function ReceiveProgress({ progress, label }: { progress: Progress; label: string }) {
  const t = useI18n()
  const percent = progress.total === 0 ? 0 : Math.round((progress.received / progress.total) * 100)
  return (
    <div className="progress">
      <p className="progress-count">{t.framesProgress(progress.received, progress.total)}</p>
      {progress.metadata !== null && (
        <p className="hint progress-meta">
          {progress.metadata.type === 'file'
            ? `${progress.metadata.filename} · ${formatBytes(progress.metadata.originalSize)}`
            : `${t.sourceText} · ${formatBytes(progress.metadata.originalSize)}`}
        </p>
      )}
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="hint">{label}</p>
      {progress.missing.length > 0 && progress.missing.length <= MAX_LISTED_MISSING && (
        <details className="progress-details">
          <summary>{t.missingFrames}</summary>
          <p>{progress.missing.map((i) => i + 1).join(', ')}</p>
        </details>
      )}
    </div>
  )
}
