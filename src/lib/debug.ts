/**
 * Diagnostics switch for the transfer scanner, read once from the URL (`?debug=1`).
 *
 * Deliberately not a setting: it is not persisted, not shown in the UI and not translated. It
 * exists to measure the optical channel while tuning it, and it is unreachable without typing the
 * parameter, so nothing about it reaches ordinary users.
 */
export const DEBUG_ENABLED = readDebugFlag()

function readDebugFlag(): boolean {
  try {
    const value = new URLSearchParams(window.location.search).get('debug')
    return value !== null && value !== '0' && value !== 'false'
  } catch {
    return false
  }
}

/**
 * Forces the previous scanner (`?scanner=legacy`), so both engines can be compared on the same
 * phone at the same distance. Without it a before/after would mean comparing two sessions with
 * different framing, which is what made the first measurement of this iteration useless.
 */
export const FORCE_LEGACY_SCANNER = readParam('scanner') === 'legacy'

function readParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name)
  } catch {
    return null
  }
}
