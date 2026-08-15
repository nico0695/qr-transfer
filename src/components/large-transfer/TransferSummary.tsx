import { useI18n } from '../../i18n'
import { formatBytes, formatNumber, formatSeconds } from '../../lib/format'
import type { PreparedTransfer } from '../../lib/transfer/types'

interface TransferSummaryProps {
  transfer: PreparedTransfer
  frameMs: number
  onStart: () => void
  onBack: () => void
}

export function TransferSummary({ transfer, frameMs, onStart, onBack }: TransferSummaryProps) {
  const t = useI18n()
  const { stats } = transfer
  return (
    <section className="panel summary">
      <dl className="summary-list">
        <div>
          <dt>{t.summaryOriginal}</dt>
          <dd>{formatBytes(stats.originalBytes)}</dd>
        </div>
        <div>
          <dt>{t.summaryCompressed}</dt>
          <dd>{formatBytes(stats.compressedBytes)}</dd>
        </div>
        <div>
          <dt>{t.summaryCompression}</dt>
          <dd>{Math.round(stats.ratio * 100)}%</dd>
        </div>
        <div>
          <dt>{t.summaryFrames}</dt>
          <dd>{formatNumber(transfer.total)}</dd>
        </div>
        <div>
          <dt>{t.summaryLoop}</dt>
          <dd>~{formatSeconds(transfer.total * frameMs)}</dd>
        </div>
      </dl>
      <p className="hint">{t.summaryLoopHint}</p>
      <div className="actions actions-center">
        <button type="button" className="button" onClick={onBack}>
          {t.back}
        </button>
        <button type="button" className="button button-primary" onClick={onStart}>
          {t.startTransfer}
        </button>
      </div>
    </section>
  )
}
