import type { CSSProperties } from 'react'
import { useI18n } from '../../i18n'
import { DEFAULT_CAMERA } from '../../lib/camera'
import { DEBUG_ENABLED } from '../../lib/debug'
import { DEFAULT_CROP_RATIO } from '../../lib/scan/roi'
import { ReceivedContent } from './ReceivedContent'
import { ReceivedFile } from './ReceivedFile'
import { ReceiveProgress } from './ReceiveProgress'
import { ScanDebug } from './ScanDebug'
import { SCAN_REGION_ID, useTransferScanner } from './useTransferScanner'

export function TransferScanner() {
  const t = useI18n()
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

  const showCamera =
    state.status === 'idle' || state.status === 'scanning' || state.status === 'receiving'
  // Counts accepted frames, so it changes exactly when new information arrives — duplicates and
  // failed captures leave it alone.
  const framesReceived = state.status === 'receiving' ? state.progress.received : 0

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
      <div
        id={SCAN_REGION_ID}
        className={`camera-region${engine === 'wasm' ? ' is-framed' : ''}`}
        hidden={!showCamera}
      >
        {engine === 'wasm' && (
          <div
            className="scan-guide"
            style={{ '--scan-crop': `${DEFAULT_CROP_RATIO * 100}%` } as CSSProperties}
          >
            {/* Remounted on every accepted frame, which restarts the fade. While frames keep
                arriving the highlight is renewed before it expires and simply stays on; when they
                stop it goes out by itself. No timers, and no strobing on duplicate reads.
                Withheld until the first frame lands, so mounting the scanner does not animate a
                hit that never happened. */}
            {framesReceived > 0 && <div className="scan-guide-hit" key={framesReceived} />}
          </div>
        )}
      </div>
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
