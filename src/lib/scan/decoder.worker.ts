/**
 * Decodes captures off the main thread.
 *
 * The WASM binary is served from our own bundle: `zxing-wasm` otherwise resolves it against a
 * jsDelivr URL in production builds, which would break an app that is meant to work with no
 * network at all. The module cache is per-realm, so these overrides have to be installed here
 * inside the worker — setting them on the main thread would have no effect.
 */
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'
import readerWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { QR_READER_OPTIONS } from './readerOptions'
import type { ScanFrame } from './types'

export interface DecodeRequest extends ScanFrame {
  id: number
}

export interface DecodeResponse {
  type: 'decoded'
  id: number
  text: string | null
  error?: string
}

/** Sent once, so the main thread knows whether this worker can decode at all. */
export type InitResponse = { type: 'ready' } | { type: 'init-error'; error: string }

export type WorkerEvent = DecodeResponse | InitResponse

/**
 * Only the two members this file uses. `DedicatedWorkerGlobalScope` lives in the `webworker` lib,
 * which cannot be added alongside `dom` without a pile of duplicate-global errors.
 */
interface WorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<DecodeRequest>) => void): void
  postMessage(message: WorkerEvent): void
}

const worker = self as unknown as WorkerScope

// Memoised: `prepareZXingModule` compares overrides shallowly, so a fresh `locateFile` closure on
// every call would re-instantiate the module each time.
let ready: Promise<unknown> | undefined
function prepare(): Promise<unknown> {
  ready ??= prepareZXingModule({
    fireImmediately: true,
    overrides: { locateFile: (path: string) => (path.endsWith('.wasm') ? readerWasmUrl : path) },
  })
  return ready
}

// Installed at load time, not on the first decode: `readBarcodes` falls back to the bundled
// jsDelivr default whenever it runs before any overrides were cached, so caching them as early as
// possible is what makes that path unreachable. It also gets the ~1 MB binary compiling while the
// camera is still starting.
// The result is announced rather than left implicit. A failed instantiation memoises a rejected
// promise, so without this every later capture would simply come back empty and the receiver would
// scan forever without ever decoding — and without falling back to the other engine, which is only
// chosen while starting up.
void prepare().then(
  () => worker.postMessage({ type: 'ready' }),
  (error: unknown) =>
    worker.postMessage({
      type: 'init-error',
      error: error instanceof Error ? error.message : String(error),
    }),
)

worker.addEventListener('message', (event: MessageEvent<DecodeRequest>) => {
  const { id, buffer, width, height } = event.data
  void decode(buffer, width, height).then(
    (text) => worker.postMessage({ type: 'decoded', id, text } satisfies DecodeResponse),
    (error: unknown) =>
      worker.postMessage({
        type: 'decoded',
        id,
        text: null,
        error: error instanceof Error ? error.message : String(error),
      } satisfies DecodeResponse),
  )
})

async function decode(buffer: ArrayBuffer, width: number, height: number): Promise<string | null> {
  await prepare()
  const image = new ImageData(new Uint8ClampedArray(buffer), width, height)
  const results = await readBarcodes(image, QR_READER_OPTIONS)
  const found = results.find((result) => result.isValid && result.text.length > 0)
  return found?.text ?? null
}
