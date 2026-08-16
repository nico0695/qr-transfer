# Frontend Architecture — Design System Standard

> The convention to follow when building the design system (light/dark theme, reusable
> primitives) planned for QR Transfer. This document defines the **standard**; it does not itself
> define the palette or build any component — those come next, once this convention is agreed.

## Table of Contents

- [Why this exists](#why-this-exists)
- [Styling: CSS Modules](#styling-css-modules)
- [Design tokens](#design-tokens)
- [Component folder structure](#component-folder-structure)
- [Primitives vs feature components](#primitives-vs-feature-components)
- [Initial primitives inventory](#initial-primitives-inventory)
- [Animation](#animation)
- [Out of scope for now](#out-of-scope-for-now)

## Why this exists

The app currently has one global `src/styles.css` (~1000 lines) and no reusable component layer:
22 files hand-type `className="button..."` (or similar) instead of using a shared component, and
there's no loading-indicator primitive at all (loading states are plain `.hint` text). This
document defines how that changes going forward — folder structure, CSS strategy, token
organization, and which primitives to build — so the actual design system (built in a later pass)
has a consistent place to live instead of growing ad hoc.

## Styling: CSS Modules

**Decision: CSS Modules, no Tailwind, no CSS-in-JS, no Radix by default.**

Vite supports `*.module.css` natively — zero new dependencies. It keeps the "plain CSS" approach
this project already uses, just scoped per component instead of one global sheet, which directly
fixes the actual problem (class name collisions, 22 files duplicating the same string). Tailwind
and CSS-in-JS libraries would mean re-litigating every existing style rather than just relocating
it, and aren't worth it for an app of this size.

**Radix**: not adopted wholesale. If a specific future primitive genuinely needs accessibility
machinery the app doesn't have today (e.g. a combobox), it's fine to pull in a single unstyled
Radix primitive for _that_ component — not a blanket dependency added up front.

Convention: `ComponentName.module.css` with camelCase class names, imported as
`import styles from './ComponentName.module.css'` and consumed as `styles.foo`.

## Design tokens

Split `styles.css` into a small `src/styles/` folder, composed through one entry point via native
`@import` (Vite bundles these at build time — no extra tooling):

```
src/styles/
  index.css            # imports everything below, in this order
  tokens/
    colors.css          # --bg/--surface/--text/--border/--danger/--focus/--primary... on :root
                         # and :root[data-theme='dark'], same mechanism as today
    typography.css       # font family + a small size/weight scale
    spacing.css          # a spacing scale (today ad hoc rem values)
    radius.css            # border-radius scale
    shadows.css            # elevation scale
    motion.css              # --duration-fast/--duration-base, --ease-standard...
  base.css               # resets + body/html (top of today's styles.css)
  layout.css              # app-shell rules that aren't component-scoped (.app, .header, breakpoint)
```

This is a minimal split, not one file per value — each file groups one kind of token. Every future
component pulls values from these tokens instead of inventing new hex codes, rem values, or
durations inline.

## Component folder structure

```
src/components/primitives/Button/
  Button.tsx
  Button.module.css
  Button.interface.ts     # props types
  Button.constants.ts     # only if there are literal option lists/enums worth naming
  Button.utils.ts         # only if there's non-trivial logic worth extracting
  index.ts                # barrel: export { Button } from './Button'
```

Rule: **only create the files a component actually needs.** A simple primitive is just
`Button.tsx` + `Button.module.css` + `index.ts` — `.interface.ts`/`.constants.ts`/`.utils.ts` get
added when they'd otherwise bloat the component file, not by default.

For a primitive with real subcomponents:

```
src/components/primitives/Dialog/
  Dialog.tsx
  Dialog.module.css
  Dialog.interface.ts
  components/
    DialogHeader/
      DialogHeader.tsx
      DialogHeader.module.css
      index.ts
    DialogBody/
      DialogBody.tsx
      DialogBody.module.css
      index.ts
  index.ts                 # re-exports Dialog (+ Dialog.Header/Dialog.Body if composed that way)
```

## Primitives vs feature components

This structure applies to **`src/components/primitives/`** — reusable, cross-feature UI — only.

Existing feature components (`SendFlow.tsx`, `TransferScanner.tsx`, `QRGenerator.tsx`, everything
in `src/components/large-transfer/`, etc.) **stay as they are**, single-file. They migrate to
primitives incrementally, one component at a time, only when they're touched for the redesign or
they grow enough to need it. The app isn't expected to scale much further, so forcing a
folder-per-file rewrite of ~20 stable feature components has no payoff — don't do it wholesale.

## Initial primitives inventory

Derived from today's ~90 CSS classes plus the one identified gap (no loading indicator exists).
Building these is a **later pass** (once the palette/token values are defined) — this is the list
that pass commits to:

| Primitive     | Replaces / covers                                                                       |
| ------------- | --------------------------------------------------------------------------------------- |
| `Button`      | `.button`, `.button-small`, `.button-primary`, generalizes `CopyButton`'s variant logic |
| `Panel`       | `.panel`, `.panel-center`                                                               |
| `Notice`      | `.notice`, `.error` — unified as variants (info/error/success)                          |
| `Dialog`      | wraps the native `<dialog>` already in use — no new modal mechanism                     |
| `Tabs`        | `.tabs`, `.tab`                                                                         |
| `Select`      | `.select`, `.select-small`                                                              |
| `ProgressBar` | `.progress`, `.progress-bar`, `.progress-fill`                                          |
| `Spinner`     | **new** — no loading indicator exists today                                             |
| `Skeleton`    | **new** — no skeleton/placeholder exists today                                          |

## Animation

**Decision: native CSS only — no Framer Motion, no anime.js.**

The app already has the right precedent: `.scan-guide-hit` is a `@keyframes` fade disabled under
`prefers-reduced-motion`. Hover states, a spinner, and a skeleton shimmer are all straightforward
in CSS and don't justify a runtime animation library — this app has no product need for gesture-
driven or orchestrated multi-step animation. Every animation must use the `motion.css` duration/
easing tokens and respect `prefers-reduced-motion: reduce`, matching the existing pattern.

## Out of scope for now

This document defines the standard only. Not part of this pass:

- The actual color palette, spacing/typography scale, and other token _values_.
- Building any of the primitives listed above.
- Migrating any existing component to `primitives/` or to CSS Modules.
- Adding the Radix exception carve-out to any real component (no primitive needs it yet).
