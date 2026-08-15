import type { Compression } from './types'

export const COMPRESSION: Compression = 'gzip'

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
