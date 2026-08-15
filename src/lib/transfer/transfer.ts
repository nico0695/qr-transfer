/**
 * Sender/receiver pipeline on top of the pure building blocks:
 *   text → UTF-8 → gzip → chunks → frames         (prepareTransfer)
 *   frames → chunks → verify → gunzip → text      (ChunkCollector + assembleTransfer)
 */
import { computeChecksum, verifyChecksum } from './checksum'
import { joinChunks, splitBytes } from './chunking'
import { COMPRESSION, compress, decompress } from './compression'
import { CHUNK_SIZE } from './config'
import { utf8Decode, utf8Encode } from './encoding'
import { createTransferId, encodeFrame } from './protocol'
import type { PreparedTransfer, TransferFrame, TransferStats } from './types'

export function estimateFrames(compressedBytes: number, chunkSize = CHUNK_SIZE): number {
  return Math.max(1, Math.ceil(compressedBytes / chunkSize))
}

export async function computeStats(text: string, chunkSize = CHUNK_SIZE): Promise<TransferStats> {
  const original = utf8Encode(text)
  const compressed = await compress(original)
  return buildStats(text, original.length, compressed.length, chunkSize)
}

function buildStats(
  text: string,
  originalBytes: number,
  compressedBytes: number,
  chunkSize: number,
): TransferStats {
  return {
    characters: text.length,
    originalBytes,
    compressedBytes,
    ratio: originalBytes === 0 ? 0 : Math.max(0, 1 - compressedBytes / originalBytes),
    frames: estimateFrames(compressedBytes, chunkSize),
  }
}

export async function prepareTransfer(
  text: string,
  chunkSize = CHUNK_SIZE,
): Promise<PreparedTransfer> {
  const original = utf8Encode(text)
  const compressed = await compress(original)
  const checksum = await computeChecksum(compressed)
  const transferId = createTransferId()
  const chunks = splitBytes(compressed, chunkSize)
  const total = chunks.length
  const frames = chunks.map((payload, index) =>
    encodeFrame({
      version: 1,
      transferId,
      index,
      total,
      compression: COMPRESSION,
      checksum,
      payload,
    }),
  )
  return {
    transferId,
    checksum,
    total,
    frames,
    stats: buildStats(text, original.length, compressed.length, chunkSize),
  }
}

export class TransferError extends Error {
  constructor(
    public readonly reason: 'incomplete' | 'checksum' | 'decompress' | 'decode',
    message?: string,
  ) {
    super(message ?? reason)
    this.name = 'TransferError'
  }
}

/** Joins the ordered chunks, verifies the checksum, decompresses and decodes to text. */
export async function assembleTransfer(
  chunks: ReadonlyMap<number, Uint8Array>,
  total: number,
  checksum: string,
): Promise<string> {
  const ordered: Uint8Array[] = []
  for (let i = 0; i < total; i++) {
    const chunk = chunks.get(i)
    if (chunk === undefined) throw new TransferError('incomplete', `Missing chunk ${i}`)
    ordered.push(chunk)
  }
  const compressed = joinChunks(ordered)
  if (!(await verifyChecksum(compressed, checksum))) throw new TransferError('checksum')
  let bytes: Uint8Array
  try {
    bytes = await decompress(compressed)
  } catch {
    throw new TransferError('decompress')
  }
  try {
    return utf8Decode(bytes)
  } catch {
    throw new TransferError('decode')
  }
}

/**
 * Receiver-side accumulator. Locks onto the first transfer it sees, ignores frames from other
 * transfers or inconsistent frames, and de-duplicates by index.
 */
export class ChunkCollector {
  private chunks = new Map<number, Uint8Array>()
  private locked: { transferId: string; total: number; checksum: string } | null = null

  get transferId(): string | null {
    return this.locked?.transferId ?? null
  }

  get total(): number {
    return this.locked?.total ?? 0
  }

  get checksum(): string | null {
    return this.locked?.checksum ?? null
  }

  get received(): number {
    return this.chunks.size
  }

  get isComplete(): boolean {
    return this.locked !== null && this.chunks.size === this.locked.total
  }

  get missingIndexes(): number[] {
    if (this.locked === null) return []
    const missing: number[] = []
    for (let i = 0; i < this.locked.total; i++) if (!this.chunks.has(i)) missing.push(i)
    return missing
  }

  get chunkMap(): ReadonlyMap<number, Uint8Array> {
    return this.chunks
  }

  /**
   * Returns 'accepted' when a new chunk was stored, 'duplicate' when already known,
   * 'ignored' when the frame belongs to another transfer or is inconsistent.
   */
  add(frame: TransferFrame): 'accepted' | 'duplicate' | 'ignored' {
    if (this.locked === null) {
      this.locked = { transferId: frame.transferId, total: frame.total, checksum: frame.checksum }
    } else if (
      frame.transferId !== this.locked.transferId ||
      frame.total !== this.locked.total ||
      frame.checksum !== this.locked.checksum
    ) {
      return 'ignored'
    }
    if (this.chunks.has(frame.index)) return 'duplicate'
    this.chunks.set(frame.index, frame.payload)
    return 'accepted'
  }

  reset(): void {
    this.chunks = new Map()
    this.locked = null
  }
}
