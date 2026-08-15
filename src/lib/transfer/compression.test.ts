import { describe, expect, it } from 'vitest'
import { chooseCompression, compress, decompress, restore } from './compression'
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

describe('chooseCompression', () => {
  it('uses gzip for compressible content', async () => {
    const bytes = utf8Encode('hello '.repeat(1000))
    const choice = await chooseCompression(bytes)
    expect(choice.compression).toBe('gzip')
    expect(choice.bytes.length).toBeLessThan(bytes.length)
    expect(await restore(choice.bytes, choice.compression)).toEqual(bytes)
  })

  it('sends random (already compressed) content as-is', async () => {
    const bytes = crypto.getRandomValues(new Uint8Array(20_000))
    const choice = await chooseCompression(bytes)
    expect(choice.compression).toBe('none')
    expect(choice.bytes).toBe(bytes)
    expect(await restore(choice.bytes, choice.compression)).toBe(bytes)
  })

  it('never compresses empty input', async () => {
    const choice = await chooseCompression(new Uint8Array(0))
    expect(choice.compression).toBe('none')
    expect(choice.bytes.length).toBe(0)
  })
})
