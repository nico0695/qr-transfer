import { useI18n } from '../../i18n'
import { DEFAULT_CAMERA } from '../../lib/camera'
import { DEBUG_ENABLED } from '../../lib/debug'
import { ReceivedContent } from './ReceivedContent'
import { ReceivedFile } from './ReceivedFile'
import { ReceiveProgress } from './ReceiveProgress'
import { ScanDebug } from './ScanDebug'
import { SCAN_REGION_ID, useTransferScanner } from './useTransferScanner'

export function TransferScanner() {
  const t = useI18n()
  const { state, cameras, selection, stats, selectCamera, restart } = useTransferScanner()
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

  const showCamera =
    state.status === 'idle' || state.status === 'scanning' || state.status === 'receiving'

  return (
    <section className="panel receiver">
      {showCamera && cameras.length > 1 && (
        <label className="field-label camera-select">
          {t.cameraLabel}
          <select
            className="select"
            value={typeof selection === 'string' ? selection : ''}
            onChange={(event) =>
              selectCamera(event.target.value === '' ? DEFAULT_CAMERA : event.target.value)
            }
          >
            <option value="">{t.cameraDefault}</option>
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || camera.id}
              </option>
            ))}
          </select>
        </label>
      )}
      <div id={SCAN_REGION_ID} className="camera-region" hidden={!showCamera} />
      {state.status === 'idle' && <p className="hint">{t.startingCamera}</p>}
      {state.status === 'scanning' && <p className="hint">{t.receiverIdle}</p>}
      {(state.status === 'receiving' || state.status === 'assembling') && (
        <ReceiveProgress
          progress={state.progress}
          label={state.status === 'assembling' ? t.assembling : t.receiving}
        />
      )}
      {state.status === 'error' && (
        <div className="result">
          <p className="error">
            {state.key === 'verificationFailed'
              ? `${t.verificationFailed} ${t.scanAgainHint}`
              : state.key === 'incompatibleSender'
                ? t.incompatibleSender
                : t[state.key]}
          </p>
          <div className="actions">
            <button type="button" className="button" onClick={restart}>
              {t.tryAgain}
            </button>
          </div>
        </div>
      )}
      {debug}
      {showCamera && (
        <div className="actions actions-center">
          <button type="button" className="button" onClick={restart}>
            {t.cancel}
          </button>
        </div>
      )}
    </section>
  )
}
