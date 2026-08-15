import { useI18n } from '../i18n'

export type Mode = 'generate' | 'scan'

interface ModeTabsProps {
  mode: Mode
  onChange: (mode: Mode) => void
}

export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  const t = useI18n()
  return (
    <div className="tabs" role="tablist" aria-label="Mode">
      <button
        type="button"
        role="tab"
        className="tab"
        aria-selected={mode === 'generate'}
        onClick={() => onChange('generate')}
      >
        {t.tabGenerate}
      </button>
      <button
        type="button"
        role="tab"
        className="tab"
        aria-selected={mode === 'scan'}
        onClick={() => onChange('scan')}
      >
        {t.tabScan}
      </button>
    </div>
  )
}
