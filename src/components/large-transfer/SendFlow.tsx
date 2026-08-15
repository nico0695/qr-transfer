import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { prepareTransfer } from '../../lib/transfer/transfer'
import type { PreparedTransfer } from '../../lib/transfer/types'
import { AnimatedQR } from './AnimatedQR'
import { ContentStats } from './ContentStats'
import { describeContent, useContentStats } from './useContentStats'
import { LargeTextEditor } from './LargeTextEditor'
import { renderFrameImages } from './qrFrames'
import { TransferSummary } from './TransferSummary'

type SenderState =
  | { status: 'editing' }
  | { status: 'preparing' }
  | { status: 'ready'; transfer: PreparedTransfer; images: string[] }
  | { status: 'transferring'; transfer: PreparedTransfer; images: string[] }

interface SendFlowProps {
  text: string
  onTextChange: (text: string) => void
  frameMs: number
  onFrameMsChange: (ms: number) => void
}

export function SendFlow({ text, onTextChange, frameMs, onFrameMsChange }: SendFlowProps) {
  const t = useI18n()
  const [state, setState] = useState<SenderState>({ status: 'editing' })
  const stats = useContentStats(text)
  const prepareTokenRef = useRef(0)

  // Abandon an in-flight preparation if the component unmounts.
  useEffect(() => () => void (prepareTokenRef.current += 1), [])

  const startPreparing = async () => {
    const token = ++prepareTokenRef.current
    const isCancelled = () => prepareTokenRef.current !== token
    setState({ status: 'preparing' })
    try {
      const transfer = await prepareTransfer(text)
      if (isCancelled()) return
      const images = await renderFrameImages(transfer.frames, isCancelled)
      if (isCancelled()) return
      setState({ status: 'ready', transfer, images })
    } catch {
      if (!isCancelled()) setState({ status: 'editing' })
    }
  }

  const cancelPreparing = () => {
    prepareTokenRef.current += 1
    setState({ status: 'editing' })
  }

  const { tooLarge } = describeContent(text)

  switch (state.status) {
    case 'editing':
      return (
        <div className="panel">
          <LargeTextEditor
            value={text}
            onChange={onTextChange}
            title={t.editorLabel}
            placeholder={t.editorPlaceholder}
            footer={<ContentStats text={text} stats={stats} />}
          />
          <div className="actions actions-end">
            <button
              type="button"
              className="button button-primary"
              disabled={text === '' || tooLarge}
              onClick={() => void startPreparing()}
            >
              {t.prepareTransfer}
            </button>
          </div>
        </div>
      )
    case 'preparing':
      return (
        <div className="panel panel-center">
          <p className="hint">{t.preparing}</p>
          <button type="button" className="button" onClick={cancelPreparing}>
            {t.cancel}
          </button>
        </div>
      )
    case 'ready':
      return (
        <TransferSummary
          transfer={state.transfer}
          frameMs={frameMs}
          onStart={() => setState({ ...state, status: 'transferring' })}
          onBack={() => setState({ status: 'editing' })}
        />
      )
    case 'transferring':
      return (
        <AnimatedQR
          images={state.images}
          frameMs={frameMs}
          onFrameMsChange={onFrameMsChange}
          onStop={() => setState({ ...state, status: 'ready' })}
        />
      )
  }
}
