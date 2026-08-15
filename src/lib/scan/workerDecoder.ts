import { singleFlight } from './singleFlight'
import type { Decoder, ScanFrame } from './types'
import type { DecodeRequest, WorkerEvent } from './decoder.worker'

/**
 * A `Decoder` backed by a worker running ZXing compiled to WebAssembly.
 *
 * Requests carry an id so that a reply belonging to a previous frame — one that was still being
 * decoded when the scanner restarted — cannot be mistaken for the answer to the current one.
 *
 * Every path that can stop the worker answering has to settle the requests in flight. A pending
 * promise that never settles leaves the capture loop's busy flag raised forever: the camera stays
 * on, frames keep arriving, and every one of them is skipped, so the receiver looks like it is
 * scanning while it can no longer decode anything.
 */
export interface WorkerDecoder extends Decoder {
  /**
   * Resolves once the WASM module is instantiated, rejects if it cannot be. Callers must await it
   * before treating the decoder as usable — the module loads asynchronously, so without this a
   * failed initialisation would only show up as every capture coming back empty.
   */
  readonly ready: Promise<void>
}

export function createWorkerDecoder(): WorkerDecoder {
  const worker = new Worker(new URL('./decoder.worker.ts', import.meta.url), { type: 'module' })
  const pending = new Map<number, { resolve(text: string | null): void; reject(e: Error): void }>()
  let nextId = 1
  let failure: Error | null = null

  let markReady: () => void
  let markFailed: (error: Error) => void
  const ready = new Promise<void>((resolve, reject) => {
    markReady = resolve
    markFailed = reject
  })

  /** Ends every request in flight and refuses new ones. */
  const die = (error: Error) => {
    if (failure !== null) return
    failure = error
    markFailed(error)
    for (const request of pending.values()) request.reject(error)
    pending.clear()
    worker.terminate()
  }

  worker.addEventListener('message', (event: MessageEvent<WorkerEvent>) => {
    const data = event.data
    if (data.type === 'ready') {
      markReady()
      return
    }
    if (data.type === 'init-error') {
      die(new Error(data.error))
      return
    }
    const request = pending.get(data.id)
    if (request === undefined) return
    pending.delete(data.id)
    if (data.error !== undefined) request.reject(new Error(data.error))
    else request.resolve(data.text)
  })

  // A worker that fails to load, or throws at the top level, otherwise goes silent: `postMessage`
  // succeeds and no reply ever arrives.
  worker.addEventListener('error', (event) => die(new Error(event.message || 'scan worker failed')))
  worker.addEventListener('messageerror', () =>
    die(new Error('scan worker sent an unreadable message')),
  )

  const send = (frame: ScanFrame) =>
    new Promise<string | null>((resolve, reject) => {
      if (failure !== null) {
        reject(failure)
        return
      }
      const id = nextId++
      pending.set(id, { resolve, reject })
      worker.postMessage({ id, ...frame } satisfies DecodeRequest, [frame.buffer])
    })

  const decode = singleFlight(send)

  return {
    ready,
    decode: async (frame) => (await decode(frame)) ?? null,
    dispose: () => die(new Error('scan worker disposed')),
  }
}
