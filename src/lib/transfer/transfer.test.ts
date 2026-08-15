import { describe, expect, it } from 'vitest'
import { MAX_FILENAME_BYTES } from './config'
import { utf8Encode } from './encoding'
import { TRANSFER_PROFILES, resolveSettings } from './profiles'
import { decodeFrame } from './protocol'
import {
  ChunkCollector,
  TransferError,
  assembleTransfer,
  buildTransfer,
  countFrames,
  preparePayload,
  prepareTransfer,
} from './transfer'
import type { ReceivedTransfer, TransferInput } from './types'

const CHUNK = TRANSFER_PROFILES.balanced.chunkSize

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Full pipeline: prepare → encode → (shuffle) → decode → collect → assemble. */
async function roundTrip(input: TransferInput, chunkSize = CHUNK, shuffle = true) {
  const prepared = await prepareTransfer(input, chunkSize)
  expect(prepared.frames).toHaveLength(prepared.total)
  const collector = new ChunkCollector()
  const frames = shuffle ? shuffled(prepared.frames) : prepared.frames
  for (const frame of frames) {
    const decoded = decodeFrame(frame)
    expect(decoded).not.toBeNull()
    expect(collector.add(decoded!)).toBe('accepted')
  }
  expect(collector.isComplete).toBe(true)
  expect(collector.metadata).toEqual(prepared.metadata)
  const result = await assembleTransfer(collector.chunkMap, collector.total, collector.metadata!)
  return { prepared, result }
}

function text(text: string): TransferInput {
  return { kind: 'text', text }
}

function file(filename: string, mimeType: string, bytes: Uint8Array): TransferInput {
  return { kind: 'file', filename, mimeType, bytes }
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length)
  for (let offset = 0; offset < length; offset += 65_536) {
    crypto.getRandomValues(out.subarray(offset, Math.min(length, offset + 65_536)))
  }
  return out
}

/** Header + IDAT-like structure: some structure, mostly incompressible noise. */
function pngLikeBytes(length: number): Uint8Array {
  const out = randomBytes(length)
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  return out
}

const textSamples: Record<string, string> = {
  ascii: 'The quick brown fox jumps over the lazy dog.',
  spanish: 'El pingüino ñoño comió jalapeños en Cañón del Águila — ¿verdad? ¡Sí!',
  emoji: '🚀🔥 👨‍👩‍👧‍👦 🇦🇷 ✅ text with emoji',
  unicode: 'Ελληνικά, Кириллица, العربية, עברית, 日本語, 한국어, ไทย, देवनागरी',
  multiline: 'line 1\nline 2\r\nline 3\n\n\ttabbed\n  spaces  \n',
  markdown:
    '# Title\n\nSome **bold** and _italic_.\n\n- item\n- item\n\n```js\nconsole.log(1)\n```\n',
  json: JSON.stringify({ a: 1, b: [1, 2, 3], c: { d: 'ñ', e: null } }, null, 2),
  empty: '',
  whitespace: '   \n\n   ',
}

describe('text round-trip', () => {
  for (const [name, sample] of Object.entries(textSamples)) {
    it(`preserves ${name} content exactly`, async () => {
      const { result, prepared } = await roundTrip(text(sample))
      expect(result).toEqual({ type: 'text', text: sample })
      expect(prepared.metadata.type).toBe('text')
      expect(prepared.stats.characters).toBe(sample.length)
    })
  }

  it('preserves a large document split into many frames', async () => {
    let sample = ''
    while (sample.length < 60_000) {
      sample += 'Lorem ipsum dolor sit amet, ñandú 🦙 ' + Math.random().toString(36) + '\n'
    }
    const { prepared, result } = await roundTrip(text(sample), 200)
    expect(result).toEqual({ type: 'text', text: sample })
    expect(prepared.total).toBeGreaterThan(10)
    expect(prepared.stats.compression).toBe('gzip')
    expect(prepared.stats.originalBytes).toBeGreaterThan(sample.length)
    expect(prepared.stats.transferBytes).toBeLessThan(prepared.stats.originalBytes)
  })

  it('handles tiny chunk sizes with lots of frames', async () => {
    await roundTrip(text(textSamples.unicode), 8)
  })
})

describe('file round-trip (byte for byte)', () => {
  const cases: Array<{ name: string; input: TransferInput; compression: 'gzip' | 'none' }> = [
    {
      name: 'text file',
      input: file('notes.md', 'text/markdown', utf8Encode('# Notes\n'.repeat(500))),
      compression: 'gzip',
    },
    {
      name: 'PNG-like binary',
      input: file('img.png', 'image/png', pngLikeBytes(30_000)),
      compression: 'none',
    },
    {
      name: 'random binary',
      input: file('blob.bin', 'application/octet-stream', randomBytes(5_000)),
      compression: 'none',
    },
    {
      name: 'empty file',
      input: file('empty.txt', 'text/plain', new Uint8Array(0)),
      compression: 'none',
    },
    {
      name: 'unicode filename',
      input: file('informe ñandú 🦙.pdf', 'application/pdf', randomBytes(100)),
      compression: 'none',
    },
    {
      name: 'path characters in filename',
      input: file('../../etc/passwd', 'text/plain', utf8Encode('root:x:0:0')),
      compression: 'none',
    },
    {
      name: 'invalid MIME',
      input: file('weird', 'not a mime', randomBytes(300)),
      compression: 'none',
    },
    {
      name: 'all-zero binary',
      input: file('zeros.bin', 'application/octet-stream', new Uint8Array(10_000)),
      compression: 'gzip',
    },
  ]

  for (const { name, input, compression } of cases) {
    it(`preserves ${name}`, async () => {
      if (input.kind !== 'file') throw new Error('unreachable')
      const { prepared, result } = await roundTrip(input, 300)
      expect(prepared.metadata.type).toBe('file')
      expect(prepared.stats.compression).toBe(compression)
      expect(prepared.stats.characters).toBeNull()
      expect(result.type).toBe('file')
      const received = result as Extract<ReceivedTransfer, { type: 'file' }>
      expect(received.bytes).toEqual(input.bytes)
      expect(received.bytes.length).toBe(input.bytes.length)
    })
  }

  it('carries filename and MIME separately from the payload', async () => {
    const input = file('photo.jpg', 'image/jpeg', randomBytes(2_000))
    const { prepared, result } = await roundTrip(input)
    expect(result).toMatchObject({ type: 'file', filename: 'photo.jpg', mimeType: 'image/jpeg' })
    // Data frames carry only payload; the header is the only place with the name.
    expect(prepared.frames.slice(1).some((f) => f.includes('photo'))).toBe(false)
    expect(prepared.frames[0]).toMatch(/^QRT2\|[A-Za-z0-9_-]{8}\|0\|\d+\|H\|/)
  })

  it('bounds the filename in the header and falls back on invalid MIME', async () => {
    const input = file('x'.repeat(1000) + '.txt', 'nope', utf8Encode('hi'))
    const { result } = await roundTrip(input)
    if (result.type !== 'file') throw new Error('expected file')
    expect(utf8Encode(result.filename).length).toBeLessThanOrEqual(MAX_FILENAME_BYTES)
    expect(result.filename.endsWith('.txt')).toBe(true)
    expect(result.mimeType).toBe('application/octet-stream')
  })

  it('does not convert binary through Unicode: every byte value survives', async () => {
    const bytes = new Uint8Array(256 * 4)
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256
    const { result } = await roundTrip(file('all.bin', 'application/octet-stream', bytes), 100)
    expect(result).toMatchObject({ type: 'file', bytes })
  })
})

describe('settings vs payload', () => {
  it('changes frame count and loop time without touching the payload', async () => {
    const payload = await preparePayload(
      file('noise.bin', 'application/octet-stream', randomBytes(30_000)),
    )
    const results = (['reliable', 'balanced', 'fast'] as const).map((id) => {
      const s = resolveSettings({ profile: id })
      const transfer = buildTransfer(payload, s.chunkSize)
      expect(transfer.total).toBe(countFrames(payload.bytes.length, s.chunkSize))
      expect(transfer.stats).toBe(payload.stats)
      expect(transfer.metadata).toBe(payload.metadata)
      return { id, frames: transfer.total, loopMs: transfer.total * s.frameMs }
    })
    const [reliable, balanced, fast] = results
    expect(reliable.frames).toBeGreaterThan(balanced.frames)
    expect(balanced.frames).toBeGreaterThan(fast.frames)
    expect(reliable.loopMs).toBeGreaterThan(balanced.loopMs)
    expect(balanced.loopMs).toBeGreaterThan(fast.loopMs)
  })

  it('counts the header frame', () => {
    expect(countFrames(0, 750)).toBe(2)
    expect(countFrames(750, 750)).toBe(2)
    expect(countFrames(751, 750)).toBe(3)
  })

  it('every profile round-trips', async () => {
    const bytes = utf8Encode(JSON.stringify({ x: 'y'.repeat(4000) }))
    const input = file('doc.json', 'application/json', bytes)
    for (const id of ['reliable', 'balanced', 'fast'] as const) {
      const { result } = await roundTrip(input, TRANSFER_PROFILES[id].chunkSize)
      expect(result).toMatchObject({ type: 'file', bytes })
    }
  })
})

function noisyText(length: number): string {
  let out = ''
  while (out.length < length) out += Math.random().toString(36).slice(2) + ' '
  return out
}

describe('ChunkCollector', () => {
  async function framesFor(input: TransferInput, chunkSize: number) {
    const prepared = await prepareTransfer(input, chunkSize)
    return { prepared, decoded: prepared.frames.map((f) => decodeFrame(f)!) }
  }

  it('deduplicates and accepts any order', async () => {
    const { decoded } = await framesFor(text(noisyText(5000)), 100)
    expect(decoded.length).toBeGreaterThanOrEqual(10)
    const collector = new ChunkCollector()
    const order = [4, 5, 1, 9, 2, 4, 7, 4, 1, 0, 0]
    const results = order.map((i) => collector.add(decoded[i]))
    expect(results).toEqual([
      'accepted',
      'accepted',
      'accepted',
      'accepted',
      'accepted',
      'duplicate',
      'accepted',
      'duplicate',
      'duplicate',
      'accepted',
      'duplicate',
    ])
    expect(collector.received).toBe(7)
    expect(collector.isComplete).toBe(false)
    expect(collector.missingIndexes).toContain(3)
    expect(collector.missingIndexes).not.toContain(0)
    expect(collector.missingIndexes).not.toContain(4)
    expect(collector.metadata).not.toBeNull()
  })

  it('is not complete without the header even when all data arrived', async () => {
    const { decoded } = await framesFor(text(noisyText(2000)), 100)
    const collector = new ChunkCollector()
    decoded.filter((f) => f.kind === 'data').forEach((f) => collector.add(f))
    expect(collector.isComplete).toBe(false)
    expect(collector.missingIndexes).toEqual([0])
    collector.add(decoded[0])
    expect(collector.isComplete).toBe(true)
  })

  it('reports incomplete when a chunk is missing', async () => {
    const { decoded } = await framesFor(text(noisyText(5000)), 100)
    const collector = new ChunkCollector()
    decoded.filter((f) => f.index !== 3).forEach((f) => collector.add(f))
    expect(collector.isComplete).toBe(false)
    await expect(
      assembleTransfer(collector.chunkMap, collector.total, collector.metadata!),
    ).rejects.toMatchObject({ reason: 'incomplete' })
  })

  it('ignores frames from another transfer once locked', async () => {
    const a = await framesFor(text('first transfer'), 5)
    const b = await framesFor(text('second transfer'), 5)
    const collector = new ChunkCollector()
    expect(collector.add(a.decoded[1])).toBe('accepted')
    expect(collector.add(b.decoded[1])).toBe('ignored')
    expect(collector.add(b.decoded[0])).toBe('ignored')
    expect(collector.transferId).toBe(a.prepared.transferId)
    collector.reset()
    expect(collector.add(b.decoded[0])).toBe('accepted')
  })

  it('ignores inconsistent frames within the same transfer id', async () => {
    const { decoded } = await framesFor(text('consistency check text'), 5)
    const collector = new ChunkCollector()
    collector.add(decoded[0])
    expect(collector.add({ ...decoded[1], total: decoded[1].total + 1 })).toBe('ignored')
  })
})

describe('assembleTransfer verification', () => {
  async function collected(input: TransferInput, chunkSize = 8) {
    const prepared = await prepareTransfer(input, chunkSize)
    const collector = new ChunkCollector()
    prepared.frames.forEach((f) => collector.add(decodeFrame(f)!))
    return { prepared, collector }
  }

  it('fails on checksum mismatch', async () => {
    const { collector } = await collected(text('some content to verify'))
    const meta = { ...collector.metadata!, checksum: '0'.repeat(64) }
    await expect(
      assembleTransfer(collector.chunkMap, collector.total, meta),
    ).rejects.toBeInstanceOf(TransferError)
  })

  it('fails on size mismatch', async () => {
    const { collector } = await collected(text('some content to verify'))
    const meta = { ...collector.metadata!, originalSize: 1 }
    await expect(assembleTransfer(collector.chunkMap, collector.total, meta)).rejects.toMatchObject(
      {
        reason: 'checksum',
      },
    )
  })

  it('fails on corrupted chunk bytes (gzip)', async () => {
    const { collector } = await collected(text('some content to verify '.repeat(50)))
    expect(collector.metadata!.compression).toBe('gzip')
    const tampered = new Map(collector.chunkMap)
    const first = new Uint8Array(tampered.get(1)!)
    first[0] ^= 0xff
    tampered.set(1, first)
    await expect(
      assembleTransfer(tampered, collector.total, collector.metadata!),
    ).rejects.toBeInstanceOf(TransferError)
  })

  it('fails on corrupted chunk bytes (uncompressed file)', async () => {
    const { collector } = await collected(
      file('a.bin', 'application/octet-stream', randomBytes(64)),
    )
    expect(collector.metadata!.compression).toBe('none')
    const tampered = new Map(collector.chunkMap)
    const first = new Uint8Array(tampered.get(2)!)
    first[0] ^= 0xff
    tampered.set(2, first)
    await expect(
      assembleTransfer(tampered, collector.total, collector.metadata!),
    ).rejects.toMatchObject({ reason: 'checksum' })
  })

  it('fails to decode text that is not valid UTF-8', async () => {
    const { collector } = await collected(text('héllo'))
    const meta = collector.metadata!
    // Pretend the sender declared text but the bytes are invalid UTF-8.
    const bytes = new Uint8Array([0xff, 0xfe, 0xfd])
    const { computeChecksum } = await import('./checksum')
    const forged = {
      ...meta,
      compression: 'none' as const,
      originalSize: bytes.length,
      checksum: await computeChecksum(bytes),
    }
    await expect(assembleTransfer(new Map([[1, bytes]]), 2, forged)).rejects.toMatchObject({
      reason: 'decode',
    })
  })
})
