# Design prototype — visual reference only

`App.dc.html` + `support.js` are the interactive HTML/JS prototype of the two-pane app shell
(Quick QR + Large Transfer) that the [design system](../../DESIGN_SYSTEM.md) and the
[refactor macro plan](../../specs/design-system-refactor/macro-plan.md) are grounded in.

**How to use this**

- Open `App.dc.html` in a browser to see layout, spacing, and interaction rhythm.
- Treat it as a **visual reference only** — never copy its inline CSS values (custom-property
  fallbacks, hex codes, class names) into production code. Several are stale or prototype-only:
  - Its inline `var(--x, fallback)` values don't match the design system (e.g. a leftover coral
    `#E5715A` fallback, several different `--surface-2` fallback values across the file).
  - Its runtime CSS variable names differ from the DS canonical names in places — see the mapping
    table in `DESIGN_SYSTEM.md`'s changelog (`--danger-text` → `--danger`, etc.).
  - It loads fonts and icons from a CDN (`iconify-icon`, remote font URLs) — the production app is
    offline-only and self-hosts both (see the DS changelog).
  - Its settings panel is a plain `<div>`, not the native `<dialog>` the DS and macro plan specify.
  - Its torch button handler is a no-op.
  - It uses a single `matchMedia('(max-width: 900px)')` breakpoint, which does match the DS's
    final single-breakpoint decision.

**The source of truth for values is [`../../DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md)**, not this
file. When the two disagree, the design system document wins.
