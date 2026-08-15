import { describe, expect, it } from 'vitest'
import { FRAME_MS_PRESETS } from './config'
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

  it('validates ids and presets', () => {
    expect(isProfileId('balanced')).toBe(true)
    expect(isProfileId('turbo')).toBe(false)
    expect(isProfileId(3)).toBe(false)
    expect(isFrameMsPreset(300)).toBe(true)
    expect(isFrameMsPreset(301)).toBe(false)
  })
})
