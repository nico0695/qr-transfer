import { useState } from 'react'
import { copyText } from '../../lib/clipboard'
import { SCAN_FIELDS, formatScanReport, type ScanStatsSnapshot } from '../../lib/transfer/scanStats'

/**
 * Diagnostics for tuning the optical channel, shown only with `?debug=1`. Labels are fixed
 * technical English on purpose: this is an instrument, not part of the product surface, so it
 * stays out of the translated dictionary.
 */
export function ScanDebug({ stats }: { stats: ScanStatsSnapshot }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle')

  const copy = async () => {
    const ok = await copyText(formatScanReport(stats))
    setCopied(ok ? 'ok' : 'failed')
    window.setTimeout(() => setCopied('idle'), 2000)
  }

  return (
    <div className="scan-debug">
      <dl>
        {SCAN_FIELDS.map((field) => (
          <div key={field.label} data-field={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.render(stats)}</dd>
          </div>
        ))}
      </dl>
      <div className="actions actions-center">
        <button type="button" className="button button-small" onClick={() => void copy()}>
          {copied === 'ok' ? 'copied' : copied === 'failed' ? 'copy failed' : 'copy report'}
        </button>
      </div>
    </div>
  )
}
