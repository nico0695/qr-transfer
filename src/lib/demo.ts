/**
 * Dev-only primitives review page, read once from the URL (`?demo=primitives`).
 *
 * Same pattern as `DEBUG_ENABLED` in `src/lib/debug.ts`: not persisted, not shown in the UI, not
 * translated — unreachable without typing the parameter.
 */
export const PRIMITIVES_DEMO_ENABLED = readDemoFlag()

function readDemoFlag(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('demo') === 'primitives'
  } catch {
    return false
  }
}
