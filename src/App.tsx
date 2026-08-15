import { lazy, Suspense, useEffect, useState } from 'react'
import { ModeTabs, type Mode } from './components/ModeTabs'
import { NavMenu, type Section } from './components/NavMenu'
import { QRGenerator } from './components/QRGenerator'
import { detectLang, LangContext, messages, type Lang } from './i18n'

// html5-qrcode is heavy, so the scanner is only loaded when Scan QR is opened.
const QRScanner = lazy(() => import('./components/QRScanner'))
// Large Transfer pulls in CodeMirror and the scanner; loaded only when that section is opened.
const LargeTransfer = lazy(() => import('./components/large-transfer/LargeTransfer'))

type Theme = 'light' | 'dark'

function detectTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [section, setSection] = useState<Section>('quick')
  const [mode, setMode] = useState<Mode>('generate')
  const [theme, setTheme] = useState<Theme>(detectTheme)
  const [lang, setLang] = useState<Lang>(detectLang)

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
