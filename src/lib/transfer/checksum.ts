/** Length in hex chars of the truncated SHA-256 carried in every frame (64 bits). */
export const CHECKSUM_LENGTH = 16

export async function computeChecksum(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, CHECKSUM_LENGTH)
}

export async function verifyChecksum(bytes: Uint8Array, expected: string): Promise<boolean> {
  return (await computeChecksum(bytes)) === expected
}
