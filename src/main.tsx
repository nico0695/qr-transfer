import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyAccent } from './lib/theme/accent'
import './styles/preloadFonts'
import './styles/index.css'

// Only one accent exists today (piedra, fixed — DESIGN_SYSTEM.md §3), so this runs once at
// bootstrap rather than reacting to a picker, which doesn't exist yet.
applyAccent(document.documentElement)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
