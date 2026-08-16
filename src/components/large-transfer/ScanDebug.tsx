import { useState } from 'react'
import { Button } from '../primitives/Button'
import { cx } from '../../lib/cx'
import { copyText } from '../../lib/clipboard'
import { SCAN_FIELDS, formatScanReport, type ScanStatsSnapshot } from '../../lib/transfer/scanStats'
import styles from './ScanDebug.module.css'

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
    <div className={styles.debug}>
      <dl className={styles.list}>
        {SCAN_FIELDS.map((field) => (
          <div key={field.label} className={cx(field.label === 'sightings' && styles.sightings)}>
            <dt>{field.label}</dt>
            <dd>{field.render(stats)}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={() => void copy()}>
          {copied === 'ok' ? 'copied' : copied === 'failed' ? 'copy failed' : 'copy report'}
        </Button>
      </div>
    </div>
  )
}
