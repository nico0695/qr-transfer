export type Compression = 'gzip' | 'none'

export type TransferType = 'text' | 'file'

/** What the sender wants to transfer, already reduced to bytes-friendly primitives. */
export type TransferInput =
  | { kind: 'text'; text: string }
  | { kind: 'file'; filename: string; mimeType: string; bytes: Uint8Array }

/**
 * Metadata carried once per transfer in the header frame. `checksum` is the full SHA-256 (hex)
 * of the ORIGINAL bytes (before compression); `originalSize` is their length.
 */
export type TransferMetadata =
  | { type: 'text'; compression: Compression; checksum: string; originalSize: number }
  | {
      type: 'file'
      compression: Compression
      checksum: string
      originalSize: number
      filename: string
      mimeType: string
    }

interface FrameBase {
  version: number
  transferId: string
  /** 0 for the header frame, 1..total-1 for data frames. */
  index: number
  /** Number of frames including the header (≥ 2). */
  total: number
}

export type TransferFrame =
  | (FrameBase & { kind: 'header'; metadata: TransferMetadata })
  | (FrameBase & { kind: 'data'; payload: Uint8Array })

/** Content-only facts about a transfer; independent from chunk size / speed settings. */
export interface TransferStats {
  /** Only for text input. */
  characters: number | null
  originalBytes: number
  /** Bytes that actually travel through the QR frames (after the compression decision). */
  transferBytes: number
  compression: Compression
  /** Fraction of size saved, 0..1 (0 when compression was not used). */
  ratio: number
}

/** Result of the expensive, settings-independent half of the pipeline. */
export interface PreparedPayload {
  metadata: TransferMetadata
  /** Bytes to split into frames (compressed or original). */
  bytes: Uint8Array
  stats: TransferStats
}

export interface PreparedTransfer {
  transferId: string
  metadata: TransferMetadata
  total: number
  /** Encoded protocol frames, one per QR, ordered by index (header first). */
  frames: string[]
  stats: TransferStats
}

/** What the receiver hands to the UI after successful verification. */
export type ReceivedTransfer =
  | { type: 'text'; text: string }
  | { type: 'file'; filename: string; mimeType: string; bytes: Uint8Array }

export type ContentFormat = 'text' | 'markdown' | 'json'
