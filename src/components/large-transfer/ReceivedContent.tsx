import { useMemo, useState } from 'react'
import { CopyButton } from '../CopyButton'
import { useI18n } from '../../i18n'
import { formatBytes, formatNumber } from '../../lib/format'
import { utf8Encode } from '../../lib/transfer/encoding'
import { LargeTextEditor } from './LargeTextEditor'

interface ReceivedContentProps {
  text: string
  onScanAnother: () => void
}

export function ReceivedContent({ text, onScanAnother }: ReceivedContentProps) {
  const t = useI18n()
  const [showViewer, setShowViewer] = useState(false)
  const bytes = useMemo(() => utf8Encode(text).length, [text])

  return (
    <section className="panel received">
      <div className="received-summary">
        <h2 className="received-title">{t.transferComplete}</h2>
        <ul className="stats-list stats-center">
          <li>
            {formatNumber(text.length)} {t.characters}
          </li>
          <li>{formatBytes(bytes)}</li>
          <li className="verified">✓ {t.verified}</li>
        </ul>
        <div className="actions actions-center">
          <CopyButton text={text} label={t.copyAll} primary />
          <button
            type="button"
            className="button"
            aria-pressed={showViewer}
            onClick={() => setShowViewer((v) => !v)}
          >
            {showViewer ? t.hideContent : t.viewContent}
          </button>
          <button type="button" className="button" onClick={onScanAnother}>
            {t.scanAnother}
          </button>
        </div>
      </div>
      {showViewer && (
        <LargeTextEditor
          value={text}
          title={t.receivedContent}
          tall
          extraActions={<CopyButton text={text} label={t.copyAll} small />}
        />
      )}
    </section>
  )
}
