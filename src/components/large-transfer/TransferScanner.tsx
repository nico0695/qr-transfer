import { createPortal } from 'react-dom'
import { useStageSlot } from '../app/AppShell'
import { CameraScanner } from '../app/OpticalStage/CameraScanner'
import { ReceiveStatusPanel, type NonTerminalState } from '../app/ReceiveStatusPanel'
import { Button } from '../primitives/Button'
import { Feedback } from '../primitives/Feedback'
import { useI18n } from '../../i18n'
import { DEFAULT_CAMERA } from '../../lib/camera'
import { DEBUG_ENABLED } from '../../lib/debug'
import { DEFAULT_CROP_RATIO } from '../../lib/scan/roi'
import { ReceivedContent } from './ReceivedContent'
import { ReceivedFile } from './ReceivedFile'
import { ScanDebug } from './ScanDebug'
import { SCAN_REGION_ID, useTransferScanner } from './useTransferScanner'
import styles from './TransferScanner.module.css'

const TITLE_BY_STATUS: Record<
  NonTerminalState['status'],
  (t: ReturnType<typeof useI18n>) => string
> = {
  idle: (t) => t.startingCamera,
  scanning: (t) => t.receiverIdle,
  receiving: (t) => t.receiving,
  assembling: (t) => t.assembling,
}

export function TransferScanner() {
  const t = useI18n()
  const stageNode = useStageSlot()
  const { state, engine, cameras, selection, stats, selectCamera, restart } = useTransferScanner()
  const debug = DEBUG_ENABLED && stats !== null && <ScanDebug stats={stats} />

  if (state.status === 'complete') {
    // The overlay deliberately survives completion: the final numbers are the ones worth having,
    // and unmounting them here is what forced the first measurement to be read mid-scan.
    return (
      <>
        {state.result.type === 'text' ? (
          <ReceivedContent text={state.result.text} onScanAnother={restart} />
        ) : (
          <ReceivedFile file={state.result} onScanAnother={restart} />
        )}
        {debug}
      </>
    )
  }

  if (state.status === 'error') {
    // An incompatible sender can't be fixed by scanning again with the same app version.
    const recoverable = state.key !== 'incompatibleSender'
    const message =
      state.key === 'verificationFailed'
        ? `${t.verificationFailed} ${t.scanAgainHint}`
        : state.key === 'incompatibleSender'
          ? t.incompatibleSender
          : t[state.key]
    return (
      <>
        <Feedback
          level="error"
          title={message}
          actions={
            recoverable && (
              <Button variant="secondary" size="sm" onClick={restart}>
                {t.tryAgain}
              </Button>
            )
          }
        />
        {debug}
      </>
    )
  }

  // Counts accepted frames, so it changes exactly when new information arrives — duplicates and
  // failed captures leave it alone.
  const framesReceived = state.status === 'receiving' ? state.progress.received : 0
  const percent =
    state.status === 'receiving' && state.progress.total > 0
      ? Math.round((state.progress.received / state.progress.total) * 100)
      : 0

  return (
    <>
      {/* Idle has nothing to say beyond "starting" — the camera's own overlay already says
          that, so a status card here would just repeat it. */}
      {state.status !== 'idle' && (
        <ReceiveStatusPanel
          state={state}
          title={TITLE_BY_STATUS[state.status](t)}
          sourceLabel={t.sourceText}
          receivingLabel={state.status === 'assembling' ? t.assembling : t.receiving}
          missingFramesLabel={t.missingFrames}
          framesProgress={t.framesProgress}
        />
      )}
      {debug}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={restart}>
          {t.cancel}
        </Button>
      </div>
      {stageNode &&
        createPortal(
          <CameraScanner
            regionId={SCAN_REGION_ID}
            framed={engine === 'wasm'}
            cropRatio={DEFAULT_CROP_RATIO}
            hitKey={framesReceived}
            cameras={cameras}
            selection={typeof selection === 'string' ? selection : ''}
            onSelectionChange={(value) => selectCamera(value === '' ? DEFAULT_CAMERA : value)}
            cameraLabel={t.cameraLabel}
            cameraDefaultLabel={t.cameraDefault}
            starting={state.status === 'idle'}
            startingLabel={t.startingCamera}
            hint={t.receiverIdle}
            liveLabel={state.status === 'receiving' ? `${percent}%` : t.liveLabel}
          />,
          stageNode,
        )}
    </>
  )
}
