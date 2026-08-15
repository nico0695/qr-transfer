import { useI18n } from '../../i18n'
import type { SourceKind } from './usePreparedPayload'

interface SourceSelectorProps {
  value: SourceKind
  onChange: (value: SourceKind) => void
}

/** Segmented control: what to send. Real buttons with aria-pressed, keyboard friendly. */
export function SourceSelector({ value, onChange }: SourceSelectorProps) {
  const t = useI18n()
  const options: Array<{ id: SourceKind; label: string }> = [
    { id: 'text', label: t.sourceText },
    { id: 'file', label: t.sourceFile },
  ]
  return (
    <div className="source" role="group" aria-label={t.sourceLabel}>
      <span className="field-label">{t.sourceLabel}</span>
      <div className="segmented">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="segment"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
