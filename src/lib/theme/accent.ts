import { bestOnColor } from './contrast'

/**
 * Fixed to piedra for this pass — the accent picker UI is backlog (macro plan Stage 11).
 * docs/DESIGN_SYSTEM.md §3.
 */
export const ACCENT = {
  accent: '#AAAAAD',
  accentHover: '#8F8F92',
  accentSoft: 'rgba(170, 170, 173, 0.12)',
  accentLine: 'rgba(170, 170, 173, 0.40)',
} as const

export function applyAccent(root: HTMLElement): void {
  root.style.setProperty('--accent', ACCENT.accent)
  root.style.setProperty('--accent-hover', ACCENT.accentHover)
  root.style.setProperty('--accent-soft', ACCENT.accentSoft)
  root.style.setProperty('--accent-line', ACCENT.accentLine)
  root.style.setProperty('--on-accent', bestOnColor(ACCENT.accent))
}
