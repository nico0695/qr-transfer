import { useEffect, useMemo, useState } from 'react'
import { MAX_SOURCE_BYTES } from '../../lib/transfer/config'
import { utf8Encode } from '../../lib/transfer/encoding'
import { preparePayload } from '../../lib/transfer/transfer'
import type { PreparedPayload, TransferInput } from '../../lib/transfer/types'

const TEXT_DEBOUNCE_MS = 250

export type SourceKind = 'text' | 'file'

export type PayloadState =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'ready'; payload: PreparedPayload }
  | { status: 'error'; error: 'sourceTooLarge' | 'readFailed' }

/** UTF-8 size of the draft, memoized because it is used by several parts of the UI. */
export function useTextBytes(text: string): number {
  return useMemo(() => utf8Encode(text).length, [text])
}

/**
 * Runs the expensive, settings-independent half of the pipeline (read → gzip? → SHA-256) for the
 * current source. Debounces text edits, reads files once per selection, and drops stale results
 * when the source changes or the component unmounts.
 */
export function usePreparedPayload(
  source: SourceKind,
  text: string,
  file: File | null,
): PayloadState {
  const [state, setState] = useState<PayloadState>({ status: 'idle' })
  const textBytes = useTextBytes(text)

  useEffect(() => {
    let cancelled = false
    const isCancelled = () => cancelled

    if (source === 'text' ? text === '' : file === null) {
      setState({ status: 'idle' })
      return
    }
    if (source === 'text' ? textBytes > MAX_SOURCE_BYTES : file!.size > MAX_SOURCE_BYTES) {
      setState({ status: 'error', error: 'sourceTooLarge' })
      return
    }

    setState({ status: 'preparing' })
    const run = async () => {
      let input: TransferInput
      if (source === 'text') {
        input = { kind: 'text', text }
      } else {
        const selected = file!
        const bytes = new Uint8Array(await selected.arrayBuffer())
        if (isCancelled()) return
        input = { kind: 'file', filename: selected.name, mimeType: selected.type, bytes }
      }
      const payload = await preparePayload(input)
      if (!isCancelled()) setState({ status: 'ready', payload })
    }
    const timer = window.setTimeout(
      () => {
        run().catch(() => {
          if (!isCancelled()) setState({ status: 'error', error: 'readFailed' })
        })
      },
      source === 'text' ? TEXT_DEBOUNCE_MS : 0,
    )
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [source, text, textBytes, file])

  return state
}
