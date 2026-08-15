import { describe, expect, it } from 'vitest'
import { MAX_FILENAME_BYTES } from './config'
import { utf8Encode } from './encoding'
import { FALLBACK_FILENAME, sanitizeFilename, truncateFilename } from './filename'

describe('truncateFilename', () => {
  it('keeps short names untouched', () => {
    expect(truncateFilename('photo.jpg')).toBe('photo.jpg')
    expect(truncateFilename('ñandú 🦙.png')).toBe('ñandú 🦙.png')
  })

  it('bounds the UTF-8 size and keeps the extension', () => {
    const long = 'é'.repeat(200) + '.tar.gz'
    const out = truncateFilename(long)
    expect(utf8Encode(out).length).toBeLessThanOrEqual(MAX_FILENAME_BYTES)
    expect(out.endsWith('.gz')).toBe(true)
    expect(out.startsWith('é')).toBe(true)
  })

  it('never splits a code point', () => {
    const out = truncateFilename('🦙'.repeat(100), 10)
    expect(utf8Encode(out).length).toBeLessThanOrEqual(10)
    expect(out).toBe('🦙🦙')
  })

  it('handles absurd extensions', () => {
    const out = truncateFilename('a.' + 'x'.repeat(300), 20)
    expect(utf8Encode(out).length).toBeLessThanOrEqual(20)
    expect(out).not.toBe('')
  })
})

describe('sanitizeFilename', () => {
  it('strips path separators and traversal', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('_.._etc_passwd')
    expect(sanitizeFilename('C:\\Users\\x\\file.txt')).toBe('C__Users_x_file.txt')
    expect(sanitizeFilename('/')).toBe(FALLBACK_FILENAME)
    expect(sanitizeFilename('..')).toBe(FALLBACK_FILENAME)
    expect(sanitizeFilename('.hidden')).toBe('hidden')
  })

  it('removes control chars and illegal characters', () => {
    expect(sanitizeFilename('a\u0000b<c>d:e"f|g?h*i.txt')).toBe('a_b_c_d_e_f_g_h_i.txt')
    expect(sanitizeFilename('  spaced   name.md ')).toBe('spaced name.md')
  })

  it('keeps Unicode names', () => {
    expect(sanitizeFilename('informe ñandú 🦙.pdf')).toBe('informe ñandú 🦙.pdf')
  })

  it('escapes reserved Windows names and empty input', () => {
    expect(sanitizeFilename('CON')).toBe('_CON')
    expect(sanitizeFilename('nul.txt')).toBe('_nul.txt')
    expect(sanitizeFilename('')).toBe(FALLBACK_FILENAME)
  })
})
