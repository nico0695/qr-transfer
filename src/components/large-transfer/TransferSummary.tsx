import { AnimatePresence } from 'motion/react'
import { SummaryGrid, type SummaryGridCell } from '../app/SummaryGrid'
import { Feedback } from '../primitives/Feedback'
import { Spinner } from '../primitives/Spinner'
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
    return <Spinner size="sm" aria-label={t.preparing} />
  }
  if (state.status === 'error') {
    return (
      <Feedback
        level="error"
        title={state.error === 'sourceTooLarge' ? t.sourceTooLargeError : t.readFailedError}
      />
    )
  }

  const { stats, metadata } = state.payload
  const frames = countFrames(stats.transferBytes, settings.chunkSize)
  const level = sizeLevel(stats.transferBytes)
  const profileName = t.profileNames[settings.profile.id]

  const cells: SummaryGridCell[] = []
  if (metadata.type === 'file') {
    cells.push({ key: 'filename', label: t.summaryFilename, value: metadata.filename })
  }
  if (stats.characters !== null) {
    cells.push({
      key: 'characters',
      label: t.summaryCharacters,
      value: formatNumber(stats.characters),
    })
  }
  cells.push(
    { key: 'original', label: t.summaryOriginal, value: formatBytes(stats.originalBytes) },
    { key: 'transfer', label: t.summaryTransfer, value: formatBytes(stats.transferBytes) },
    {
      key: 'compression',
      label: t.summaryCompression,
      value: stats.compression === 'gzip' ? `${Math.round(stats.ratio * 100)}%` : t.none,
    },
    { key: 'frames', label: t.summaryFrames, value: formatNumber(frames) },
    {
      key: 'loop',
      label: t.summaryLoop,
      value: `~${formatDuration(frames * settings.frameMs)} · ${profileName}`,
    },
  )

  return (
    <>
      <SummaryGrid cells={cells} />
      <AnimatePresence mode="wait">
        {level === 'tooLarge' && (
          <Feedback
            key="too-large"
            level="error"
            title={t.tooLargeError(formatBytes(MAX_TRANSFER_BYTES))}
          />
        )}
        {(level === 'large' || level === 'veryLarge') && (
          <Feedback
            key="size-warning"
            level="notice"
            title={level === 'large' ? t.largeTransferWarning : t.veryLargeTransferWarning}
          >
            {t.largeTransferWarningBody(frames)}
          </Feedback>
        )}
      </AnimatePresence>
    </>
  )
}
