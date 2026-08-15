/**
 * QRTransfer Protocol v1 — one ASCII string per QR frame:
 *
 *   QRT1|<transferId>|<index>|<total>|<compression>|<checksum>|<payload>
 *
 *   transferId   8 Base64URL chars, random per transfer (48 bits)
 *   index        0-based chunk index (decimal)
 *   total        number of chunks (decimal, ≥ 1)
 *   compression  "g" = gzip
 *   checksum     first 16 hex chars of SHA-256 over the full compressed bytes
 *   payload      Base64URL (no padding) of this chunk of the compressed bytes
 */
import { CHECKSUM_LENGTH } from './checksum'
import { base64UrlToBytes, bytesToBase64Url, isBase64Url } from './encoding'
import type { Compression, TransferFrame } from './types'

export const PROTOCOL_MAGIC = 'QRT'
export const PROTOCOL_VERSION = 1
export const TRANSFER_ID_LENGTH = 8

const SEPARATOR = '|'
const HEADER = `${PROTOCOL_MAGIC}${PROTOCOL_VERSION}`
const COMPRESSION_CODES: Record<Compression, string> = { gzip: 'g' }
const COMPRESSION_BY_CODE: Record<string, Compression> = { g: 'gzip' }
const TRANSFER_ID_RE = /^[A-Za-z0-9_-]{8}$/
const CHECKSUM_RE = new RegExp(`^[0-9a-f]{${CHECKSUM_LENGTH}}$`)
const DECIMAL_RE = /^(0|[1-9][0-9]*)$/

export function createTransferId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return bytesToBase64Url(bytes) // 6 bytes → exactly 8 chars, no padding
}

export function encodeFrame(frame: TransferFrame): string {
  return [
    HEADER,
    frame.transferId,
    String(frame.index),
    String(frame.total),
    COMPRESSION_CODES[frame.compression],
    frame.checksum,
    bytesToBase64Url(frame.payload),
  ].join(SEPARATOR)
}

/** Returns `null` for anything that is not a well-formed v1 frame. Never throws. */
export function decodeFrame(text: string): TransferFrame | null {
  if (typeof text !== 'string' || !text.startsWith(HEADER + SEPARATOR)) return null
  const parts = text.split(SEPARATOR)
  if (parts.length !== 7) return null
  const [, transferId, indexText, totalText, compressionCode, checksum, payloadText] = parts

  if (!TRANSFER_ID_RE.test(transferId)) return null
  if (!DECIMAL_RE.test(indexText) || !DECIMAL_RE.test(totalText)) return null
  const index = Number(indexText)
  const total = Number(totalText)
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(total)) return null
  if (total < 1 || index >= total) return null
  const compression = COMPRESSION_BY_CODE[compressionCode]
  if (compression === undefined) return null
  if (!CHECKSUM_RE.test(checksum)) return null
  if (!isBase64Url(payloadText)) return null

  let payload: Uint8Array
  try {
    payload = base64UrlToBytes(payloadText)
  } catch {
    return null
  }
  return { version: PROTOCOL_VERSION, transferId, index, total, compression, checksum, payload }
}
