/**
 * Transfer profiles: the only knobs exposed to users. Each preset fixes the technical parameters
 * (chunk size, error correction, frame duration); the UI never shows those numbers directly.
 *
 * Symbol density decides whether a frame decodes at all: fewer modules means more camera pixels
 * per module. Reliable is the profile users report as working, so its 105-module symbol is the
 * known-good reference the other two are pulled back towards. Chunk sizes are the largest that
 * still fit under each profile's ceiling in `MAX_QR_VERSION`, measured with `qrcode` in byte mode
 * (Base64URL payloads are mixed-case, so QR cannot use its denser alphanumeric mode) over a
 * worst-case data frame. `profiles.test.ts` derives and asserts these, so they cannot drift:
 *   reliable  400 B @ Q → QR version 22 (105 modules)  25% recovery
 *   balanced  550 B @ M → QR version 22 (105 modules)  15% recovery
 *   fast      600 B @ M → QR version 23 (109 modules)  15% recovery
 *
 * Previously balanced (750 B @ M) and fast (1000 B @ L) both rendered 121-module symbols, and fast
 * paired that densest symbol with the weakest error correction — the worst possible combination
 * for a noisy optical channel. Speed, not density, is now what separates the three profiles.
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
  balanced: { id: 'balanced', frameMs: 300, chunkSize: 550, errorCorrection: 'M' },
  fast: { id: 'fast', frameMs: 200, chunkSize: 600, errorCorrection: 'M' },
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
