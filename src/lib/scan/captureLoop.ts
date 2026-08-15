/**
 * Captures camera frames and decodes them at the resolution the camera actually delivers.
 *
 * This is the fix the whole iteration is about. `html5-qrcode` sizes its decode canvas from the
 * viewfinder's CSS width, so a 1080p stream is thrown away before decoding and a dense symbol ends
 * up with about 3 pixels per module — the floor below which no decoder works. Here the crop comes
 * from `computeRoi` in native stream pixels and the canvas is sized by us.
 *
 * One `drawImage` with nine arguments does the crop and the downscale together. That also keeps us
 * off `createImageBitmap`'s resize options, which are the least exercised corner of that API:
 * Firefox 147-148 ignores the source rectangle when they are present, and WebKit does not apply
 * `resizeQuality` when the source is a video.
 */
import { buildVideoConstraints } from '../camera'
import { computeRoi } from './roi'
import type { EngineOptions, ScanEngine } from './engine'
import { createWorkerDecoder } from './workerDecoder'

/**
 * Whether this browser can run the loop at all. `requestVideoFrameCallback` is not in the list
 * because `requestAnimationFrame` covers the browsers that lack it.
 */
export function supportsCaptureLoop(): boolean {
  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof Worker === 'function' &&
    typeof requestAnimationFrame === 'function'
  )
}

export async function startCaptureLoop(options: EngineOptions): Promise<ScanEngine> {
  const { container, camera, onText, onAttempt, onReady } = options

  const stream = await navigator.mediaDevices.getUserMedia({
    video: buildVideoConstraints(camera),
    audio: false,
  })

  const video = document.createElement('video')
  // Both are required for iOS to play the stream inline instead of taking over the screen.
  video.playsInline = true
  video.muted = true
  video.setAttribute('muted', 'true')
  video.srcObject = stream
  container.append(video)

  let decoder
  try {
    decoder = createWorkerDecoder()
    // Waiting here is what makes the fallback real. The WASM module instantiates asynchronously,
    // so resolving before it is ready would mean a failed initialisation surfaces later — as every
    // capture coming back empty, forever, long after the caller stopped being able to choose the
    // other engine.
    await decoder.ready
  } catch (error) {
    // The stream is already open at this point; leaving it would keep the camera light on while
    // the caller falls back to the other engine.
    decoder?.dispose()
    for (const track of stream.getTracks()) track.stop()
    video.remove()
    throw error
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })

  let stopped = false
  let busy = false
  let handle = 0
  let reported = false

  const release = () => {
    for (const track of stream.getTracks()) track.stop()
    decoder.dispose()
    video.srcObject = null
    video.remove()
  }

  const step = () => {
    if (stopped) return
    schedule()
    // Skipping here rather than inside the decoder is deliberate: a frame that would be dropped
    // must not cost a drawImage and a getImageData first.
    if (busy || context === null) return
    const roi = computeRoi(video.videoWidth, video.videoHeight)
    if (roi === null) return

    if (!reported) {
      reported = true
      onReady({ width: video.videoWidth, height: video.videoHeight, roiSize: roi.size })
    }
    if (canvas.width !== roi.size) {
      canvas.width = roi.size
      canvas.height = roi.size
    }
    context.drawImage(video, roi.sx, roi.sy, roi.sw, roi.sh, 0, 0, roi.size, roi.size)
    const image = context.getImageData(0, 0, roi.size, roi.size)

    busy = true
    const startedAt = performance.now()
    void decoder
      .decode({ buffer: image.data.buffer as ArrayBuffer, width: roi.size, height: roi.size })
      .then(
        (text) => {
          const decodeMs = performance.now() - startedAt
          if (stopped) return
          onAttempt(text === null ? 'empty' : 'decoded', decodeMs)
          if (text !== null) onText(text)
        },
        () => {
          // A failed decode is a capture that produced nothing, not a reason to stop scanning.
          if (!stopped) onAttempt('empty', null)
        },
      )
      .finally(() => {
        busy = false
      })
  }

  const schedule = () => {
    handle =
      typeof video.requestVideoFrameCallback === 'function'
        ? video.requestVideoFrameCallback(step)
        : requestAnimationFrame(step)
  }

  const cancel = () => {
    if (handle === 0) return
    if (typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(handle)
    else cancelAnimationFrame(handle)
    handle = 0
  }

  try {
    await video.play()
  } catch {
    // Autoplay can reject even when the stream is fine; the frame callback still fires.
  }
  schedule()

  return {
    stop: async () => {
      if (stopped) return
      stopped = true
      cancel()
      release()
    },
  }
}
