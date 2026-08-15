import { COMPRESSION_MIN_GAIN } from './config'
import type { Compression } from './types'

async function pipe(bytes: Uint8Array, stream: TransformStream<Uint8Array, Uint8Array>) {
  const source = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(source).arrayBuffer())
}

export function compress(bytes: Uint8Array): Promise<Uint8Array> {
  return pipe(bytes, new CompressionStream('gzip'))
}

/** Rejects if the input is not a valid gzip stream. */
export function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  return pipe(bytes, new DecompressionStream('gzip'))
}

export interface CompressionChoice {
  compression: Compression
  bytes: Uint8Array
}

/**
 * Tries gzip and keeps it only when it saves a meaningful amount; already-compressed content
 * (images, archives, random data) is sent as-is.
 */
export async function chooseCompression(
  original: Uint8Array,
  minGain = COMPRESSION_MIN_GAIN,
): Promise<CompressionChoice> {
  if (original.length === 0) return { compression: 'none', bytes: original }
  const compressed = await compress(original)
  if (compressed.length < original.length * minGain)
    return { compression: 'gzip', bytes: compressed }
  return { compression: 'none', bytes: original }
}

/** Inverse of `chooseCompression`. Rejects if gzip data is corrupt. */
export function restore(bytes: Uint8Array, compression: Compression): Promise<Uint8Array> {
  return compression === 'gzip' ? decompress(bytes) : Promise.resolve(bytes)
}
