import { useI18n } from '../../i18n'
import { formatBytes, formatNumber } from '../../lib/format'
import { LARGE_BYTES, MAX_INPUT_BYTES } from '../../lib/transfer/config'
import type { TransferStats } from '../../lib/transfer/types'
import { describeContent } from './useContentStats'

interface ContentStatsProps {
  text: string
  stats: TransferStats | null
}

export function ContentStats({ text, stats }: ContentStatsProps) {
  const t = useI18n()
  const { originalBytes, tooLarge } = describeContent(text)

  return (
    <div className="stats">
      <ul className="stats-list">
        <li>
          {formatNumber(text.length)} {t.characters}
        </li>
        <li>
          {formatBytes(originalBytes)} {t.original}
        </li>
        {tooLarge ? null : stats === null ? (
          <li>{t.calculating}</li>
        ) : (
          <>
            <li>
              {formatBytes(stats.compressedBytes)} {t.compressed}
            </li>
            <li>
              {Math.round(stats.ratio * 100)}% {t.smaller}
            </li>
            <li>
              {formatNumber(stats.frames)} {stats.frames === 1 ? t.qrFrame : t.qrFrames}
            </li>
          </>
        )}
      </ul>
      {tooLarge && <p className="error">{t.tooLargeError(formatBytes(MAX_INPUT_BYTES))}</p>}
      {!tooLarge && stats !== null && originalBytes >= LARGE_BYTES && (
        <p className="notice">
          <strong>{t.largeTransferWarning}</strong> — {t.largeTransferWarningBody(stats.frames)}
        </p>
      )}
    </div>
  )
}
