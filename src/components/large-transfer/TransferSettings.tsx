import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n'
import { FRAME_MS_PRESETS } from '../../lib/transfer/config'
import {
  DEFAULT_SETTINGS,
  PROFILE_IDS,
  TRANSFER_PROFILES,
  isFrameMsPreset,
  type TransferSettings as Settings,
} from '../../lib/transfer/profiles'

interface TransferSettingsProps {
  open: boolean
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
}

/**
 * Native <dialog> modal: focus trap, Escape and focus restoration come for free.
 * Profiles are real radio inputs; the only advanced option is the frame duration override.
 */
export function TransferSettings({ open, settings, onChange, onClose }: TransferSettingsProps) {
  const t = useI18n()
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const profileFrameMs = TRANSFER_PROFILES[settings.profile].frameMs
  const frameValue = isFrameMsPreset(settings.frameMs) ? String(settings.frameMs) : ''

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="transfer-settings-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // Click on the backdrop (outside the dialog box) closes it.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-body">
        <div className="dialog-header">
          <h2 id="transfer-settings-title" className="dialog-title">
            {t.settingsTitle}
          </h2>
          <button
            type="button"
            className="button button-small"
            onClick={onClose}
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <fieldset className="profile-list">
          <legend className="field-label">{t.profileLabel}</legend>
          {PROFILE_IDS.map((id) => (
            <label key={id} className="profile-option">
              <input
                type="radio"
                name="transfer-profile"
                value={id}
                checked={settings.profile === id}
                onChange={() => onChange({ ...settings, profile: id })}
              />
              <span>
                <span className="profile-name">{t.profileNames[id]}</span>
                <span className="hint">{t.profileDescriptions[id]}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <details className="advanced">
          <summary>{t.advanced}</summary>
          <label className="field-label advanced-field">
            {t.frameDuration}
            <select
              className="select"
              value={frameValue}
              onChange={(event) => {
                const value = Number(event.target.value)
                const next = { ...settings }
                if (isFrameMsPreset(value)) next.frameMs = value
                else delete next.frameMs
                onChange(next)
              }}
            >
              <option value="">{t.profileDefault(profileFrameMs)}</option>
              {FRAME_MS_PRESETS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms} ms
                </option>
              ))}
            </select>
          </label>
        </details>

        <div className="actions actions-between">
          <button type="button" className="button" onClick={() => onChange(DEFAULT_SETTINGS)}>
            {t.resetDefaults}
          </button>
          <button type="button" className="button button-primary" onClick={onClose}>
            {t.done}
          </button>
        </div>
      </div>
    </dialog>
  )
}
