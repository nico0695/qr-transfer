import { useCallback, useEffect, useRef, useState } from 'react'
import { frameIndexAt, preloadWindow } from '../../lib/transfer/frameLoop'

/** Frames kept decoded ahead of the visible one. */
const PRELOAD_AHEAD = 3

/**
 * Drives the animated QR loop.
 *
 * The image `src` is assigned through a ref rather than rendered from state: swapping it is the
 * only thing that has to happen on time, and routing it through React would re-render (and
 * reconcile) the image on every frame. The visible counter still lives in state, but it changes at
 * most once per frame — a few times per second — instead of once per animation frame.
 *
 * Each upcoming image is decoded ahead of being shown, so the browser never decodes a PNG while
 * the frame is supposed to be on screen; a half-painted swap is exactly the kind of blended frame
 * the camera cannot read.
 */
export function useFrameLoop(images: readonly string[], frameMs: number) {
  const [index, setIndex] = useState(0)
  const elementRef = useRef<HTMLImageElement | null>(null)
  // Mirrors whatever src the element should currently show, so a node that mounts (or remounts,
  // e.g. when a portal's target container swaps) after a frame change can be painted immediately
  // instead of waiting for the animation effect to run again — it won't, since its deps didn't change.
  const currentSrcRef = useRef<string | null>(null)
  const decodedRef = useRef(new Set<number>())

  const imageRef = useCallback((node: HTMLImageElement | null) => {
    elementRef.current = node
    if (node !== null && currentSrcRef.current !== null) {
      node.src = currentSrcRef.current
    }
  }, [])

  useEffect(() => {
    decodedRef.current = new Set()
  }, [images])

  useEffect(() => {
    const total = images.length
    if (total === 0) return

    let handle = 0
    let shown = -1
    const startedAt = performance.now()

    const preload = (from: number) => {
      for (const target of preloadWindow(from, total, PRELOAD_AHEAD)) {
        if (decodedRef.current.has(target)) continue
        decodedRef.current.add(target)
        const image = new Image()
        image.src = images[target]
        // decode() rejects if the image is replaced before it finishes; nothing to recover.
        void image.decode().catch(() => {})
      }
    }

    const step = () => {
      const next = total === 1 ? 0 : frameIndexAt(performance.now() - startedAt, frameMs, total)
      if (next !== shown) {
        shown = next
        currentSrcRef.current = images[next]
        if (elementRef.current !== null) elementRef.current.src = images[next]
        setIndex(next)
        preload(next)
      }
      handle = window.requestAnimationFrame(step)
    }

    preload(0)
    step()
    return () => window.cancelAnimationFrame(handle)
  }, [images, frameMs])

  return { index, imageRef }
}
