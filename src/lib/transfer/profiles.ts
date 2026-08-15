/**
 * Transfer profiles: the only knobs exposed to users. Each preset fixes the technical parameters
 * (chunk size, error correction, frame duration); the UI never shows those numbers directly.
 *
 * Measured with `qrcode` (byte mode) for a v2 data frame (~26-char header + Base64URL payload),
 * and verified end-to-end by decoding the rendered PNGs with `html5-qrcode`:
 *   reliable  400 B @ Q → QR version 22 (105 modules)  larger modules, 25% recovery
 *   balanced  750 B @ M → QR version 26 (121 modules)  same density as the original v1 default
 *   fast     1000 B @ L → QR version 26 (121 modules)  same density, more data per frame
 */
import { FRAME_MS_PRESETS } from './config'

export type TransferProfileId = 'reliable' | 'balanced' | 'fast'

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export interface TransferProfile {
  id: TransferProfileId
  /** Milliseconds per frame in the animated loop. Must be one of FRAME_MS_PRESETS. */
  frameMs: (typeof FRAME_MS_PRESETS)[number]
  /** Payload bytes per data frame (before Base64URL encoding). */
  chunkSize: number
  errorCorrection: ErrorCorrectionLevel
}

export const TRANSFER_PROFILES: Record<TransferProfileId, TransferProfile> = {
  reliable: { id: 'reliable', frameMs: 400, chunkSize: 400, errorCorrection: 'Q' },
  balanced: { id: 'balanced', frameMs: 300, chunkSize: 750, errorCorrection: 'M' },
  fast: { id: 'fast', frameMs: 200, chunkSize: 1000, errorCorrection: 'L' },
}

export const PROFILE_IDS: readonly TransferProfileId[] = ['balanced', 'reliable', 'fast']

export const DEFAULT_PROFILE_ID: TransferProfileId = 'balanced'

/** User-facing settings: a preset plus (at most) a frame-speed override. */
export interface TransferSettings {
  profile: TransferProfileId
  frameMs?: number
}

export const DEFAULT_SETTINGS: TransferSettings = { profile: DEFAULT_PROFILE_ID }

/** Fully resolved technical parameters for a settings object. */
export interface ResolvedSettings {
  profile: TransferProfile
  frameMs: number
  chunkSize: number
  errorCorrection: ErrorCorrectionLevel
}

export function isProfileId(value: unknown): value is TransferProfileId {
  return typeof value === 'string' && value in TRANSFER_PROFILES
}

export function isFrameMsPreset(value: unknown): value is (typeof FRAME_MS_PRESETS)[number] {
  return typeof value === 'number' && (FRAME_MS_PRESETS as readonly number[]).includes(value)
}

export function resolveSettings(settings: TransferSettings): ResolvedSettings {
  const profile = TRANSFER_PROFILES[settings.profile] ?? TRANSFER_PROFILES[DEFAULT_PROFILE_ID]
  const frameMs = isFrameMsPreset(settings.frameMs) ? settings.frameMs : profile.frameMs
  return {
    profile,
    frameMs,
    chunkSize: profile.chunkSize,
    errorCorrection: profile.errorCorrection,
  }
}
