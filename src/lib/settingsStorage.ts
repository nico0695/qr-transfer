/**
 * The only thing this app persists: the preferred transfer profile. Never content, never files,
 * never received data. Failures (private mode, quota, disabled storage) are silently ignored.
 */
import { isProfileId, type TransferProfileId } from './transfer/profiles'

const KEY = 'qr-transfer.preferred-profile'

export function loadPreferredProfile(): TransferProfileId | null {
  try {
    const value = window.localStorage.getItem(KEY)
    return isProfileId(value) ? value : null
  } catch {
    return null
  }
}

export function savePreferredProfile(profile: TransferProfileId): void {
  try {
    window.localStorage.setItem(KEY, profile)
  } catch {
    // Storage unavailable: settings simply last for the session.
  }
}
