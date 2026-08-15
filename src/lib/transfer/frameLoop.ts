/**
 * Timing for the sender's animated loop, kept pure so frame advancement is testable without a DOM.
 *
 * The loop is driven by `requestAnimationFrame` against a wall clock rather than `setInterval`:
 * the displayed frame is a function of how much time has passed, so a dropped animation frame, a
 * throttled background tab or a slow repaint cannot make the loop drift or skip.
 */

/**
 * Which frame should be on screen after `elapsedMs`. Returns 0 for any degenerate input rather
 * than throwing — a frame index is not worth crashing a transfer over.
 */
export function frameIndexAt(elapsedMs: number, frameMs: number, total: number): number {
  if (!Number.isFinite(total) || total < 1) return 0
  const count = Math.floor(total)
  if (count === 1) return 0
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0
  if (!Number.isFinite(frameMs) || frameMs <= 0) return 0
  return Math.floor(elapsedMs / frameMs) % count
}

/**
 * Indexes to keep decoded ahead of `index`, wrapping around the loop. Only a window is preloaded:
 * a transfer near `MAX_TRANSFER_BYTES` runs to thousands of frames, and holding every decoded
 * bitmap in memory at once would be far more expensive than decoding one just in time.
 */
export function preloadWindow(index: number, total: number, ahead: number): number[] {
  if (!Number.isFinite(total) || total < 1) return []
  const count = Math.floor(total)
  const size = Math.min(Math.max(0, Math.floor(ahead)) + 1, count)
  const start = Number.isFinite(index) && index > 0 ? Math.floor(index) % count : 0
  return Array.from({ length: size }, (_, offset) => (start + offset) % count)
}
