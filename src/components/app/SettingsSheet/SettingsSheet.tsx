import { Dialog } from '../../primitives/Dialog'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { ProfileOption } from '../ProfileOption'
import { useI18n } from '../../../i18n'
import { FRAME_MS_PRESETS } from '../../../lib/transfer/config'
import {
  DEFAULT_SETTINGS,
  PROFILE_IDS,
  TRANSFER_PROFILES,
  isFrameMsPreset,
  type TransferSettings as Settings,
} from '../../../lib/transfer/profiles'
import styles from './SettingsSheet.module.css'

export interface SettingsSheetProps {
  open: boolean
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
}

/** Profile spec line in `--font-mono`, e.g. "300 ms · 550 B · EC M" — built from `profiles.ts`. */
function specLine(id: (typeof PROFILE_IDS)[number]): string {
  const profile = TRANSFER_PROFILES[id]
  return `${profile.frameMs} ms · ${profile.chunkSize} B · EC ${profile.errorCorrection}`
}

export function SettingsSheet({ open, settings, onChange, onClose }: SettingsSheetProps) {
  const t = useI18n()
  const profileFrameMs = TRANSFER_PROFILES[settings.profile].frameMs
  const presetIndex = isFrameMsPreset(settings.frameMs)
    ? FRAME_MS_PRESETS.indexOf(settings.frameMs)
    : -1

  const setPresetIndex = (index: number) => {
    if (index < 0) {
      const next = { ...settings }
      delete next.frameMs
      onChange(next)
      return
    }
    onChange({ ...settings, frameMs: FRAME_MS_PRESETS[index] })
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <Dialog.Header onClose={onClose} closeLabel={t.close}>
        {t.settingsTitle}
      </Dialog.Header>
      <Dialog.Body>
        <p className={styles.description}>{t.settingsDescription}</p>
        <fieldset className={styles.profileList}>
          <legend className={styles.legend}>{t.profileLabel}</legend>
          {PROFILE_IDS.map((id) => (
            <ProfileOption
              key={id}
              inputName="transfer-profile"
              value={id}
              name={t.profileNames[id]}
              spec={specLine(id)}
              description={t.profileDescriptions[id]}
              checked={settings.profile === id}
              onSelect={() => onChange({ ...settings, profile: id })}
            />
          ))}
        </fieldset>

        <details className={styles.advanced}>
          <summary className={styles.advancedSummary}>{t.advanced}</summary>
          <label className={styles.advancedField}>
            {t.frameDuration}
            <div className={styles.rangeRow}>
              <Input.Range
                min={0}
                max={FRAME_MS_PRESETS.length - 1}
                step={1}
                value={presetIndex < 0 ? FRAME_MS_PRESETS.indexOf(profileFrameMs) : presetIndex}
                onChange={(event) => setPresetIndex(Number(event.target.value))}
              />
              <span className={styles.rangeValue}>
                {presetIndex < 0 ? t.profileDefault(profileFrameMs) : `${settings.frameMs} ms`}
              </span>
            </div>
          </label>
        </details>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="secondary" onClick={() => onChange(DEFAULT_SETTINGS)}>
          {t.resetDefaults}
        </Button>
        <Button variant="primary" onClick={onClose}>
          {t.done}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
