import { useI18n } from '../../i18n'
import { formatBytes, formatDuration, formatNumber } from '../../lib/format'
import { MAX_TRANSFER_BYTES, sizeLevel } from '../../lib/transfer/config'
import type { ResolvedSettings } from '../../lib/transfer/profiles'
import { countFrames } from '../../lib/transfer/transfer'
import type { PayloadState } from './usePreparedPayload'

interface TransferSummaryProps {
  state: PayloadState
  settings: ResolvedSettings
}

/**
 * Live summary of what will be sent: original vs transfer size, compression, frame count and
 * loop duration for the current profile. Recomputed synchronously whenever settings change.
 */
export function TransferSummary({ state, settings }: TransferSummaryProps) {
  const t = useI18n()

  if (state.status === 'idle') return null
  if (state.status === 'preparing') {
    return <p className="hint summary-status">{t.preparing}</p>
  }
  if (state.status === 'error') {
    return (
      <p className="error summary-status">
        {state.error === 'sourceTooLarge' ? t.sourceTooLargeError : t.readFailedError}
      </p>
    )
  }

  const { stats, metadata } = state.payload
  const frames = countFrames(stats.transferBytes, settings.chunkSize)
  const level = sizeLevel(stats.transferBytes)
  const profileName = t.profileNames[settings.profile.id]

  return (
    <div className="summary">
      <dl className="summary-list">
        {metadata.type === 'file' && (
          <div>
            <dt>{t.summaryFilename}</dt>
            <dd className="summary-filename">{metadata.filename}</dd>
          </div>
        )}
        {stats.characters !== null && (
          <div>
            <dt>{t.summaryCharacters}</dt>
            <dd>{formatNumber(stats.characters)}</dd>
          </div>
        )}
        <div>
          <dt>{t.summaryOriginal}</dt>
          <dd>{formatBytes(stats.originalBytes)}</dd>
        </div>
        <div>
          <dt>{t.summaryTransfer}</dt>
          <dd>{formatBytes(stats.transferBytes)}</dd>
        </div>
        <div>
          <dt>{t.summaryCompression}</dt>
          <dd>{stats.compression === 'gzip' ? `${Math.round(stats.ratio * 100)}%` : t.none}</dd>
        </div>
        <div>
          <dt>{t.summaryFrames}</dt>
          <dd>{formatNumber(frames)}</dd>
        </div>
        <div>
          <dt>{t.summaryLoop}</dt>
          <dd>
            ~{formatDuration(frames * settings.frameMs)} · {profileName}
          </dd>
        </div>
      </dl>
      {level === 'tooLarge' && (
        <p className="error">{t.tooLargeError(formatBytes(MAX_TRANSFER_BYTES))}</p>
      )}
      {(level === 'large' || level === 'veryLarge') && (
        <p className="notice">
          <strong>{level === 'large' ? t.largeTransferWarning : t.veryLargeTransferWarning}</strong>{' '}
          — {t.largeTransferWarningBody(frames)}
        </p>
      )}
    </div>
  )
}
