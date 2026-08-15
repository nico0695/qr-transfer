/** Splits bytes into consecutive chunks of at most `size` bytes. Empty input yields one empty chunk. */
export function splitBytes(bytes: Uint8Array, size: number): Uint8Array[] {
  if (!Number.isInteger(size) || size <= 0) throw new Error('Chunk size must be a positive integer')
  if (bytes.length === 0) return [new Uint8Array(0)]
  const chunks: Uint8Array[] = []
  for (let offset = 0; offset < bytes.length; offset += size) {
    chunks.push(bytes.slice(offset, offset + size))
  }
  return chunks
}

export function joinChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const joined = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.length
  }
  return joined
}
