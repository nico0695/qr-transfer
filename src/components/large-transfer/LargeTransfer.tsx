import { useState } from 'react'
import { usePreferences } from '../../store/preferences'
import { DEFAULT_SETTINGS, type TransferSettings } from '../../lib/transfer/profiles'
import { SendFlow } from './SendFlow'
import { TransferScanner } from './TransferScanner'
import type { SourceKind } from './usePreparedPayload'

type Direction = 'send' | 'receive'

export interface LargeTransferProps {
  direction: Direction
}

export default function LargeTransfer({ direction }: LargeTransferProps) {
  // Kept here so switching Text↔File does not lose the draft, file or settings; Send↔Receive
  // itself is now App's `role`, shared with Quick QR (docs/DESIGN_SYSTEM.md §5.1).
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
