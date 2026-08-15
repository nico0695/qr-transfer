import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { formatBytes, formatNumber } from '../../lib/format'
import { sizeLevel } from '../../lib/transfer/config'
import { resolveSettings, type TransferSettings as Settings } from '../../lib/transfer/profiles'
import { buildTransfer } from '../../lib/transfer/transfer'
import type { PreparedTransfer } from '../../lib/transfer/types'
import { AnimatedQR } from './AnimatedQR'
import { FileInput } from './FileInput'
import { FilePreview } from './FilePreview'
import { LargeTextEditor } from './LargeTextEditor'
import { renderFrameImages } from './qrFrames'
import { SourceSelector } from './SourceSelector'
import { TransferSettings } from './TransferSettings'
import { TransferSummary } from './TransferSummary'
import { usePreparedPayload, useTextBytes, type SourceKind } from './usePreparedPayload'

type SenderState =
  | { status: 'editing' }
  | { status: 'preparing' }
  | { status: 'transferring'; transfer: PreparedTransfer; images: string[] }

interface SendFlowProps {
  source: SourceKind
  onSourceChange: (source: SourceKind) => void
  text: string
  onTextChange: (text: string) => void
  file: File | null
  onFileChange: (file: File | null) => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
}

export function SendFlow({
  source,
  onSourceChange,
  text,
  onTextChange,
  file,
  onFileChange,
  settings,
  onSettingsChange,
}: SendFlowProps) {
  const t = useI18n()
  const [state, setState] = useState<SenderState>({ status: 'editing' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [multiDropNotice, setMultiDropNotice] = useState(false)
  const payloadState = usePreparedPayload(source, text, file)
  const textBytes = useTextBytes(text)
  const resolved = resolveSettings(settings)
  const renderTokenRef = useRef(0)

  // Abandon an in-flight QR rendering if the component unmounts.
  useEffect(() => () => void (renderTokenRef.current += 1), [])

  const canStart =
    payloadState.status === 'ready' &&
    sizeLevel(payloadState.payload.stats.transferBytes) !== 'tooLarge'

  const start = async () => {
    if (payloadState.status !== 'ready') return
    const token = ++renderTokenRef.current
    const isCancelled = () => renderTokenRef.current !== token
    setState({ status: 'preparing' })
    try {
      const transfer = buildTransfer(payloadState.payload, resolved.chunkSize)
      const images = await renderFrameImages(transfer.frames, resolved.errorCorrection, isCancelled)
      if (isCancelled()) return
      setState({ status: 'transferring', transfer, images })
    } catch {
      if (!isCancelled()) setState({ status: 'editing' })
    }
  }

  const cancelPreparing = () => {
    renderTokenRef.current += 1
    setState({ status: 'editing' })
  }

  const selectFile = (selected: File, droppedCount: number) => {
    setMultiDropNotice(droppedCount > 1)
    onFileChange(selected)
  }

  if (state.status === 'preparing') {
    return (
      <div className="panel panel-center">
        <p className="hint">{t.preparing}</p>
        <button type="button" className="button" onClick={cancelPreparing}>
          {t.cancel}
        </button>
      </div>
    )
  }

  if (state.status === 'transferring') {
    return (
      <AnimatedQR
        images={state.images}
        frameMs={resolved.frameMs}
        profileName={t.profileNames[resolved.profile.id]}
        onFrameMsChange={(ms) => onSettingsChange({ ...settings, frameMs: ms })}
        onStop={() => setState({ status: 'editing' })}
      />
    )
  }

  return (
    <div className="panel">
      <SourceSelector value={source} onChange={onSourceChange} />
      {source === 'text' ? (
        <LargeTextEditor
          value={text}
          onChange={onTextChange}
          title={t.editorLabel}
          placeholder={t.editorPlaceholder}
          footer={
            <ul className="stats-list">
              <li>
                {formatNumber(text.length)} {t.characters}
              </li>
              <li>{formatBytes(textBytes)}</li>
            </ul>
          }
        />
      ) : file === null ? (
        <FileInput onSelect={selectFile} />
      ) : (
        <FilePreview
          file={file}
          onChange={selectFile}
          onRemove={() => {
            setMultiDropNotice(false)
            onFileChange(null)
          }}
        />
      )}
      {source === 'file' && multiDropNotice && file !== null && (
        <p className="notice">{t.multiDropNotice(file.name)}</p>
      )}
      <TransferSummary state={payloadState} settings={resolved} />
      <div className="actions actions-between">
        <button type="button" className="button" onClick={() => setSettingsOpen(true)}>
          {t.settings}
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={!canStart}
          onClick={() => void start()}
        >
          {t.startTransfer}
        </button>
      </div>
      <TransferSettings
        open={settingsOpen}
        settings={settings}
        onChange={onSettingsChange}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
