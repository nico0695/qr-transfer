import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The store reads `window.matchMedia`/`window.navigator.language`/`window.localStorage` at
 * module-load time (inside the `create()` initializer), and this suite runs in Vitest's default
 * `node` environment (no jsdom) — so every test stubs those globals, then re-imports the module
 * fresh via `vi.resetModules()` to re-run that initializer under the new conditions.
 */
function fakeLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size
    },
    key: () => null,
    raw: store,
  }
}

function stubBrowserGlobals(options: {
  localStorage?: ReturnType<typeof fakeLocalStorage>
  prefersDark?: boolean
  language?: string
}) {
  const localStorage = options.localStorage ?? fakeLocalStorage()
  vi.stubGlobal('localStorage', localStorage)
  vi.stubGlobal('window', {
    localStorage,
    matchMedia: (query: string) => ({
      matches: query.includes('dark') ? (options.prefersDark ?? false) : false,
    }),
    navigator: { language: options.language ?? 'en-US' },
  })
  return localStorage
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
})

describe('usePreferences', () => {
  it('persists exactly {state:{theme,lang,profile},version:1}', async () => {
    const storage = stubBrowserGlobals({ prefersDark: true, language: 'en-US' })
    const { usePreferences } = await import('./preferences')

    usePreferences.getState().setTheme('light')

    const raw = storage.raw.get('qr-transfer:prefs')
    expect(raw).toBeDefined()
    expect(JSON.parse(raw!)).toEqual({
      state: { theme: 'light', lang: 'en', profile: 'balanced' },
      version: 1,
    })
  })

  it('falls back to prefers-color-scheme and navigator.language when nothing is stored', async () => {
    stubBrowserGlobals({ prefersDark: true, language: 'es-AR' })
    const { usePreferences } = await import('./preferences')

    expect(usePreferences.getState().theme).toBe('dark')
    expect(usePreferences.getState().lang).toBe('es')
  })

  it('migrates the legacy settingsStorage profile key once, then removes it', async () => {
    const storage = stubBrowserGlobals({
      localStorage: fakeLocalStorage({ 'qr-transfer.preferred-profile': 'fast' }),
    })
    const { usePreferences } = await import('./preferences')

    expect(usePreferences.getState().profile).toBe('fast')
    expect(storage.raw.has('qr-transfer.preferred-profile')).toBe(false)
  })

  it('ignores a corrupt legacy value and falls back to the default profile', async () => {
    stubBrowserGlobals({
      localStorage: fakeLocalStorage({ 'qr-transfer.preferred-profile': 'not-a-profile' }),
    })
    const { usePreferences } = await import('./preferences')

    expect(usePreferences.getState().profile).toBe('balanced')
  })

  it('never stores anything beyond theme, lang and profile', async () => {
    const storage = stubBrowserGlobals({})
    const { usePreferences } = await import('./preferences')

    usePreferences.getState().setProfile('reliable')

    const persisted = JSON.parse(storage.raw.get('qr-transfer:prefs')!)
    expect(Object.keys(persisted.state).sort()).toEqual(['lang', 'profile', 'theme'])
  })
})
