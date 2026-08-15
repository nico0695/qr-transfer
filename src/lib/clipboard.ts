/**
 * Copies text, falling back to a hidden textarea when the async Clipboard API is unavailable.
 *
 * `navigator.clipboard` only exists in a secure context, so it is missing over plain HTTP on a LAN
 * address — exactly the setup used to test a transfer between two devices. The legacy
 * `execCommand('copy')` path still works there.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Blocked or unavailable; try the legacy path below.
  }
  return copyWithTextarea(text)
}

function copyWithTextarea(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  // Kept in the layout but out of sight: `display: none` would make it unselectable.
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  document.body.appendChild(textarea)
  try {
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}
