/**
 * QRTransfer Protocol v2 — one ASCII string per QR frame:
 *
 *   header (index 0):   QRT2|<transferId>|0|<total>|H|<metadata>
 *   data   (index ≥ 1): QRT2|<transferId>|<index>|<total>|D|<payload>
 *
 *   transferId   8 Base64URL chars, random per transfer (48 bits)
 *   index        0-based frame index (decimal); 0 is always the header
 *   total        number of frames INCLUDING the header (decimal, ≥ 2)
 *   metadata     Base64URL of UTF-8 JSON, sent once:
 *                  { t: "t"|"f", c: "g"|"n", h: <sha256 hex of original>, s: <original size>,
 *                    n?: <filename>, m?: <mime type> }        (n, m only for files)
 *   payload      Base64URL (no padding) of this chunk of the transfer bytes
 *
 * Data frames carry no metadata: everything needed to verify travels in the header, which the
 * loop repeats like any other frame. v1 (`QRT1|…`) is not accepted; `detectProtocolVersion`
 * lets the receiver explain why.
 */
import { CHECKSUM_LENGTH } from './checksum'
import { MAX_FILENAME_BYTES, MAX_MIME_LENGTH } from './config'
import { base64UrlToBytes, bytesToBase64Url, isBase64Url, utf8Decode, utf8Encode } from './encoding'
import type { Compression, TransferFrame, TransferMetadata } from './types'

export const PROTOCOL_MAGIC = 'QRT'
export const PROTOCOL_VERSION = 2
export const TRANSFER_ID_LENGTH = 8

const SEPARATOR = '|'
const HEADER = `${PROTOCOL_MAGIC}${PROTOCOL_VERSION}`
const KIND_HEADER = 'H'
const KIND_DATA = 'D'
const COMPRESSION_CODES: Record<Compression, string> = { gzip: 'g', none: 'n' }
const COMPRESSION_BY_CODE: Record<string, Compression> = { g: 'gzip', n: 'none' }
const TRANSFER_ID_RE = /^[A-Za-z0-9_-]{8}$/
const CHECKSUM_RE = new RegExp(`^[0-9a-f]{${CHECKSUM_LENGTH}}$`)
const DECIMAL_RE = /^(0|[1-9][0-9]*)$/
const VERSION_RE = new RegExp(`^${PROTOCOL_MAGIC}([0-9]{1,3})\\${SEPARATOR}`)
const MIME_RE = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i

export function createTransferId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return bytesToBase64Url(bytes) // 6 bytes → exactly 8 chars, no padding
}

/** Version number of any `QRT<n>|…` string (even unsupported ones), or `null` if not ours. */
export function detectProtocolVersion(text: string): number | null {
  if (typeof text !== 'string') return null
  const match = VERSION_RE.exec(text)
  return match === null ? null : Number(match[1])
}

export function encodeFrame(frame: TransferFrame): string {
  const body =
    frame.kind === 'header'
      ? [KIND_HEADER, encodeMetadata(frame.metadata)]
      : [KIND_DATA, bytesToBase64Url(frame.payload)]
  return [HEADER, frame.transferId, String(frame.index), String(frame.total), ...body].join(
    SEPARATOR,
  )
}

/** Returns `null` for anything that is not a well-formed v2 frame. Never throws. */
export function decodeFrame(text: string): TransferFrame | null {
  if (typeof text !== 'string' || !text.startsWith(HEADER + SEPARATOR)) return null
  const parts = text.split(SEPARATOR)
  if (parts.length !== 6) return null
  const [, transferId, indexText, totalText, kind, body] = parts

  if (!TRANSFER_ID_RE.test(transferId)) return null
  if (!DECIMAL_RE.test(indexText) || !DECIMAL_RE.test(totalText)) return null
  const index = Number(indexText)
  const total = Number(totalText)
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(total)) return null
  if (total < 2 || index >= total) return null
  if (!isBase64Url(body)) return null

  const base = { version: PROTOCOL_VERSION, transferId, index, total }
  if (kind === KIND_HEADER) {
    if (index !== 0) return null
    const metadata = decodeMetadata(body)
    return metadata === null ? null : { ...base, kind: 'header', metadata }
  }
  if (kind === KIND_DATA) {
    if (index === 0) return null
    try {
      return { ...base, kind: 'data', payload: base64UrlToBytes(body) }
    } catch {
      return null
    }
  }
  return null
}

interface WireMetadata {
  t: 't' | 'f'
  c: string
  h: string
  s: number
  n?: string
  m?: string
}

export function encodeMetadata(metadata: TransferMetadata): string {
  const wire: WireMetadata = {
    t: metadata.type === 'text' ? 't' : 'f',
    c: COMPRESSION_CODES[metadata.compression],
    h: metadata.checksum,
    s: metadata.originalSize,
  }
  if (metadata.type === 'file') {
    wire.n = metadata.filename
    wire.m = metadata.mimeType
  }
  return bytesToBase64Url(utf8Encode(JSON.stringify(wire)))
}

/** Returns `null` on any malformed or out-of-bounds metadata. Never throws. */
export function decodeMetadata(text: string): TransferMetadata | null {
  let wire: unknown
  try {
    wire = JSON.parse(utf8Decode(base64UrlToBytes(text)))
  } catch {
    return null
  }
  if (typeof wire !== 'object' || wire === null) return null
  const { t, c, h, s, n, m } = wire as Record<string, unknown>
  if (t !== 't' && t !== 'f') return null
  if (typeof c !== 'string' || !(c in COMPRESSION_BY_CODE)) return null
  if (typeof h !== 'string' || !CHECKSUM_RE.test(h)) return null
  if (typeof s !== 'number' || !Number.isSafeInteger(s) || s < 0) return null
  const common = { compression: COMPRESSION_BY_CODE[c], checksum: h, originalSize: s }
  if (t === 't') return { type: 'text', ...common }
  if (typeof n !== 'string' || utf8Encode(n).length > MAX_FILENAME_BYTES) return null
  if (typeof m !== 'string' || m.length > MAX_MIME_LENGTH) return null
  return { type: 'file', ...common, filename: n, mimeType: m }
}

/** Untrusted MIME types are only used to build a Blob; anything odd becomes octet-stream. */
export function normalizeMimeType(mimeType: string): string {
  const trimmed = mimeType.trim()
  return MIME_RE.test(trimmed) && trimmed.length <= MAX_MIME_LENGTH
    ? trimmed.toLowerCase()
    : 'application/octet-stream'
}
