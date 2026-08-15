import { describe, expect, it } from 'vitest'
import { compress, decompress } from './compression'
import { utf8Encode } from './encoding'

describe('compression', () => {
  it('round-trips bytes', async () => {
    const bytes = utf8Encode('hello '.repeat(1000))
    const compressed = await compress(bytes)
    expect(compressed.length).toBeLessThan(bytes.length)
    expect(await decompress(compressed)).toEqual(bytes)
  })

  it('handles empty input', async () => {
    const compressed = await compress(new Uint8Array(0))
    expect(compressed.length).toBeGreaterThan(0)
    expect(await decompress(compressed)).toEqual(new Uint8Array(0))
  })

  it('rejects garbage', async () => {
    await expect(decompress(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow()
  })
})
