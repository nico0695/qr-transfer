import { describe, expect, it } from 'vitest'
import { createTransferId, decodeFrame, encodeFrame } from './protocol'
import type { TransferFrame } from './types'

const base: TransferFrame = {
  version: 1,
  transferId: 'abcdEF-_',
  index: 3,
  total: 10,
  compression: 'gzip',
  checksum: '0123456789abcdef',
  payload: new Uint8Array([0, 255, 10, 20]),
}

describe('protocol', () => {
  it('encodes and decodes a frame', () => {
    const text = encodeFrame(base)
    expect(text.startsWith('QRT1|abcdEF-_|3|10|g|0123456789abcdef|')).toBe(true)
    expect(decodeFrame(text)).toEqual(base)
  })

  it('creates well-formed transfer ids', () => {
    const id = createTransferId()
    expect(id).toMatch(/^[A-Za-z0-9_-]{8}$/)
    expect(createTransferId()).not.toBe(id)
  })

  it('rejects malformed frames', () => {
    const good = encodeFrame(base)
    expect(decodeFrame('')).toBeNull()
    expect(decodeFrame('hello world')).toBeNull()
    expect(decodeFrame(good.replace('QRT1', 'QRT2'))).toBeNull()
    expect(decodeFrame(good.replace('QRT1', 'XYZ1'))).toBeNull()
    expect(decodeFrame(good.replace('|3|10|', '|10|10|'))).toBeNull()
    expect(decodeFrame(good.replace('|3|10|', '|0|0|'))).toBeNull()
    expect(decodeFrame(good.replace('|3|10|', '|-1|10|'))).toBeNull()
    expect(decodeFrame(good.replace('|g|', '|x|'))).toBeNull()
    expect(decodeFrame(good.replace('0123456789abcdef', '0123456789abcde'))).toBeNull()
    expect(decodeFrame(good.replace('abcdEF-_', 'abc'))).toBeNull()
    expect(decodeFrame(good + '$')).toBeNull()
    expect(decodeFrame(good + '|extra')).toBeNull()
    expect(decodeFrame(good.slice(0, good.lastIndexOf('|')))).toBeNull()
  })

  it('accepts an empty payload', () => {
    const text = encodeFrame({ ...base, payload: new Uint8Array(0) })
    expect(decodeFrame(text)?.payload).toEqual(new Uint8Array(0))
  })
})
