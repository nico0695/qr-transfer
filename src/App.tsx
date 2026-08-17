import { LazyMotion } from 'motion/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { AppHeader, type AppMode, type AppRole } from './components/app/AppHeader'
import { AppShell } from './components/app/AppShell'
import { ContextLabel } from './components/app/ContextLabel'
import { type PaneView } from './components/app/MobileViewSwitcher'
import { QRGenerator } from './components/QRGenerator'
import { LangContext, messages } from './i18n'
import { PRIMITIVES_DEMO_ENABLED } from './lib/demo'
import { usePreferences } from './store/preferences'
import styles from './App.module.css'

// html5-qrcode is heavy, so the scanner is only loaded when Scan QR is opened.
const QRScanner = lazy(() => import('./components/QRScanner'))
// Large Transfer pulls in CodeMirror and the scanner; loaded only when that section is opened.
const LargeTransfer = lazy(() => import('./components/large-transfer/LargeTransfer'))
// Dev-only primitives review page (?demo=primitives) — never part of the app's own navigation.
const PrimitivesDemo = lazy(() => import('./components/demo/PrimitivesDemo'))

const QUICK_QR_CHAR_LIMIT = 2000

// Split into its own chunk — the tween/easing runtime isn't needed to parse the entry bundle.
const loadMotionFeatures = () => import('motion/react').then((res) => res.domAnimation)

export default function App() {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      {PRIMITIVES_DEMO_ENABLED ? (
        <Suspense fallback={null}>
          <PrimitivesDemo />
        </Suspense>
      ) : (
        <QrTransferApp />
      )}
    </LazyMotion>
  )
}

function QrTransferApp() {
  const [mode, setMode] = useState<AppMode>('quick')
  const [role, setRole] = useState<AppRole>('send')
  const [view, setView] = useState<PaneView>('compose')

  const handleModeChange = (next: AppMode) => {
    setMode(next)
    setView(role === 'receive' ? 'stage' : 'compose')
  }

  const handleRoleChange = (next: AppRole) => {
    setRole(next)
    setView(next === 'receive' ? 'stage' : 'compose')
  }

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

  const compose =
    mode === 'quick' ? (
      role === 'send' ? (
        <QRGenerator onShowStage={() => setView('stage')} />
      ) : (
        <Suspense fallback={<p className={styles.hint}>{t.loadingScanner}</p>}>
          <QRScanner />
        </Suspense>
      )
    ) : (
      <Suspense fallback={<p className={styles.hint}>{t.loadingLargeTransfer}</p>}>
        <LargeTransfer direction={role} />
      </Suspense>
    )

  return (
    <LangContext value={t}>
      <AppShell
        header={
          <AppHeader
            mode={mode}
            onModeChange={handleModeChange}
            role={role}
            onRoleChange={handleRoleChange}
            roleGroupLabel={t.roleGroupLabel}
            theme={theme}
            onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            onLangToggle={() => setLang(lang === 'es' ? 'en' : 'es')}
            modeLabels={{ quick: t.navQuick, large: t.navLarge }}
            roleLabels={{ send: t.roleSend, receive: t.roleReceive }}
            themeLabels={{ switchToDark: t.switchToDark, switchToLight: t.switchToLight }}
            langLabel={lang === 'es' ? 'EN' : 'ES'}
          />
        }
        view={view}
        onViewChange={setView}
        composeLabel={role === 'receive' ? t.viewResult : t.viewCompose}
        stageLabel={role === 'receive' ? t.viewCamera : t.viewStage}
        viewGroupLabel={t.viewGroupLabel}
        compose={
          <>
            <ContextLabel
              mode={mode === 'quick' ? t.ctxQuick : t.ctxLarge}
              role={role === 'send' ? t.roleSend : t.roleReceive}
              constraint={
                mode === 'quick' && role === 'send' ? t.limitChars(QUICK_QR_CHAR_LIMIT) : undefined
              }
            />
            {compose}
          </>
        }
      />
    </LangContext>
  )
}
