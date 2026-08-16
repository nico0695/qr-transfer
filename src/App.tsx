import { lazy, Suspense, useEffect, useState } from 'react'
import { ModeTabs, type Mode } from './components/ModeTabs'
import { NavMenu, type Section } from './components/NavMenu'
import { QRGenerator } from './components/QRGenerator'
import { LangContext, messages } from './i18n'
import { PRIMITIVES_DEMO_ENABLED } from './lib/demo'
import { usePreferences } from './store/preferences'

// html5-qrcode is heavy, so the scanner is only loaded when Scan QR is opened.
const QRScanner = lazy(() => import('./components/QRScanner'))
// Large Transfer pulls in CodeMirror and the scanner; loaded only when that section is opened.
const LargeTransfer = lazy(() => import('./components/large-transfer/LargeTransfer'))
// Dev-only primitives review page (?demo=primitives) — never part of the app's own navigation.
const PrimitivesDemo = lazy(() => import('./components/demo/PrimitivesDemo'))

export default function App() {
  if (PRIMITIVES_DEMO_ENABLED) {
    return (
      <Suspense fallback={null}>
        <PrimitivesDemo />
      </Suspense>
    )
  }

  return <QrTransferApp />
}

function QrTransferApp() {
  const [section, setSection] = useState<Section>('quick')
  const [mode, setMode] = useState<Mode>('generate')
  const theme = usePreferences((s) => s.theme)
  const setTheme = usePreferences((s) => s.setTheme)
  const lang = usePreferences((s) => s.lang)
  const setLang = usePreferences((s) => s.setLang)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = messages[lang]

  return (
    <LangContext value={t}>
      <main className="app">
        <header className="header">
          <div>
            <h1>QR Transfer</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="button button-small"
              aria-label={theme === 'light' ? t.switchToDark : t.switchToLight}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              type="button"
              className="button button-small"
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
          </div>
        </header>
        <NavMenu section={section} onChange={setSection} />
        {section === 'quick' ? (
          <>
            <ModeTabs mode={mode} onChange={setMode} />
            {mode === 'generate' ? (
              <QRGenerator />
            ) : (
              <Suspense fallback={<p className="hint">{t.loadingScanner}</p>}>
                <QRScanner />
              </Suspense>
            )}
          </>
        ) : (
          <Suspense fallback={<p className="hint">{t.loadingLargeTransfer}</p>}>
            <LargeTransfer />
          </Suspense>
        )}
      </main>
    </LangContext>
  )
}
