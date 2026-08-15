import { singleFlight } from './singleFlight'
import type { Decoder, ScanFrame } from './types'
import type { DecodeRequest, DecodeResponse } from './decoder.worker'

/**
 * A `Decoder` backed by a worker running ZXing compiled to WebAssembly.
 *
 * Requests carry an id so that a reply belonging to a previous frame — one that was still being
 * decoded when the scanner restarted — cannot be mistaken for the answer to the current one.
 */
export function createWorkerDecoder(): Decoder {
  const worker = new Worker(new URL('./decoder.worker.ts', import.meta.url), { type: 'module' })
  const pending = new Map<number, (response: DecodeResponse) => void>()
  let nextId = 1
  let disposed = false

  worker.addEventListener('message', (event: MessageEvent<DecodeResponse>) => {
    const settle = pending.get(event.data.id)
    if (settle === undefined) return
    pending.delete(event.data.id)
    settle(event.data)
  })

  const send = (frame: ScanFrame) =>
    new Promise<string | null>((resolve, reject) => {
      if (disposed) {
        resolve(null)
        return
      }
      const id = nextId++
      pending.set(id, (response) => {
        if (response.error !== undefined) reject(new Error(response.error))
        else resolve(response.text)
      })
      worker.postMessage({ id, ...frame } satisfies DecodeRequest, [frame.buffer])
    })

  const decode = singleFlight(send)

  return {
    decode: async (frame) => (await decode(frame)) ?? null,
    dispose: () => {
      if (disposed) return
      disposed = true
      pending.clear()
      worker.terminate()
    },
  }
}
