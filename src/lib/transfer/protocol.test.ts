import { describe, expect, it } from 'vitest'
import { CHECKSUM_LENGTH } from './checksum'
import {
  createTransferId,
  decodeFrame,
  decodeMetadata,
  detectProtocolVersion,
  encodeFrame,
  encodeMetadata,
  normalizeMimeType,
} from './protocol'
import type { TransferFrame, TransferMetadata } from './types'

const checksum = 'ab'.repeat(CHECKSUM_LENGTH / 2)

const textMeta: TransferMetadata = {
  type: 'text',
  compression: 'gzip',
  checksum,
  originalSize: 1234,
}

const fileMeta: TransferMetadata = {
  type: 'file',
  compression: 'none',
  checksum,
  originalSize: 99,
  filename: 'ñandú 🦙 report.pdf',
  mimeType: 'application/pdf',
}

const header: TransferFrame = {
  version: 2,
  transferId: 'abcdEF-_',
  index: 0,
  total: 10,
  kind: 'header',
  metadata: fileMeta,
}

const data: TransferFrame = {
  version: 2,
  transferId: 'abcdEF-_',
  index: 3,
  total: 10,
  kind: 'data',
  payload: new Uint8Array([0, 255, 10, 20]),
}

describe('protocol v2', () => {
  it('encodes and decodes a data frame', () => {
    const text = encodeFrame(data)
    expect(text.startsWith('QRT2|abcdEF-_|3|10|D|')).toBe(true)
    expect(decodeFrame(text)).toEqual(data)
  })

  it('encodes and decodes a header frame with file metadata', () => {
    const text = encodeFrame(header)
    expect(text.startsWith('QRT2|abcdEF-_|0|10|H|')).toBe(true)
    expect(text).toMatch(/^[A-Za-z0-9_|-]+$/) // stays ASCII even with Unicode filenames
    expect(decodeFrame(text)).toEqual(header)
  })

  it('round-trips text metadata', () => {
    expect(decodeMetadata(encodeMetadata(textMeta))).toEqual(textMeta)
  })

  it('creates well-formed transfer ids', () => {
    const id = createTransferId()
    expect(id).toMatch(/^[A-Za-z0-9_-]{8}$/)
    expect(createTransferId()).not.toBe(id)
  })

  it('detects protocol versions without decoding', () => {
    expect(detectProtocolVersion(encodeFrame(data))).toBe(2)
    expect(detectProtocolVersion('QRT1|abcdEF-_|0|3|g|0123456789abcdef|AAAA')).toBe(1)
    expect(detectProtocolVersion('QRT12|x')).toBe(12)
    expect(detectProtocolVersion('hello')).toBeNull()
    expect(detectProtocolVersion('QRT|x')).toBeNull()
  })

  it('rejects malformed frames', () => {
    const good = encodeFrame(data)
    expect(decodeFrame('')).toBeNull()
    expect(decodeFrame('hello world')).toBeNull()
    expect(decodeFrame(good.replace('QRT2', 'QRT1'))).toBeNull()
    expect(decodeFrame(good.replace('QRT2', 'XYZ2'))).toBeNull()
    expect(decodeFrame(good.replace('|3|10|', '|10|10|'))).toBeNull()
    expect(decodeFrame(good.replace('|3|10|', '|0|10|'))).toBeNull() // data at index 0
    expect(decodeFrame(good.replace('|3|10|', '|1|1|'))).toBeNull() // total < 2
    expect(decodeFrame(good.replace('|3|10|', '|-1|10|'))).toBeNull()
    expect(decodeFrame(good.replace('|D|', '|X|'))).toBeNull()
    expect(decodeFrame(good.replace('abcdEF-_', 'abc'))).toBeNull()
    expect(decodeFrame(good + '$')).toBeNull()
    expect(decodeFrame(good + '|extra')).toBeNull()
    expect(decodeFrame(good.slice(0, good.lastIndexOf('|')))).toBeNull()
  })

  it('rejects malformed headers', () => {
    const good = encodeFrame(header)
    expect(decodeFrame(good.replace('|0|10|H|', '|1|10|H|'))).toBeNull() // header not at 0
    expect(decodeFrame(good.replace('|H|', '|D|'))).toBeNull() // data at index 0
    expect(decodeFrame('QRT2|abcdEF-_|0|10|H|notjson')).toBeNull()
    expect(decodeMetadata('')).toBeNull()
    const bad = (obj: unknown) => decodeMetadata(btoa(JSON.stringify(obj)).replace(/=+$/, ''))
    expect(bad(null)).toBeNull()
    expect(bad([])).toBeNull()
    expect(bad({ t: 'x', c: 'g', h: checksum, s: 1 })).toBeNull()
    expect(bad({ t: 't', c: 'z', h: checksum, s: 1 })).toBeNull()
    expect(bad({ t: 't', c: 'g', h: 'abc', s: 1 })).toBeNull()
    expect(bad({ t: 't', c: 'g', h: checksum, s: -1 })).toBeNull()
    expect(bad({ t: 't', c: 'g', h: checksum, s: 1.5 })).toBeNull()
    expect(bad({ t: 'f', c: 'g', h: checksum, s: 1 })).toBeNull() // file without name/mime
    expect(bad({ t: 'f', c: 'g', h: checksum, s: 1, n: 'a'.repeat(500), m: 'x/y' })).toBeNull()
    expect(bad({ t: 'f', c: 'g', h: checksum, s: 1, n: 'a', m: 'x'.repeat(200) })).toBeNull()
    expect(bad({ t: 't', c: 'g', h: checksum, s: 1 })).toEqual({
      type: 'text',
      compression: 'gzip',
      checksum,
      originalSize: 1,
    })
  })

  it('accepts an empty payload', () => {
    const text = encodeFrame({ ...data, payload: new Uint8Array(0) })
    expect(decodeFrame(text)).toMatchObject({ kind: 'data', payload: new Uint8Array(0) })
  })

  it('normalizes MIME types', () => {
    expect(normalizeMimeType('image/PNG')).toBe('image/png')
    expect(normalizeMimeType(' application/pdf ')).toBe('application/pdf')
    expect(normalizeMimeType('')).toBe('application/octet-stream')
    expect(normalizeMimeType('not a mime')).toBe('application/octet-stream')
    expect(normalizeMimeType('text/html; charset=utf-8')).toBe('application/octet-stream')
    expect(normalizeMimeType('a/' + 'b'.repeat(200))).toBe('application/octet-stream')
  })
})
