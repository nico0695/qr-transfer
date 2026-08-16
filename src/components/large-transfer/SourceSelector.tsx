import { SegmentedControl } from '../primitives/SegmentedControl'
import { useI18n } from '../../i18n'
import type { SourceKind } from './usePreparedPayload'

interface SourceSelectorProps {
  value: SourceKind
  onChange: (value: SourceKind) => void
}

/** Text/File segmented control, shown in the context-label row above the compose content. */
export function SourceSelector({ value, onChange }: SourceSelectorProps) {
  const t = useI18n()
  return (
    <SegmentedControl
      aria-label={t.sourceLabel}
      value={value}
      onChange={onChange}
      options={[
        { value: 'text', label: t.sourceText },
        { value: 'file', label: t.sourceFile },
      ]}
    />
  )
}
