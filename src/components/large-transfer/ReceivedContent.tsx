import { useMemo, useState } from 'react'
import { ResultPanel } from '../app/ResultPanel'
import { Button } from '../primitives/Button'
import { useCopy } from '../../hooks/useCopy'
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
  const { feedback, copy } = useCopy()
  const copyLabel =
    feedback === 'copied' ? t.copied : feedback === 'failed' ? t.copyFailed : t.copyAll

  return (
    <>
      <ResultPanel
        title={t.transferComplete}
        meta={`${formatNumber(text.length)} ${t.characters} · ${formatBytes(bytes)}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void copy(text)}>
              {copyLabel}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              aria-pressed={showViewer}
              onClick={() => setShowViewer((visible) => !visible)}
            >
              {showViewer ? t.hideContent : t.viewContent}
            </Button>
            <Button variant="secondary" size="sm" onClick={onScanAnother}>
              {t.scanAnother}
            </Button>
          </>
        }
      />
      {showViewer && (
        <LargeTextEditor
          value={text}
          title={t.receivedContent}
          tall
          extraActions={
            <Button variant="secondary" size="sm" onClick={() => void copy(text)}>
              {copyLabel}
            </Button>
          }
        />
      )}
    </>
  )
}
