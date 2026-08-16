import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStageSlot } from '../app/AppShell'
import { Dropzone } from '../app/Dropzone'
import { FileCard } from '../app/FileCard'
import { QrDisplay } from '../app/OpticalStage/QrDisplay'
import { SettingsSheet } from '../app/SettingsSheet'
import { Button } from '../primitives/Button'
import { Feedback } from '../primitives/Feedback'
import { Icon } from '../primitives/Icon'
import { Spinner } from '../primitives/Spinner'
import { useI18n } from '../../i18n'
import { formatBytes, formatNumber } from '../../lib/format'
import { sizeLevel } from '../../lib/transfer/config'
import { resolveSettings, type TransferSettings as Settings } from '../../lib/transfer/profiles'
import { buildTransfer } from '../../lib/transfer/transfer'
import type { PreparedTransfer } from '../../lib/transfer/types'
import { AnimatedQR } from './AnimatedQR'
import { LargeTextEditor } from './LargeTextEditor'
import { renderFrameImages } from './qrFrames'
import { SourceSelector } from './SourceSelector'
import { TransferSummary } from './TransferSummary'
import { usePreparedPayload, useTextBytes, type SourceKind } from './usePreparedPayload'
import styles from './SendFlow.module.css'

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
  const stageNode = useStageSlot()
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
      <div className={styles.preparing}>
        <Spinner size="md" aria-label={t.preparing} />
        <p className={styles.preparingLabel}>{t.preparing}</p>
        <Button variant="secondary" onClick={cancelPreparing}>
          {t.cancel}
        </Button>
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
    <div className={styles.panel}>
      <SourceSelector value={source} onChange={onSourceChange} />
      {source === 'text' ? (
        <LargeTextEditor
          value={text}
          onChange={onTextChange}
          title={t.editorLabel}
          placeholder={t.editorPlaceholder}
          footer={
            <span>
              {formatNumber(text.length)} {t.characters} · {formatBytes(textBytes)}
            </span>
          }
        />
      ) : file === null ? (
        <Dropzone
          onSelect={selectFile}
          title={t.dropFileHere}
          chooseLabel={t.chooseFile}
          hint={t.oneFileHint}
        />
      ) : (
        <FileCard
          file={file}
          onChange={selectFile}
          onRemove={() => {
            setMultiDropNotice(false)
            onFileChange(null)
          }}
          unnamedLabel={t.unnamedFile}
          unknownTypeLabel={t.unknownType}
          changeLabel={t.changeFile}
          removeLabel={t.removeFile}
        />
      )}
      {source === 'file' && multiDropNotice && file !== null && (
        <Feedback level="notice" title={t.multiDropNotice(file.name)} />
      )}
      <TransferSummary state={payloadState} settings={resolved} />
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
          <Icon name="settings" size={16} />
          {t.settings} · {t.profileNames[resolved.profile.id]}
        </Button>
        <Button variant="primary" disabled={!canStart} onClick={() => void start()}>
          {t.startTransfer}
        </Button>
      </div>
      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        onChange={onSettingsChange}
        onClose={() => setSettingsOpen(false)}
      />
      {stageNode &&
        createPortal(
          <QrDisplay
            isEmpty
            error={false}
            errorLabel=""
            placeholderLabel={t.qrPlaceholder}
            canvasRef={{ current: null }}
          />,
          stageNode,
        )}
    </div>
  )
}
