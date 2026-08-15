import { useEffect, useState } from 'react'
import { MAX_INPUT_BYTES } from '../../lib/transfer/config'
import { utf8Encode } from '../../lib/transfer/encoding'
import { computeStats } from '../../lib/transfer/transfer'
import type { TransferStats } from '../../lib/transfer/types'

const DEBOUNCE_MS = 250

export interface ContentInfo {
  originalBytes: number
  tooLarge: boolean
}

/** Cheap synchronous facts about the text (UTF-8 size, limit check). */
export function describeContent(text: string): ContentInfo {
  const originalBytes = utf8Encode(text).length
  return { originalBytes, tooLarge: originalBytes > MAX_INPUT_BYTES }
}

/** Debounced compression stats for the current text; `null` while (re)calculating. */
export function useContentStats(text: string): TransferStats | null {
  const [stats, setStats] = useState<TransferStats | null>(null)

  useEffect(() => {
    let cancelled = false
    setStats(null)
    if (utf8Encode(text).length > MAX_INPUT_BYTES) return
    const timer = window.setTimeout(() => {
      computeStats(text)
        .then((result) => {
          if (!cancelled) setStats(result)
        })
        .catch(() => {
          // Compression failed (should not happen); leave stats empty.
        })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [text])

  return stats
}
