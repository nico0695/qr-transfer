export type Compression = 'gzip'

export interface TransferFrame {
  version: number
  transferId: string
  index: number
  total: number
  compression: Compression
  checksum: string
  payload: Uint8Array
}

export interface TransferStats {
  characters: number
  originalBytes: number
  compressedBytes: number
  /** Fraction of size saved by compression, 0..1 (0 when nothing to compress). */
  ratio: number
  frames: number
}

export interface PreparedTransfer {
  transferId: string
  checksum: string
  total: number
  /** Encoded protocol frames, one per QR, ordered by index. */
  frames: string[]
  stats: TransferStats
}

export type ContentFormat = 'text' | 'markdown' | 'json'
