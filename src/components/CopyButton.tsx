import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

interface CopyButtonProps {
  text: string
}

export function CopyButton({ text }: CopyButtonProps) {
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

  return (
    <button type="button" className="button" onClick={handleCopy} disabled={text === ''}>
      {feedback === 'copied' ? t.copied : feedback === 'failed' ? t.copyFailed : t.copy}
    </button>
  )
}
