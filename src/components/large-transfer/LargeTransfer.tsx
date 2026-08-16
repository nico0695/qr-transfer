import { useState } from 'react'
import { useI18n } from '../../i18n'
import { usePreferences } from '../../store/preferences'
import { DEFAULT_SETTINGS, type TransferSettings } from '../../lib/transfer/profiles'
import { SendFlow } from './SendFlow'
import { TransferScanner } from './TransferScanner'
import type { SourceKind } from './usePreparedPayload'

type Direction = 'send' | 'receive'

export default function LargeTransfer() {
  const t = useI18n()
  const [direction, setDirection] = useState<Direction>('send')
  // Kept here so switching Send↔Receive or Text↔File does not lose the draft, file or settings.
  const [source, setSource] = useState<SourceKind>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const storedProfile = usePreferences((s) => s.profile)
  const setStoredProfile = usePreferences((s) => s.setProfile)
  const [settings, setSettings] = useState<TransferSettings>(() => ({
    ...DEFAULT_SETTINGS,
    profile: storedProfile,
  }))

  const updateSettings = (next: TransferSettings) => {
    setSettings(next)
    if (next.profile !== settings.profile) setStoredProfile(next.profile)
  }

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
          source={source}
          onSourceChange={setSource}
          text={text}
          onTextChange={setText}
          file={file}
          onFileChange={setFile}
          settings={settings}
          onSettingsChange={updateSettings}
        />
      ) : (
        <TransferScanner />
      )}
    </div>
  )
}
