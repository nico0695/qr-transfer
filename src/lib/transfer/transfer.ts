/**
 * Sender/receiver pipeline on top of the pure building blocks:
 *
 *   text  → UTF-8 ─┐
 *   file  → bytes ─┴→ preparePayload: gzip? → SHA-256(original) → { metadata, bytes, stats }
 *                     buildTransfer:  chunks → header + data frames
 *   frames → ChunkCollector → assembleTransfer: join → restore → verify → text | file
 *
 * `preparePayload` is the expensive, settings-independent half; `buildTransfer` is cheap and
 * depends on the chunk size, so the UI can re-run it whenever the profile changes.
 */
import { computeChecksum, verifyChecksum } from './checksum'
import { joinChunks, splitBytes } from './chunking'
import { chooseCompression, restore } from './compression'
import { utf8Decode, utf8Encode } from './encoding'
import { truncateFilename } from './filename'
import { createTransferId, encodeFrame, normalizeMimeType } from './protocol'
import type {
  PreparedPayload,
  PreparedTransfer,
  ReceivedTransfer,
  TransferFrame,
  TransferInput,
  TransferMetadata,
} from './types'

/** Number of QR frames (header included) needed to carry `transferBytes` at `chunkSize`. */
export function countFrames(transferBytes: number, chunkSize: number): number {
  return 1 + Math.max(1, Math.ceil(transferBytes / chunkSize))
}

export async function preparePayload(input: TransferInput): Promise<PreparedPayload> {
  const original = input.kind === 'text' ? utf8Encode(input.text) : input.bytes
  const [choice, checksum] = await Promise.all([
    chooseCompression(original),
    computeChecksum(original),
  ])
  const common = {
    compression: choice.compression,
    checksum,
    originalSize: original.length,
  }
  const metadata: TransferMetadata =
    input.kind === 'text'
      ? { type: 'text', ...common }
      : {
          type: 'file',
          ...common,
          filename: truncateFilename(input.filename),
          mimeType: normalizeMimeType(input.mimeType),
        }
  return {
    metadata,
    bytes: choice.bytes,
    stats: {
      characters: input.kind === 'text' ? input.text.length : null,
      originalBytes: original.length,
      transferBytes: choice.bytes.length,
      compression: choice.compression,
      ratio: original.length === 0 ? 0 : Math.max(0, 1 - choice.bytes.length / original.length),
    },
  }
}

/** Splits a prepared payload into protocol frames (header first). Synchronous and cheap. */
export function buildTransfer(payload: PreparedPayload, chunkSize: number): PreparedTransfer {
  const transferId = createTransferId()
  const chunks = splitBytes(payload.bytes, chunkSize)
  const total = 1 + chunks.length
  const frames: string[] = [
    encodeFrame({
      version: 2,
      transferId,
      index: 0,
      total,
      kind: 'header',
      metadata: payload.metadata,
    }),
    ...chunks.map((chunk, i) =>
      encodeFrame({ version: 2, transferId, index: i + 1, total, kind: 'data', payload: chunk }),
    ),
  ]
  return { transferId, metadata: payload.metadata, total, frames, stats: payload.stats }
}

/** Convenience for tests and callers that do not need the two-step split. */
export async function prepareTransfer(
  input: TransferInput,
  chunkSize: number,
): Promise<PreparedTransfer> {
  return buildTransfer(await preparePayload(input), chunkSize)
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

/**
 * Joins the ordered data chunks, restores compression, verifies size and SHA-256 against the
 * header metadata, and decodes text when applicable.
 */
export async function assembleTransfer(
  chunks: ReadonlyMap<number, Uint8Array>,
  total: number,
  metadata: TransferMetadata,
): Promise<ReceivedTransfer> {
  const ordered: Uint8Array[] = []
  for (let i = 1; i < total; i++) {
    const chunk = chunks.get(i)
    if (chunk === undefined) throw new TransferError('incomplete', `Missing chunk ${i}`)
    ordered.push(chunk)
  }
  let bytes: Uint8Array
  try {
    bytes = await restore(joinChunks(ordered), metadata.compression)
  } catch {
    throw new TransferError('decompress')
  }
  if (bytes.length !== metadata.originalSize) throw new TransferError('checksum', 'Size mismatch')
  if (!(await verifyChecksum(bytes, metadata.checksum))) throw new TransferError('checksum')
  if (metadata.type === 'file') {
    return { type: 'file', filename: metadata.filename, mimeType: metadata.mimeType, bytes }
  }
  try {
    return { type: 'text', text: utf8Decode(bytes) }
  } catch {
    throw new TransferError('decode')
  }
}

/**
 * Receiver-side accumulator. Locks onto the first transfer it sees, ignores frames from other
 * transfers or inconsistent frames, and de-duplicates by index. Index 0 is the header.
 */
export class ChunkCollector {
  private chunks = new Map<number, Uint8Array>()
  private header: TransferMetadata | null = null
  private locked: { transferId: string; total: number } | null = null

  get transferId(): string | null {
    return this.locked?.transferId ?? null
  }

  /** Frames in the transfer, header included (0 until locked). */
  get total(): number {
    return this.locked?.total ?? 0
  }

  get metadata(): TransferMetadata | null {
    return this.header
  }

  /** Frames received so far, header included. */
  get received(): number {
    return this.chunks.size + (this.header === null ? 0 : 1)
  }

  get isComplete(): boolean {
    return (
      this.locked !== null && this.header !== null && this.chunks.size === this.locked.total - 1
    )
  }

  /** 0-based indexes of frames still missing (0 = header). */
  get missingIndexes(): number[] {
    if (this.locked === null) return []
    const missing: number[] = []
    if (this.header === null) missing.push(0)
    for (let i = 1; i < this.locked.total; i++) if (!this.chunks.has(i)) missing.push(i)
    return missing
  }

  get chunkMap(): ReadonlyMap<number, Uint8Array> {
    return this.chunks
  }

  /**
   * Returns 'accepted' when a new frame was stored, 'duplicate' when already known,
   * 'ignored' when the frame belongs to another transfer or is inconsistent.
   */
  add(frame: TransferFrame): 'accepted' | 'duplicate' | 'ignored' {
    if (this.locked === null) {
      this.locked = { transferId: frame.transferId, total: frame.total }
    } else if (frame.transferId !== this.locked.transferId || frame.total !== this.locked.total) {
      return 'ignored'
    }
    if (frame.kind === 'header') {
      if (this.header !== null) return 'duplicate'
      this.header = frame.metadata
      return 'accepted'
    }
    if (this.chunks.has(frame.index)) return 'duplicate'
    this.chunks.set(frame.index, frame.payload)
    return 'accepted'
  }

  reset(): void {
    this.chunks = new Map()
    this.header = null
    this.locked = null
  }
}
