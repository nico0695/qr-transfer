# Frontend Architecture — Design System Standard

> The convention followed when building the design system (light/dark theme, reusable
> primitives) for QR Transfer, executed per the [design-system refactor macro
> plan](specs/design-system-refactor/macro-plan.md). This document defines folder structure and
> CSS strategy; token _values_ and component _behavior_ live in
> [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

## Table of Contents

- [Why this exists](#why-this-exists)
- [Styling: CSS Modules](#styling-css-modules)
- [Design tokens](#design-tokens)
- [Component folder structure](#component-folder-structure)
- [Hooks placement](#hooks-placement)
- [Primitives vs feature components](#primitives-vs-feature-components)
- [Initial primitives inventory](#initial-primitives-inventory)
- [Demo page](#demo-page)
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
`@import` (Vite bundles these at build time — no extra tooling). **Landed in Stage 1** — this is
the actual structure, not a proposal:

```
src/styles/
  index.css            # imports everything below, in this order, then ../styles.css last
  tokens/
    colors.css          # --bg/--surface/--text/--line/--danger/--accent... dark on bare :root,
                         # light on :root[data-theme='light'] (dark-first, per DESIGN_SYSTEM.md §2.1)
    typography.css       # font family + the fixed size/weight scale
    spacing.css          # the spacing scale + layout constants
    radius.css            # border-radius scale
    shadows.css            # elevation scale, dark/light values
    motion.css              # --duration-fast/--duration-base/--duration-sheet, --easing-standard/--easing-out
    z.css                   # --z-header/--z-sheet/--z-fullscreen
  base.css               # resets + body/html + self-hosted font imports
  layout.css              # app-shell rules that aren't component-scoped — lands in Stage 4
  preloadFonts.ts          # preloads the two latin woff2 subsets via Vite's `?url` imports
```

This is a minimal split, not one file per value — each file groups one kind of token. Every future
component pulls values from these tokens instead of inventing new hex codes, rem values, or
durations inline. Token _values_ are defined in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §2 — this
file only defines where they live.

`src/styles.css` (the legacy stylesheet) is imported last and still controls every current screen —
its `:root` block was widened to `:root, :root[data-theme='light']` so it has the same cascade
specificity as the new tokens' light override in both themes, and five of its custom-property names
(`--surface-muted`, `--hover`, `--focus`, `--primary`, `--primary-text`) now forward to the new
tokens via `var()` rather than their own hex, per the macro plan's Stage 1 deliverable. It is
deleted entirely in Stage 9.

Beyond `src/styles/`, the redesign also introduces:

```
src/store/preferences.ts   # Zustand `persist` store — theme, language, last-used profile only
src/lib/theme/              # contrast.ts, accent.ts, breakpoints.ts (BREAKPOINT_DESKTOP = 900)
src/lib/motion/              # optional, Stage 10 — animation presets built on `motion`
src/components/app/           # App-scoped composed components (§5 of DESIGN_SYSTEM.md): AppHeader,
                                # ContextLabel, TextEditor, Dropzone, FileCard, SummaryGrid, Feedback,
                                # OpticalStage/{QrDisplay,CameraScanner}, ReceiveStatusPanel, ResultPanel,
                                # SettingsSheet, ProfileOption, MobileViewSwitcher
```

`src/components/app/` follows the same folder-per-component convention as `primitives/` below
(files only when needed) — it's a second, parallel component layer for app-specific composition,
distinct from the cross-feature `primitives/` layer.

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

## Hooks placement

A hook lives next to the feature it serves (e.g. `usePreparedPayload.ts` beside `SendFlow.tsx`,
`useTransferScanner.ts` beside `TransferScanner.tsx`) unless it's genuinely shared by **two or
more** features — only then does it move to `src/hooks/`. Don't pre-emptively centralize a hook
used by one component. `react-refresh/only-export-components` still applies: a hook must not live
in a `.tsx` file that also exports a component.

## Primitives vs feature components

The folder-per-component structure above applies to **`src/components/primitives/`** (reusable,
cross-feature UI) and **`src/components/app/`** (app-scoped composed components, §5 of
`DESIGN_SYSTEM.md`) — both are rebuilt fresh.

Every screen is rewritten **screen-by-screen, per the macro plan's stages** (Stage 4 shell, Stage
5 Quick QR, Stage 6 Large Transfer send, Stage 7 settings, Stage 8 Large Transfer receive) — not
migrated incrementally as components happen to be touched. Existing feature components
(`SendFlow.tsx`, `TransferScanner.tsx`, `QRGenerator.tsx`, everything in
`src/components/large-transfer/`, etc.) are replaced by their corresponding `app/` component in
the stage that covers them, and deleted in that same stage — not left running side by side with
their replacement past the stage that introduces it.

## Initial primitives inventory

12 primitives, settled in the design-system refactor spec (`docs/specs/design-system-refactor/spec.md`).
No `Skeleton` — no screen in this redesign needs a placeholder-shape loading state.

| Primitive          | Replaces / covers                                                                       |
| ------------------ | --------------------------------------------------------------------------------------- |
| `Button`           | `.button`, `.button-small`, `.button-primary`, generalizes `CopyButton`'s variant logic |
| `Input`            | `.select`, `.select-small`, plus new `Textarea`/`Range` surfaces (subcomponents)        |
| `SegmentedControl` | **new** — Send/Receive, Text/File source, mobile view switcher                          |
| `Tabs`             | `.tabs`, `.tab`                                                                         |
| `StatusDot`        | **new** — live/status pulse indicator                                                   |
| `Chip`             | **new** — missing-frame indexes, badges                                                 |
| `Card`             | `.panel`, `.panel-center`                                                               |
| `Icon`             | **new** — thin `lucide-react` wrapper, 28-icon inventory (`DESIGN_SYSTEM.md` §4.8)      |
| `Feedback`         | `.notice`, `.error` — unified Notice/Error/Verified, `level` prop                       |
| `Dialog`           | wraps the native `<dialog>` already in use — no new modal mechanism                     |
| `ProgressBar`      | `.progress`, `.progress-bar`, `.progress-fill`                                          |
| `Spinner`          | **new** — no loading indicator exists today                                             |

## Demo page

`src/components/demo/PrimitivesDemo.tsx`, lazy-loaded and mounted by `App` only when
`location.search` includes `demo=primitives` (same query-param detection pattern already used for
`debug`) — a grid of every primitive × variant × state, with a theme toggle and a reduced-motion
toggle, for visual review without wiring up a real screen. Dev-only; not linked from the app UI.

## Animation

**Decision: CSS for micro-interactions everywhere; `motion` for layout/presence transitions,
added late (Stage 10).**

Hover states, the spinner, and simple transitions stay native CSS — `.scan-guide-hit`'s
`@keyframes` fade (disabled under `prefers-reduced-motion`) remains the pattern, using the
`motion.css` duration/easing tokens. Pane switches, dialog/sheet enter-exit, and list stagger get
a small `motion` (Framer Motion's successor, ~loadable on demand) kit in `src/lib/motion/`,
introduced once the redesign's static screens exist (Stage 10, not earlier) — see the macro plan
for the exact preset list. Every animation, CSS or `motion`, must respect
`prefers-reduced-motion: reduce`.

## Out of scope for now

- Migrating any component **outside** the stages that explicitly rebuild it (no ad hoc drive-by
  refactors of untouched screens).
- Adding the Radix exception carve-out to any real component (no primitive needs it).
- The accent picker UI, landing page, and routing — see the macro plan's "What we are NOT doing".
