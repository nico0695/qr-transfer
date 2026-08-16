import { useEffect, useRef, useState } from 'react'

export type CopyFeedback = 'idle' | 'copied' | 'failed'

/** Copy-to-clipboard with a self-resetting feedback state — shared by every Copy button. */
export function useCopy(): { feedback: CopyFeedback; copy: (text: string) => Promise<void> } {
  const [feedback, setFeedback] = useState<CopyFeedback>('idle')
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setFeedback('copied')
    } catch {
      setFeedback('failed')
    }
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setFeedback('idle'), 2000)
  }

  return { feedback, copy }
}
