import { describe, expect, it } from 'vitest'
import { SCAN_FIELDS, ScanStats, formatScanReport } from './scanStats'

const FPS = 25

describe('ScanStats', () => {
  it('reports zeroes without dividing by zero before anything is scanned', () => {
    const snapshot = new ScanStats(1000, FPS).snapshot()
    expect(snapshot.attempts).toBe(0)
    expect(snapshot.decodeRate).toBe(0)
    expect(snapshot.attemptsPerSecond).toBe(0)
    expect(snapshot.decodesPerSecond).toBe(0)
    expect(snapshot.meanTickMs).toBe(0)
    expect(snapshot.resolution).toBeNull()
    expect(snapshot.sightings).toEqual([])
    expect(Number.isNaN(snapshot.decodeRate)).toBe(false)
  })

  it('counts every capture tick as either a decode or a failure', () => {
    const stats = new ScanStats(0, FPS)
    stats.recordFailure(100)
    stats.recordFailure(200)
    stats.recordDecode(300, 1, 'accepted')
    stats.recordFailure(400)

    const snapshot = stats.snapshot()
    expect(snapshot.attempts).toBe(4)
    expect(snapshot.decodes).toBe(1)
    expect(snapshot.failures).toBe(3)
    expect(snapshot.decodeRate).toBeCloseTo(0.25)
  })

  it('separates accepted frames from duplicates and ignored ones', () => {
    const stats = new ScanStats(0, FPS)
    stats.recordDecode(100, 1, 'accepted')
    stats.recordDecode(200, 1, 'duplicate')
    stats.recordDecode(300, 1, 'duplicate')
    stats.recordDecode(400, 9, 'ignored')

    const snapshot = stats.snapshot()
    expect(snapshot.decodes).toBe(4)
    expect(snapshot.accepted).toBe(1)
    expect(snapshot.duplicates).toBe(2)
    expect(snapshot.ignored).toBe(1)
  })

  it('derives rates from the elapsed window', () => {
    const stats = new ScanStats(0, FPS)
    for (let at = 100; at <= 1000; at += 100) stats.recordFailure(at)
    stats.recordDecode(2000, 3, 'accepted')

    const snapshot = stats.snapshot()
    expect(snapshot.elapsedMs).toBe(2000)
    expect(snapshot.attemptsPerSecond).toBeCloseTo(5.5)
    expect(snapshot.decodesPerSecond).toBeCloseTo(0.5)
  })

  it('estimates decode cost by removing the scheduling delay from the tick period', () => {
    // The library chains setTimeout(1000/fps) *after* each decode, so the observed gap is
    // decode + 40 ms at 25 fps.
    const stats = new ScanStats(0, FPS)
    stats.recordFailure(0)
    stats.recordFailure(140)
    stats.recordFailure(280)

    const snapshot = stats.snapshot()
    expect(snapshot.meanTickMs).toBeCloseTo(140)
    expect(snapshot.estimatedDecodeMs).toBeCloseTo(100)
  })

  it('never reports a negative decode estimate', () => {
    const stats = new ScanStats(0, FPS)
    stats.recordFailure(0)
    stats.recordFailure(5)
    expect(stats.snapshot().estimatedDecodeMs).toBe(0)
  })

  it('counts sightings per frame index, in order', () => {
    // This is what distinguishes random capture loss from frames that are systematically missed:
    // an index that never decodes simply never appears here.
    const stats = new ScanStats(0, FPS)
    stats.recordDecode(100, 3, 'accepted')
    stats.recordDecode(200, 1, 'accepted')
    stats.recordDecode(300, 3, 'duplicate')
    stats.recordDecode(400, 3, 'duplicate')

    expect(stats.snapshot().sightings).toEqual([
      { index: 1, count: 1 },
      { index: 3, count: 3 },
    ])
  })

  it('keeps the negotiated resolution once the camera reports it', () => {
    const stats = new ScanStats(0, FPS)
    expect(stats.snapshot().resolution).toBeNull()
    stats.recordResolution(1920, 1080)
    expect(stats.snapshot().resolution).toEqual({ width: 1920, height: 1080 })
  })

  it('records the total frame count and the time to completion', () => {
    const stats = new ScanStats(1000, FPS)
    expect(stats.snapshot().totalFrames).toBeNull()
    expect(stats.snapshot().completedAtMs).toBeNull()

    stats.recordTotalFrames(9)
    stats.recordComplete(13500)

    const snapshot = stats.snapshot()
    expect(snapshot.totalFrames).toBe(9)
    // Measured from the first capture, not from an absolute clock.
    expect(snapshot.completedAtMs).toBe(12500)
  })

  it('ignores a nonsensical frame total and a second completion', () => {
    const stats = new ScanStats(0, FPS)
    stats.recordTotalFrames(0)
    expect(stats.snapshot().totalFrames).toBeNull()
    stats.recordComplete(500)
    stats.recordComplete(9000)
    expect(stats.snapshot().completedAtMs).toBe(500)
  })

  it('samples a timeline relative to the start', () => {
    const stats = new ScanStats(2000, FPS)
    stats.recordDecode(2100, 0, 'accepted')
    stats.sample(2500)
    stats.recordFailure(2600)
    stats.sample(3000)

    expect(stats.snapshot().timeline).toEqual([
      { atMs: 500, attempts: 1, decodes: 1, accepted: 1 },
      { atMs: 1000, attempts: 2, decodes: 1, accepted: 1 },
    ])
  })

  it('caps the timeline so a scanner left running cannot grow without limit', () => {
    const stats = new ScanStats(0, FPS)
    for (let i = 0; i < 900; i++) stats.sample(i * 500)
    expect(stats.snapshot().timeline).toHaveLength(600)
  })

  it('hands out a copy of the timeline, not the live array', () => {
    const stats = new ScanStats(0, FPS)
    stats.sample(500)
    const snapshot = stats.snapshot()
    stats.sample(1000)
    expect(snapshot.timeline).toHaveLength(1)
  })
})

describe('formatScanReport', () => {
  it('includes the headline measurements and the timeline', () => {
    const stats = new ScanStats(0, FPS)
    stats.recordTotalFrames(9)
    stats.recordResolution(1080, 1920)
    stats.recordDecode(100, 0, 'accepted')
    stats.recordDecode(240, 0, 'duplicate')
    stats.recordFailure(380)
    stats.sample(500)
    stats.recordComplete(4200)

    const report = formatScanReport(stats.snapshot())
    expect(report).toContain('video          1080x1920')
    expect(report).toContain('frames         9')
    expect(report).toContain('completed      4.2 s')
    expect(report).toContain('duplicates     1')
    expect(report).toContain('sightings      0:2')
    expect(report).toContain('timeline (ms, attempts, decodes, accepted)')
    expect(report).toContain('  500 3 2 1')
  })

  it('renders an unfinished run without placeholders leaking as NaN', () => {
    const report = formatScanReport(new ScanStats(0, FPS).snapshot())
    expect(report).toContain('completed      no')
    expect(report).toContain('frames         ?')
    expect(report).toContain('video          unknown')
    expect(report).not.toContain('NaN')
    expect(report).not.toContain('undefined')
  })
})

describe('SCAN_FIELDS', () => {
  it('is the single source the report is built from', () => {
    // The overlay renders this same list, so a field added here shows up in both places at once.
    // Keeping two hand-written lists in sync is what let them drift apart before.
    const report = formatScanReport(new ScanStats(0, FPS).snapshot())
    for (const field of SCAN_FIELDS) {
      expect(report).toContain(field.label)
    }
  })

  it('renders every field as a string, even with nothing scanned', () => {
    const snapshot = new ScanStats(0, FPS).snapshot()
    for (const field of SCAN_FIELDS) {
      const value = field.render(snapshot)
      expect(typeof value).toBe('string')
      expect(value).not.toContain('NaN')
      expect(value).not.toContain('undefined')
    }
  })

  it('uses labels that are unique, since they key the rendered rows', () => {
    const labels = SCAN_FIELDS.map((field) => field.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
