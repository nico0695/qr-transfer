/**
 * WCAG relative luminance / contrast ratio, per the formulas in
 * docs/DESIGN_SYSTEM.md §2.1 — used to compute `--on-accent` so any accent color (only `piedra`
 * today, but the palette is designed to be swappable) keeps its text readable.
 */
export function relativeLuminance(hex: string): number {
  const c = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.substring(i, i + 2), 16) / 255)
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrastRatio(hexA: string, hexB: string): number {
  const [lighter, darker] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

export function bestOnColor(hex: string): '#050505' | '#FFFFFF' {
  const L = relativeLuminance(hex)
  const blackRatio = (L + 0.05) / 0.05
  const whiteRatio = 1.05 / (L + 0.05)
  return blackRatio >= whiteRatio ? '#050505' : '#FFFFFF'
}
