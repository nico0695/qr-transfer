import { describe, expect, it } from 'vitest'
import { singleFlight } from './singleFlight'

/** A promise whose settlement the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('singleFlight', () => {
  it('runs the operation and passes the result through', async () => {
    const guarded = singleFlight(async (n: number) => n * 2)
    expect(await guarded(21)).toBe(42)
  })

  it('drops anything offered while one is in flight', async () => {
    const first = deferred<string>()
    let calls = 0
    const guarded = singleFlight(async () => {
      calls += 1
      return first.promise
    })

    const running = guarded(undefined)
    expect(await guarded(undefined)).toBeNull()
    expect(await guarded(undefined)).toBeNull()
    expect(calls).toBe(1)

    first.resolve('decoded')
    expect(await running).toBe('decoded')
  })

  it('accepts again once the previous one resolves', async () => {
    const guarded = singleFlight(async (n: number) => n)
    expect(await guarded(1)).toBe(1)
    expect(await guarded(2)).toBe(2)
    expect(await guarded(3)).toBe(3)
  })

  it('accepts again after a rejection', async () => {
    // The case that matters: a stuck busy flag would kill the scanner on the first failed decode
    // and it would look like the camera had frozen.
    let attempt = 0
    const guarded = singleFlight(async () => {
      attempt += 1
      if (attempt === 1) throw new Error('decode failed')
      return 'recovered'
    })

    await expect(guarded(undefined)).rejects.toThrow('decode failed')
    expect(await guarded(undefined)).toBe('recovered')
  })

  it('distinguishes a dropped call from an operation that returned null', async () => {
    // Both surface as null; only the call count can tell them apart, which is why the scanner
    // must not read anything into a null beyond "no text this time".
    let calls = 0
    const guarded = singleFlight(async () => {
      calls += 1
      return null
    })
    expect(await guarded(undefined)).toBeNull()
    expect(calls).toBe(1)
  })
})
