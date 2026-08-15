import { useState } from 'react'
import { useI18n } from '../../i18n'
import { DEFAULT_FRAME_MS } from '../../lib/transfer/config'
import { SendFlow } from './SendFlow'
import { TransferScanner } from './TransferScanner'

type Direction = 'send' | 'receive'

export default function LargeTransfer() {
  const t = useI18n()
  const [direction, setDirection] = useState<Direction>('send')
  // Kept here so switching between Send and Receive does not lose the draft or speed setting.
  const [text, setText] = useState('')
  const [frameMs, setFrameMs] = useState(DEFAULT_FRAME_MS)

  return (
    <div className="large-transfer">
      <div className="tabs" role="tablist" aria-label={t.navLarge}>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={direction === 'send'}
          onClick={() => setDirection('send')}
        >
          {t.send}
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={direction === 'receive'}
          onClick={() => setDirection('receive')}
        >
          {t.receive}
        </button>
      </div>
      {direction === 'send' ? (
        <SendFlow
          text={text}
          onTextChange={setText}
          frameMs={frameMs}
          onFrameMsChange={setFrameMs}
        />
      ) : (
        <TransferScanner />
      )}
    </div>
  )
}
