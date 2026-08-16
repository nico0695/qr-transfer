import { AnimatePresence } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useShellLayout, useStageSlot } from '../app/AppShell'
import { Dropzone } from '../app/Dropzone'
import { FileCard } from '../app/FileCard'
import { QrDisplay } from '../app/OpticalStage/QrDisplay'
import { SendingStrip } from '../app/SendingStrip'
import { SettingsSheet } from '../app/SettingsSheet'
import { Button } from '../primitives/Button'
import { Feedback } from '../primitives/Feedback'
import { Icon } from '../primitives/Icon'
import { useI18n } from '../../i18n'
import { formatBytes, formatNumber } from '../../lib/format'
import { sizeLevel } from '../../lib/transfer/config'
import { resolveSettings, type TransferSettings as Settings } from '../../lib/transfer/profiles'
import { buildTransfer, countFrames } from '../../lib/transfer/transfer'
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
  const { setLayout, setView } = useShellLayout()
  const [state, setState] = useState<SenderState>({ status: 'editing' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [multiDropNotice, setMultiDropNotice] = useState(false)
  const payloadState = usePreparedPayload(source, text, file)
  const textBytes = useTextBytes(text)
  const resolved = resolveSettings(settings)
  const renderTokenRef = useRef(0)

  // Abandon an in-flight QR rendering if the component unmounts.
  useEffect(() => () => void (renderTokenRef.current += 1), [])

  useLayoutEffect(() => {
    setLayout(state.status === 'editing' ? 'compose-hero' : 'stage-hero')
    setView(state.status === 'editing' ? 'compose' : 'stage')
  }, [state.status, setLayout, setView])

  useEffect(() => () => setLayout('split'), [setLayout])

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

  const profileName = t.profileNames[resolved.profile.id]
  const readyPayload = payloadState.status === 'ready' ? payloadState.payload : null
  const frameCount =
    readyPayload === null ? 0 : countFrames(readyPayload.stats.transferBytes, resolved.chunkSize)
  const sendingMeta =
    readyPayload === null
      ? ''
      : source === 'text'
        ? t.sendingMetaText(formatNumber(text.length), formatNumber(frameCount), profileName)
        : t.sendingMetaFile(
            file?.name || t.unnamedFile,
            formatBytes(readyPayload.stats.transferBytes),
            formatNumber(frameCount),
            profileName,
          )
  const sendingStrip = (
    <SendingStrip
      live={state.status === 'transferring'}
      title={state.status === 'preparing' ? t.preparing : t.sending}
      meta={sendingMeta}
    />
  )

  return (
    <div className={styles.panel}>
      <div className={styles.scroll}>
        <SourceSelector value={source} onChange={onSourceChange} />
        {source === 'text' ? (
          <div className={styles.fill}>
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
          </div>
        ) : file === null ? (
          <div className={styles.fill}>
            <Dropzone
              onSelect={selectFile}
              title={t.dropFileHere}
              chooseLabel={t.chooseFile}
              hint={t.oneFileHint}
            />
          </div>
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
        <AnimatePresence>
          {source === 'file' && multiDropNotice && file !== null && (
            <Feedback key="multi-drop-notice" level="notice" title={t.multiDropNotice(file.name)} />
          )}
        </AnimatePresence>
        <TransferSummary state={payloadState} settings={resolved} />
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
          <Icon name="settings" size={16} />
          {t.settings} · {profileName}
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
      {state.status === 'preparing' &&
        stageNode &&
        createPortal(
          <QrDisplay
            isEmpty={false}
            error={false}
            errorLabel=""
            placeholderLabel=""
            header={sendingStrip}
            preparing={{
              label: t.preparing,
              action: (
                <Button variant="secondary" onClick={cancelPreparing}>
                  {t.cancel}
                </Button>
              ),
            }}
          />,
          stageNode,
        )}
      {state.status === 'transferring' && (
        <AnimatedQR
          images={state.images}
          frameMs={resolved.frameMs}
          profileName={profileName}
          header={sendingStrip}
          onFrameMsChange={(ms) => onSettingsChange({ ...settings, frameMs: ms })}
          onStop={() => setState({ status: 'editing' })}
        />
      )}
    </div>
  )
}
