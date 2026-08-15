import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

interface CopyButtonProps {
  text: string
  /** Idle label; defaults to "Copy". */
  label?: string
  small?: boolean
  primary?: boolean
}

export function CopyButton({ text, label, small = false, primary = false }: CopyButtonProps) {
  const t = useI18n()
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setFeedback('copied')
    } catch {
      setFeedback('failed')
    }
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setFeedback('idle'), 2000)
  }

  const className = ['button', small && 'button-small', primary && 'button-primary']
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={className} onClick={handleCopy} disabled={text === ''}>
      {feedback === 'copied' ? t.copied : feedback === 'failed' ? t.copyFailed : (label ?? t.copy)}
    </button>
  )
}
