import { describe, expect, it } from 'vitest'
import { base64UrlToBytes, bytesToBase64Url, isBase64Url, utf8Decode, utf8Encode } from './encoding'

function random(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return bytes
}

describe('base64url', () => {
  it('round-trips arrays of every small length', () => {
    for (let n = 0; n <= 5; n++) {
      const bytes = random(n)
      const encoded = bytesToBase64Url(bytes)
      expect(encoded).not.toMatch(/[+/=]/)
      expect(base64UrlToBytes(encoded)).toEqual(bytes)
    }
  })

  it('round-trips a large random buffer', () => {
    const bytes = random(100_000)
    expect(base64UrlToBytes(bytesToBase64Url(bytes))).toEqual(bytes)
  })

  it('rejects invalid input', () => {
    expect(isBase64Url('abc$')).toBe(false)
    expect(isBase64Url('a')).toBe(false)
    expect(() => base64UrlToBytes('a+b/')).toThrow()
  })
})

describe('utf8', () => {
  it('round-trips unicode', () => {
    const text = 'Añoñ 🚀 日本語 \u{1F468}\u{200D}\u{1F469}'
    expect(utf8Decode(utf8Encode(text))).toBe(text)
  })

  it('fails on malformed bytes', () => {
    expect(() => utf8Decode(new Uint8Array([0xff, 0xfe]))).toThrow()
  })
})
