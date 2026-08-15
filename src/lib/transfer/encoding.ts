/**
 * Safe transformations between binary payloads and QR-friendly strings.
 * QR decoders return text, so payloads travel as Base64URL (no padding) — plain ASCII.
 */

const BASE64URL_RE = /^[A-Za-z0-9_-]*$/

export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** Decodes UTF-8 strictly: malformed sequences throw instead of producing U+FFFD. */
export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  // Build the latin1 string in slices to avoid call-stack limits with large arrays.
  const SLICE = 0x8000
  for (let i = 0; i < bytes.length; i += SLICE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + SLICE))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function isBase64Url(text: string): boolean {
  return BASE64URL_RE.test(text) && text.length % 4 !== 1
}

/** Throws on invalid input. */
export function base64UrlToBytes(text: string): Uint8Array {
  if (!isBase64Url(text)) throw new Error('Invalid Base64URL input')
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
