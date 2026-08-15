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
