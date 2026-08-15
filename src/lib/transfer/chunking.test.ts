import { describe, expect, it } from 'vitest'
import { joinChunks, splitBytes } from './chunking'

describe('chunking', () => {
  it('splits into equal chunks with a short tail', () => {
    const bytes = Uint8Array.from({ length: 10 }, (_, i) => i)
    const chunks = splitBytes(bytes, 4)
    expect(chunks.map((c) => Array.from(c))).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9],
    ])
    expect(joinChunks(chunks)).toEqual(bytes)
  })

  it('returns a single empty chunk for empty input', () => {
    expect(splitBytes(new Uint8Array(0), 4)).toEqual([new Uint8Array(0)])
  })

  it('handles exact multiples', () => {
    expect(splitBytes(new Uint8Array(8), 4)).toHaveLength(2)
  })

  it('rejects invalid sizes', () => {
    expect(() => splitBytes(new Uint8Array(1), 0)).toThrow()
  })
})
