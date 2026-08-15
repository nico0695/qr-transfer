import { describe, expect, it } from 'vitest'
import { CHECKSUM_LENGTH, computeChecksum, verifyChecksum } from './checksum'

describe('checksum', () => {
  it('is deterministic and hex of fixed length', async () => {
    const a = await computeChecksum(new Uint8Array([1, 2, 3]))
    const b = await computeChecksum(new Uint8Array([1, 2, 3]))
    expect(a).toBe(b)
    expect(a).toMatch(new RegExp(`^[0-9a-f]{${CHECKSUM_LENGTH}}$`))
  })

  it('differs for different input and verifies', async () => {
    const a = await computeChecksum(new Uint8Array([1, 2, 3]))
    const c = await computeChecksum(new Uint8Array([1, 2, 4]))
    expect(a).not.toBe(c)
    expect(await verifyChecksum(new Uint8Array([1, 2, 3]), a)).toBe(true)
    expect(await verifyChecksum(new Uint8Array([1, 2, 3]), c)).toBe(false)
  })
})
