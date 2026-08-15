import { describe, expect, it } from 'vitest'
import { CHUNK_SIZE } from './config'
import { decodeFrame } from './protocol'
import {
  ChunkCollector,
  TransferError,
  assembleTransfer,
  computeStats,
  prepareTransfer,
} from './transfer'

async function roundTrip(text: string, chunkSize = CHUNK_SIZE, shuffle = false) {
  const prepared = await prepareTransfer(text, chunkSize)
  const collector = new ChunkCollector()
  const frames = [...prepared.frames]
  if (shuffle) frames.sort(() => Math.random() - 0.5)
  for (const frame of frames) {
    const decoded = decodeFrame(frame)
    expect(decoded).not.toBeNull()
    collector.add(decoded!)
  }
  expect(collector.isComplete).toBe(true)
  const result = await assembleTransfer(collector.chunkMap, collector.total, collector.checksum!)
  expect(result).toBe(text)
  return prepared
}

const samples: Record<string, string> = {
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

describe('transfer round-trip', () => {
  for (const [name, text] of Object.entries(samples)) {
    it(`preserves ${name} content exactly`, async () => {
      await roundTrip(text)
    })
  }

  it('preserves a large document split into many frames', async () => {
    const chunk = 'Lorem ipsum dolor sit amet, ' + 'ñandú 🦙 ' + Math.random().toString(36) + '\n'
    let text = ''
    while (text.length < 60_000) text += chunk + Math.random().toString(36) + '\n'
    const prepared = await roundTrip(text, 200, true)
    expect(prepared.total).toBeGreaterThan(10)
    expect(prepared.frames).toHaveLength(prepared.total)
    expect(prepared.stats.characters).toBe(text.length)
    expect(prepared.stats.originalBytes).toBeGreaterThan(text.length)
  })

  it('handles small chunk sizes with lots of frames', async () => {
    await roundTrip(samples.unicode, 8, true)
  })

  it('computes stats consistently with prepareTransfer', async () => {
    const stats = await computeStats(samples.markdown)
    const prepared = await prepareTransfer(samples.markdown)
    expect(stats.originalBytes).toBe(prepared.stats.originalBytes)
    expect(stats.compressedBytes).toBe(prepared.stats.compressedBytes)
    expect(stats.frames).toBe(prepared.total)
  })
})

function noisyText(length: number): string {
  let text = ''
  while (text.length < length) text += Math.random().toString(36).slice(2) + ' '
  return text
}

describe('ChunkCollector', () => {
  async function framesFor(text: string, chunkSize: number) {
    const prepared = await prepareTransfer(text, chunkSize)
    return { prepared, decoded: prepared.frames.map((f) => decodeFrame(f)!) }
  }

  it('deduplicates and accepts any order', async () => {
    const { decoded } = await framesFor(noisyText(5000), 100)
    expect(decoded.length).toBeGreaterThanOrEqual(10)
    const collector = new ChunkCollector()
    const order = [4, 5, 1, 9, 2, 4, 7, 4, 1]
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
    ])
    expect(collector.received).toBe(6)
    expect(collector.isComplete).toBe(false)
    expect(collector.missingIndexes).toContain(0)
    expect(collector.missingIndexes).not.toContain(4)
  })

  it('reports incomplete when a chunk is missing', async () => {
    const { decoded } = await framesFor(noisyText(5000), 100)
    const collector = new ChunkCollector()
    decoded.filter((f) => f.index !== 3).forEach((f) => collector.add(f))
    expect(collector.isComplete).toBe(false)
    await expect(
      assembleTransfer(collector.chunkMap, collector.total, collector.checksum!),
    ).rejects.toMatchObject({ reason: 'incomplete' })
  })

  it('ignores frames from another transfer once locked', async () => {
    const a = await framesFor('first transfer', 5)
    const b = await framesFor('second transfer', 5)
    const collector = new ChunkCollector()
    expect(collector.add(a.decoded[0])).toBe('accepted')
    expect(collector.add(b.decoded[0])).toBe('ignored')
    expect(collector.transferId).toBe(a.prepared.transferId)
    collector.reset()
    expect(collector.add(b.decoded[0])).toBe('accepted')
  })

  it('ignores inconsistent frames within the same transfer id', async () => {
    const { decoded } = await framesFor('consistency check text', 5)
    const collector = new ChunkCollector()
    collector.add(decoded[0])
    expect(collector.add({ ...decoded[1], total: decoded[1].total + 1 })).toBe('ignored')
    expect(collector.add({ ...decoded[1], checksum: '0000000000000000' })).toBe('ignored')
  })
})

describe('assembleTransfer verification', () => {
  it('fails on checksum mismatch', async () => {
    const prepared = await prepareTransfer('some content to verify', 8)
    const collector = new ChunkCollector()
    prepared.frames.forEach((f) => collector.add(decodeFrame(f)!))
    await expect(
      assembleTransfer(collector.chunkMap, collector.total, '0000000000000000'),
    ).rejects.toBeInstanceOf(TransferError)
  })

  it('fails on corrupted chunk bytes', async () => {
    const prepared = await prepareTransfer('some content to verify', 8)
    const collector = new ChunkCollector()
    prepared.frames.forEach((f) => collector.add(decodeFrame(f)!))
    const tampered = new Map(collector.chunkMap)
    const first = new Uint8Array(tampered.get(0)!)
    first[0] ^= 0xff
    tampered.set(0, first)
    await expect(
      assembleTransfer(tampered, collector.total, prepared.checksum),
    ).rejects.toMatchObject({ reason: 'checksum' })
  })
})
