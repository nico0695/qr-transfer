import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../i18n'
import { DEFAULT_PROFILE_ID, isProfileId, type TransferProfileId } from '../lib/transfer/profiles'

/**
 * The only thing this app persists: theme, language, and the preferred transfer profile. Never
 * content, never files, never received data. Stored under `qr-transfer:prefs` as
 * `{ state: { theme, lang, profile }, version: 1 }` (zustand's `persist` shape) — never add a
 * field here for anything else.
 */
export interface Preferences {
  theme: 'dark' | 'light'
  lang: Lang
  profile: TransferProfileId
  setTheme: (theme: 'dark' | 'light') => void
  setLang: (lang: Lang) => void
  setProfile: (profile: TransferProfileId) => void
}

const LEGACY_PROFILE_KEY = 'qr-transfer.preferred-profile'

function detectTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function detectLang(): Lang {
  return window.navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

/**
 * Initial profile when nothing is stored yet under the new key (persist's rehydration overrides
 * this once it exists). Along the way, reads the pre-store profile key once and removes it —
 * there is nothing left to migrate after.
 */
function resolveInitialProfile(): TransferProfileId {
  try {
    const legacy = window.localStorage.getItem(LEGACY_PROFILE_KEY)
    window.localStorage.removeItem(LEGACY_PROFILE_KEY)
    return isProfileId(legacy) ? legacy : DEFAULT_PROFILE_ID
  } catch {
    return DEFAULT_PROFILE_ID
  }
}

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      theme: detectTheme(),
      lang: detectLang(),
      profile: resolveInitialProfile(),
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      setProfile: (profile) => set({ profile }),
    }),
    {
      name: 'qr-transfer:prefs',
      version: 1,
      partialize: ({ theme, lang, profile }) => ({ theme, lang, profile }),
    },
  ),
)
