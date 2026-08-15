import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import { FRAME_MS_PRESETS, MAX_QR_VERSION } from './config'
import { PROTOCOL_VERSION, encodeFrame } from './protocol'
import {
  DEFAULT_PROFILE_ID,
  DEFAULT_SETTINGS,
  PROFILE_IDS,
  TRANSFER_PROFILES,
  isFrameMsPreset,
  isProfileId,
  resolveSettings,
} from './profiles'

describe('profiles', () => {
  it('defaults to balanced', () => {
    expect(DEFAULT_PROFILE_ID).toBe('balanced')
    expect(resolveSettings(DEFAULT_SETTINGS).profile.id).toBe('balanced')
  })

  it('lists every profile once and uses preset frame speeds', () => {
    expect([...PROFILE_IDS].sort()).toEqual(Object.keys(TRANSFER_PROFILES).sort())
    for (const profile of Object.values(TRANSFER_PROFILES)) {
      expect(FRAME_MS_PRESETS).toContain(profile.frameMs)
      expect(profile.chunkSize).toBeGreaterThan(0)
    }
  })

  it('orders profiles by data rate', () => {
    const rate = (id: keyof typeof TRANSFER_PROFILES) =>
      TRANSFER_PROFILES[id].chunkSize / TRANSFER_PROFILES[id].frameMs
    expect(rate('reliable')).toBeLessThan(rate('balanced'))
    expect(rate('balanced')).toBeLessThan(rate('fast'))
  })

  it('applies a frame speed override only when it is a preset', () => {
    expect(resolveSettings({ profile: 'fast' }).frameMs).toBe(TRANSFER_PROFILES.fast.frameMs)
    expect(resolveSettings({ profile: 'fast', frameMs: 500 }).frameMs).toBe(500)
    expect(resolveSettings({ profile: 'fast', frameMs: 123 }).frameMs).toBe(
      TRANSFER_PROFILES.fast.frameMs,
    )
    expect(resolveSettings({ profile: 'reliable' }).chunkSize).toBe(
      TRANSFER_PROFILES.reliable.chunkSize,
    )
  })

  it('keeps every profile under its QR density ceiling', () => {
    // Symbol density is what decides whether a frame decodes at all: fewer modules means more
    // camera pixels per module. Deriving the version here, instead of only documenting it in a
    // comment, is what stops a future chunk-size tweak from silently pushing a profile back into
    // the density range that made fast transfers unreadable.
    //
    // The payload must be realistic: Base64URL is mixed-case, so QR is forced into byte mode. A
    // single-character stand-in would qualify for the denser alphanumeric mode and under-report
    // the version by several steps.
    for (const profile of Object.values(TRANSFER_PROFILES)) {
      const symbol = QRCode.create(worstCaseDataFrame(profile.chunkSize), {
        errorCorrectionLevel: profile.errorCorrection,
      })
      expect(symbol.version).toBeLessThanOrEqual(MAX_QR_VERSION[profile.id])
      expect(symbol.modules.size).toBe(symbol.version * 4 + 17)
    }
  })

  it('never pairs a profile with the weakest error correction', () => {
    // L recovers 7% and belongs with nothing; fast used to combine it with the densest symbol.
    for (const profile of Object.values(TRANSFER_PROFILES)) {
      expect(profile.errorCorrection).not.toBe('L')
    }
  })

  it('validates ids and presets', () => {
    expect(isProfileId('balanced')).toBe(true)
    expect(isProfileId('turbo')).toBe(false)
    expect(isProfileId(3)).toBe(false)
    expect(isFrameMsPreset(300)).toBe(true)
    expect(isFrameMsPreset(301)).toBe(false)
  })
})

/**
 * The largest data frame a profile can emit: a full chunk, with a four-digit index and total so
 * the decimal fields are at their worst case too. Built through `encodeFrame` rather than by hand
 * so it cannot drift away from the real wire format.
 */
function worstCaseDataFrame(chunkSize: number): string {
  return encodeFrame({
    kind: 'data',
    version: PROTOCOL_VERSION,
    transferId: 'abcdefgh',
    index: 9998,
    total: 9999,
    payload: new Uint8Array(chunkSize).fill(0xff),
  })
}
