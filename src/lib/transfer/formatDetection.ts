import type { ContentFormat } from './types'

/** Only attempt JSON.parse below this size to keep detection cheap. */
const JSON_PARSE_LIMIT = 1_000_000
const MARKDOWN_SAMPLE_LINES = 200
const MARKDOWN_RE = /^(#{1,6}\s|```|[-*+]\s|\d+\.\s|>\s|\|.*\|)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*/

/**
 * Conservative guess used only to pick syntax highlighting. Never changes the content.
 * Falls back to plain text whenever unsure.
 */
export function detectFormat(text: string): ContentFormat {
  const trimmed = text.trimStart()
  if (
    trimmed.length > 0 &&
    trimmed.length <= JSON_PARSE_LIMIT &&
    (trimmed[0] === '{' || trimmed[0] === '[')
  ) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // Not valid JSON; keep looking.
    }
  }
  const lines = text.split('\n', MARKDOWN_SAMPLE_LINES)
  const hits = lines.filter((line) => MARKDOWN_RE.test(line)).length
  if (hits >= 2 || (hits === 1 && lines.length <= 3)) return 'markdown'
  return 'text'
}
