import { describe, expect, it } from 'vitest'
import { detectFormat } from './formatDetection'

describe('detectFormat', () => {
  it('detects JSON', () => {
    expect(detectFormat('{"a": 1}')).toBe('json')
    expect(detectFormat('  [1, 2, 3]')).toBe('json')
  })

  it('detects Markdown', () => {
    expect(detectFormat('# Title\n\n- item\n- item')).toBe('markdown')
    expect(detectFormat('# Only a heading')).toBe('markdown')
  })

  it('falls back to text', () => {
    expect(detectFormat('')).toBe('text')
    expect(detectFormat('just some prose\nwith lines')).toBe('text')
    expect(detectFormat('{not json')).toBe('text')
  })
})
