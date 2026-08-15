/**
 * Diagnostics for the receiver's optical channel. Pure: the caller supplies every timestamp, so
 * the numbers are reproducible in tests without a camera, a clock or a DOM.
 *
 * What can and cannot be measured, given how `html5-qrcode` works:
 *
 * - There is no "capture attempted" hook. With `disableFlip: true` (see `buildScanConfig`) exactly
 *   one callback — success or error — runs per capture tick, so `attempts = decodes + failures` is
 *   exact. Without that flag a failed tick fires the error callback twice and these counts would
 *   be meaningless.
 * - The decode itself cannot be timed from outside. The interval between consecutive callbacks
 *   can, and it equals `decodeDuration + 1000 / fps`, so subtracting the known scheduling delay
 *   gives a usable estimate of how long decoding actually takes.
 * - "Frames missing per loop pass" is not computable: the receiver never learns the sender's frame
 *   duration. Sightings per frame index answer the same diagnostic question — if the same frames
 *   are always the ones going missing, their sighting counts stay at zero while their neighbours
 *   climb.
 */

/** What the collector did with a frame that decoded successfully. */
export type DecodeOutcome = 'accepted' | 'duplicate' | 'ignored'

/**
 * Upper bound on retained timeline rows. At one sample every 500 ms this is about five minutes,
 * far longer than any transfer, and it stops a scanner left running from growing without limit.
 */
const MAX_TIMELINE = 600

/** One periodic sample, for seeing whether the decode rate holds up or degrades over time. */
export interface ScanTimelineRow {
  atMs: number
  attempts: number
  decodes: number
  accepted: number
}

export interface ScanStatsSnapshot {
  elapsedMs: number
  /** Capture ticks: every one produced either a decode or a failure. */
  attempts: number
  decodes: number
  failures: number
  accepted: number
  duplicates: number
  ignored: number
  attemptsPerSecond: number
  decodesPerSecond: number
  /** Share of capture ticks that produced a readable frame, 0–1. */
  decodeRate: number
  /** Mean wall-clock gap between capture ticks. */
  meanTickMs: number
  /** Mean tick minus the scheduling delay the library adds: roughly the decode cost. */
  estimatedDecodeMs: number
  /** Negotiated capture resolution, once the camera has started. */
  resolution: { width: number; height: number } | null
  /** Times each frame index was read, including duplicates. Sorted by index. */
  sightings: { index: number; count: number }[]
  /** Frames in the transfer including the header, once the header has been read. */
  totalFrames: number | null
  /** Time from the first capture to a fully assembled transfer — the headline measurement. */
  completedAtMs: number | null
  timeline: ScanTimelineRow[]
}

export class ScanStats {
  private startedAt: number
  private lastAt: number
  private lastEventAt: number | null = null
  private tickCount = 0
  private tickTotalMs = 0
  private decodes = 0
  private failures = 0
  private accepted = 0
  private duplicates = 0
  private ignored = 0
  private resolution: { width: number; height: number } | null = null
  private sightings = new Map<number, number>()
  private totalFrames: number | null = null
  private completedAt: number | null = null
  private timeline: ScanTimelineRow[] = []

  /** @param scanFps the `fps` handed to the scanner, used to back out the scheduling delay. */
  constructor(
    now: number,
    private readonly scanFps: number,
  ) {
    this.startedAt = now
    this.lastAt = now
  }

  /** A capture tick that found no readable code. */
  recordFailure(now: number): void {
    this.failures += 1
    this.tick(now)
  }

  /** A capture tick that decoded a frame, with what the collector decided to do with it. */
  recordDecode(now: number, index: number, outcome: DecodeOutcome): void {
    this.decodes += 1
    if (outcome === 'accepted') this.accepted += 1
    else if (outcome === 'duplicate') this.duplicates += 1
    else this.ignored += 1
    this.sightings.set(index, (this.sightings.get(index) ?? 0) + 1)
    this.tick(now)
  }

  /** The resolution the browser actually negotiated, read once the camera is running. */
  recordResolution(width: number, height: number): void {
    this.resolution = { width, height }
  }

  /** Frames in the transfer, known once the first frame of any kind has been read. */
  recordTotalFrames(total: number): void {
    if (total > 0) this.totalFrames = total
  }

  /** The transfer assembled successfully. Stops the clock for the headline measurement. */
  recordComplete(now: number): void {
    if (this.completedAt === null) this.completedAt = Math.max(0, now - this.startedAt)
  }

  /**
   * Takes a periodic sample. Called on a timer by the overlay rather than on the scan path, so
   * sampling can never slow down the decoding it is measuring.
   */
  sample(now: number): void {
    if (this.timeline.length >= MAX_TIMELINE) return
    this.timeline.push({
      atMs: Math.max(0, now - this.startedAt),
      attempts: this.decodes + this.failures,
      decodes: this.decodes,
      accepted: this.accepted,
    })
  }

  private tick(now: number): void {
    this.lastAt = now
    if (this.lastEventAt !== null && now >= this.lastEventAt) {
      this.tickCount += 1
      this.tickTotalMs += now - this.lastEventAt
    }
    this.lastEventAt = now
  }

  snapshot(): ScanStatsSnapshot {
    const attempts = this.decodes + this.failures
    const elapsedMs = Math.max(0, this.lastAt - this.startedAt)
    const perSecond = (count: number) => (elapsedMs === 0 ? 0 : (count * 1000) / elapsedMs)
    const meanTickMs = this.tickCount === 0 ? 0 : this.tickTotalMs / this.tickCount
    const schedulingMs = this.scanFps > 0 ? 1000 / this.scanFps : 0
    return {
      elapsedMs,
      attempts,
      decodes: this.decodes,
      failures: this.failures,
      accepted: this.accepted,
      duplicates: this.duplicates,
      ignored: this.ignored,
      attemptsPerSecond: perSecond(attempts),
      decodesPerSecond: perSecond(this.decodes),
      decodeRate: attempts === 0 ? 0 : this.decodes / attempts,
      meanTickMs,
      estimatedDecodeMs: meanTickMs === 0 ? 0 : Math.max(0, meanTickMs - schedulingMs),
      resolution: this.resolution,
      sightings: [...this.sightings]
        .map(([index, count]) => ({ index, count }))
        .sort((a, b) => a.index - b.index),
      totalFrames: this.totalFrames,
      completedAtMs: this.completedAt,
      timeline: [...this.timeline],
    }
  }
}

/**
 * Renders a snapshot as plain text for the clipboard. Reading numbers off a phone screen while
 * holding it steady enough to scan is not possible — the first measurement taken this way was
 * contaminated by the hand movement it required — so the run is copied out and read afterwards.
 */
export function formatScanReport(snapshot: ScanStatsSnapshot): string {
  const { resolution: res } = snapshot
  const lines = [
    '# QR Transfer scan report',
    `elapsed        ${fmtMs(snapshot.elapsedMs)}`,
    `completed      ${snapshot.completedAtMs === null ? 'no' : fmtMs(snapshot.completedAtMs)}`,
    `frames         ${snapshot.totalFrames ?? '?'}`,
    `video          ${res === null ? 'unknown' : `${res.width}x${res.height}`}`,
    '',
    `captures/s     ${snapshot.attemptsPerSecond.toFixed(2)}`,
    `decodes/s      ${snapshot.decodesPerSecond.toFixed(2)}`,
    `decode rate    ${(snapshot.decodeRate * 100).toFixed(1)}%`,
    `tick           ${snapshot.meanTickMs.toFixed(0)} ms (~${snapshot.estimatedDecodeMs.toFixed(0)} decode)`,
    '',
    `attempts       ${snapshot.attempts}`,
    `decodes        ${snapshot.decodes}`,
    `accepted       ${snapshot.accepted}`,
    `duplicates     ${snapshot.duplicates}`,
    `ignored        ${snapshot.ignored}`,
    '',
    `sightings      ${snapshot.sightings.map((s) => `${s.index}:${s.count}`).join(' ')}`,
  ]
  if (snapshot.timeline.length > 0) {
    lines.push('', 'timeline (ms, attempts, decodes, accepted)')
    for (const row of snapshot.timeline) {
      lines.push(`  ${row.atMs} ${row.attempts} ${row.decodes} ${row.accepted}`)
    }
  }
  return lines.join('\n')
}

function fmtMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`
}
