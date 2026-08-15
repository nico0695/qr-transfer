/**
 * Filenames are untrusted data on both ends: the sender bounds their size so the header frame
 * fits in a QR; the receiver sanitizes them before offering a download.
 */
import { MAX_FILENAME_BYTES } from './config'
import { utf8Encode } from './encoding'

export const FALLBACK_FILENAME = 'download'

// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS_RE = /[\x00-\x1f\x7f<>:"/\\|?*]/g
const RESERVED_WINDOWS_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

/** Trims a name to at most `maxBytes` of UTF-8 without splitting code points, keeping the extension when possible. */
export function truncateFilename(name: string, maxBytes = MAX_FILENAME_BYTES): string {
  if (utf8Encode(name).length <= maxBytes) return name
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 && name.length - dot <= 16 ? name.slice(dot) : ''
  const extBytes = utf8Encode(ext).length
  const budget = extBytes < maxBytes ? maxBytes - extBytes : maxBytes
  const stem = ext ? name.slice(0, dot) : name
  let out = ''
  for (const char of stem) {
    if (utf8Encode(out + char).length > budget) break
    out += char
  }
  if (out === '') return FALLBACK_FILENAME
  return extBytes < maxBytes ? out + ext : out
}

/**
 * Makes a received filename safe for `<a download>`: strips path separators, control chars and
 * characters that are illegal on common filesystems; never yields an empty or dot-only name.
 */
export function sanitizeFilename(name: string): string {
  let out = name
    .normalize('NFC')
    .replace(UNSAFE_CHARS_RE, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[. ]+/, '')
    .replace(/[. ]+$/, '')
  if (/^[_. ]*$/.test(out)) out = FALLBACK_FILENAME
  if (RESERVED_WINDOWS_RE.test(out)) out = `_${out}`
  return truncateFilename(out)
}
