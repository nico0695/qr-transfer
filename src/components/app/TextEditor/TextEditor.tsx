import { Button } from '../../primitives/Button'
import { Card } from '../../primitives/Card'
import { Input } from '../../primitives/Input'
import { cx } from '../../../lib/cx'
import styles from './TextEditor.module.css'

export interface TextEditorProps {
  title: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  maxLength: number
  atLimit: boolean
  limitReachedLabel: string
  copyLabel: string
  copiedLabel: string
  copyFailedLabel: string
  copyFeedback: 'idle' | 'copied' | 'failed'
  onCopy: () => void
  clearLabel: string
  onClear: () => void
}

export function TextEditor({
  title,
  value,
  onChange,
  placeholder,
  maxLength,
  atLimit,
  limitReachedLabel,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  copyFeedback,
  onCopy,
  clearLabel,
  onClear,
}: TextEditorProps) {
  const isEmpty = value === ''
  const copyText =
    copyFeedback === 'copied'
      ? copiedLabel
      : copyFeedback === 'failed'
        ? copyFailedLabel
        : copyLabel

  return (
    <Card padding="none" radius="card">
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={onCopy} disabled={isEmpty}>
            {copyText}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClear} disabled={isEmpty}>
            {clearLabel}
          </Button>
        </div>
      </div>
      <Input.Textarea
        className={styles.textarea}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className={styles.footer}>
        <span className={cx(styles.counter, atLimit && styles.counterLimit)}>
          {value.length} / {maxLength}
          {atLimit ? limitReachedLabel : ''}
        </span>
      </div>
    </Card>
  )
}
