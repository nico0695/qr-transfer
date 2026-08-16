# QR Transfer — Design System

> Scope: **App only** — Quick QR and Large Transfer (send + receive). Excludes the marketing
> landing page. Everything here is grounded in the working prototype (`App.dc.html`, versioned at
> `docs/design/prototype/`) and is meant to be copied 1:1 into the production codebase.

## Changelog (v1 → v1.1)

Corrections made in Stage 0 of the [design-system refactor macro
plan](specs/design-system-refactor/macro-plan.md), before any implementation, so this document is
directly buildable:

- **Range tokens → single values.** `--fs-ui` (was 12.5–13.5px) is now `13px / 700`, with a new
  `--fs-ui-sm: 12.5px` for dense contexts; `--fs-data` (was 11–13px / 400–500) is now
  `12px / 450`, with a new `--fs-data-sm: 11px`; `--r-control` (was 10–12px) is `10px`;
  `--r-card` (was 16–18px) is `16px`; `--r-stage` stays `22px`; `--r-sheet` stays `24px`. Every
  weight is now a fixed number, not a range.
- **Motion tokens renamed and split.** `--ease-base` → `--duration-base: 200ms` +
  `--easing-standard: ease`; `--ease-sheet` → `--duration-sheet: 280ms` + `--easing-out: ease-out`;
  added `--duration-fast: 120ms` for hover/press micro-interactions. `--anim-*` tokens are
  unchanged (they're already valid `animation` shorthand, not durations to split).
- **Breakpoints collapsed to one.** `--bp-mobile`/`--bp-tablet`/`--bp-desktop` (three tiers) are
  removed; the app now has a single breakpoint at **900px** (§2.7 rewritten). Every "≥760px" /
  "<760px" reference elsewhere in this doc (§5.12) is now "≥900px" / "<900px". `--bp-*` is not a
  CSS custom property (media queries can't read custom properties) — it's the TypeScript constant
  `BREAKPOINT_DESKTOP = 900` in `src/lib/theme/breakpoints.ts`.
- **Added tokens**: `color-scheme: dark` / `light` per theme; `--focus-ring: 2px solid var(--accent)`
  and `--focus-offset: 2px`; ten `--cm-*` CodeMirror tokens (both themes, mapped onto the palette —
  see §2.1 addendum); light + dark values for `--sh-qr` and `--sh-sheet` (previously dark-only
  values used unchanged in light, which is wrong — shadows need to be lighter/tighter on a pale
  background). `--overlay-scrim` and `--scan-mask` are confirmed **intentionally theme-invariant**
  (both are translucent black — that's correct in both themes, since they always sit over imagery
  or a viewfinder, not over `--bg`).
- **Token naming**: the names in this document are canonical. The prototype's inline
  `App.dc.html` uses different runtime variable names for some of the same concepts — treat the
  prototype as a visual reference only, never copy its variable names. Mapping:

  | Prototype name  | Canonical DS name  |
  | --------------- | ------------------ |
  | `--danger-text` | `--danger`         |
  | `--ok-text`     | `--ok`             |
  | `--warn-text`   | `--warn`           |
  | `--notice-bg`   | `--warn-bg`        |
  | `--notice-line` | `--warn-line`      |
  | `--active-bg`   | `--surface-active` |

- **Accessibility fixes**: segmented-control inactive text moves from `--text-faint` to
  `--text-muted` (§4.3) — `--text-faint` on `--surface-2` failed AA (3.15:1 dark / 3.40:1 light);
  the light-theme primary button gets an added `border: 1px solid var(--line)` (§4.1) because every
  non-`bosque` accent, including the current `piedra` pick, fails 3:1 as a borderless fill on a
  light surface; `--fs-label` must never be used on interactive/clickable text (labels only); the
  Notice/Error/Verified body copy (§5.7) uses `--fs-ui-sm` (12.5px), not a raw `12px`; the few raw
  pixel values in §5.6/§5.7 are snapped onto the `--sp-*`/`--r-*` scales instead of being literals.
- **Fonts**: Satoshi is dropped — its license (ITF) does not permit self-hosting the way this
  offline-only app requires. `--font-ui` is now **Inter Variable**, self-hosted via
  `@fontsource-variable/inter`; `--font-mono` is **JetBrains Mono Variable**, self-hosted via
  `@fontsource-variable/jetbrains-mono`. Both replace remote/CDN font loading, matching the app's
  no-network-requests constraint.
- **Icons**: `iconify-icon` (§4.8) fetches icon data from a CDN at runtime, which violates the
  app's offline requirement — replaced with `lucide-react` (bundled, tree-shakeable). The 28-icon
  inventory this document actually uses is listed in §4.8.
- **Theming (§3)**: the accent is fixed to `piedra` for this pass — the accent picker UI is out of
  scope, moved to backlog (Stage 11). Theme and language are persisted through a single Zustand
  `persist` store (`src/store/preferences.ts`), not ad hoc `localStorage` calls. The "readable from
  the URL for deep links" paragraph is removed — this app has no routing.
- **Patterns (§6.2, §6.4)**: rewritten — there's no URL-driven state or routing; `mode` / `role` /
  `phase` are React state, and only `theme`, `language`, and the last-used transfer profile persist
  (through the preferences store), never content, and never the accent (fixed).
- **Editor (§5.3)**: clarified that Quick QR uses a plain `<textarea>`, while Large Transfer's
  "Text" source keeps CodeMirror 6 (already in the codebase) — this document previously implied one
  shared editor primitive for both, which isn't accurate to what ships.
- **Settings (§5.12)**: explicitly a native `<dialog>` element (`showModal`/`close`, built-in focus
  trap and Escape-to-close) — the interactive prototype's settings panel is a plain `<div>`, which
  was prototype-only and is not the target implementation.
- **Primitives (§4)**: added `Feedback`, `Dialog`, `ProgressBar`, `Spinner` as named primitives
  (previously only implied by component descriptions in §5). No `Skeleton` primitive — not needed
  by any screen in this redesign.
- **§8 removed.** File/implementation structure is no longer duplicated here — it's owned by
  [`frontend-architecture.md`](frontend-architecture.md), which is the actual standard for folder
  layout, CSS Modules, and primitive conventions.

## Table of contents

1. [Principles](#1-principles)
2. [Foundations — tokens](#2-foundations--tokens)
   - [2.1 Color](#21-color)
   - [2.2 Typography](#22-typography)
   - [2.3 Spacing](#23-spacing)
   - [2.4 Radius](#24-radius)
   - [2.5 Shadows & elevation](#25-shadows--elevation)
   - [2.6 Motion](#26-motion)
   - [2.7 Breakpoints & layout](#27-breakpoints--layout)
   - [2.8 Z-index scale](#28-z-index-scale)
3. [Theming](#3-theming)
4. [Primitives](#4-primitives)
5. [Components](#5-components)
6. [Patterns](#6-patterns)
7. [Accessibility rules](#7-accessibility-rules)
8. [File & implementation structure](#8-file--implementation-structure)

---

## 1. Principles

- **The optical channel is not decoration.** The QR code is always rendered `--qr-ink` on
  `--qr-paper` at full contrast, in both themes, with a fixed quiet zone. No component may tint,
  shadow, blur, or animate behind an active code.
- **One accent, everywhere else.** A single accent color (swappable, see [§3](#3-theming)) drives
  every primary action, active state, and focus ring. Status colors (success / warning / danger)
  are fixed and never reassigned to the accent.
- **No page scroll for the primary task.** The app fits `100dvh`. Only inner regions (editor body,
  result content, missing-frames list) scroll internally.
- **Same shell, two modes.** Quick QR and Large Transfer share one header, one two-pane layout
  (compose ↔ optical stage), and one component set. Mode-specific UI is additive, not a different
  layout.

---

## 2. Foundations — tokens

All tokens are CSS custom properties on `:root`, overridden by a `data-theme="light"` attribute.
No component may hardcode a hex value — everything resolves through a token.

### 2.1 Color

#### Neutrals (theme-dependent)

| Token              | Dark      | Light     | Usage                                       |
| ------------------ | --------- | --------- | ------------------------------------------- |
| `--bg`             | `#050505` | `#F4F3F0` | App background                              |
| `--surface`        | `#111111` | `#FFFFFF` | Cards, panels, editor body                  |
| `--surface-2`      | `#161616` | `#FAF9F6` | Nested surfaces (toolbar, input fill, chip) |
| `--surface-active` | `#242424` | `#EFEDE7` | Selected segment / active tab background    |
| `--line`           | `#333333` | `#DEDCD6` | Default borders (buttons, inputs, dialogs)  |
| `--line-soft`      | `#222222` | `#E8E6E1` | Low-emphasis dividers, card borders         |
| `--text-strong`    | `#FFFFFF` | `#050505` | Headings, primary values                    |
| `--text`           | `#EBEBEB` | `#1A1917` | Body text                                   |
| `--text-muted`     | `#888888` | `#5C5A55` | Secondary text, descriptions                |
| `--text-faint`     | `#666666` | `#8A8780` | Micro-labels, placeholders, metadata        |

#### Accent (swappable — see [§3](#3-theming))

| Token            | Value (current pick: **Gris piedra**) | Usage                                                               |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `--accent`       | `#AAAAAD`                             | Primary buttons, active tab underline, links, QR-scan guide corners |
| `--accent-hover` | `#8F8F92`                             | Hover/active state of accent-colored controls                       |
| `--accent-soft`  | `rgba(170,170,173,0.12)`              | Tinted backgrounds (rare — prefer neutral surfaces)                 |
| `--accent-line`  | `rgba(170,170,173,0.40)`              | Tinted borders                                                      |
| `--on-accent`    | _(computed, see below)_               | Text/icon color drawn on top of `--accent`                          |

`--on-accent` is **not a fixed hex** — it must be computed per accent color so text stays
readable regardless of which accent is active:

```js
function relativeLuminance(hex) {
  const c = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16) / 255)
  const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function bestOnColor(hex) {
  const L = relativeLuminance(hex)
  const blackRatio = (L + 0.05) / 0.05
  const whiteRatio = 1.05 / (L + 0.05)
  return blackRatio >= whiteRatio ? '#050505' : '#FFFFFF'
}
```

Run this once when the accent is set (theme init, or user picks a new accent) and write the result
to `--on-accent`. Never hardcode `color: #050505` on an accent-filled element — always
`color: var(--on-accent)`.

#### Status (fixed — never follow the accent)

| Token           | Dark                     | Light                  | Usage                                    |
| --------------- | ------------------------ | ---------------------- | ---------------------------------------- |
| `--ok`          | `#4ADE80`                | `#15803D`              | Verified checksum, success confirmation  |
| `--ok-bg`       | `rgba(74,222,128,0.07)`  | `rgba(21,128,61,0.06)` | Verified panel background                |
| `--ok-line`     | `rgba(74,222,128,0.30)`  | `rgba(21,128,61,0.28)` | Verified panel border                    |
| `--warn`        | `#FBBF24`                | `#A16207`              | Informational notice (large transfer)    |
| `--warn-bg`     | `rgba(251,191,36,0.07)`  | `rgba(161,98,7,0.06)`  | Notice background                        |
| `--warn-line`   | `rgba(251,191,36,0.28)`  | `rgba(161,98,7,0.22)`  | Notice border                            |
| `--danger`      | `#F87171`                | `#B91C1C`              | Blocking error, camera/verification fail |
| `--danger-bg`   | `rgba(248,113,113,0.10)` | `rgba(185,28,28,0.06)` | Error background                         |
| `--danger-line` | `rgba(248,113,113,0.30)` | `rgba(185,28,28,0.22)` | Error border                             |

#### Optical channel (fixed in both themes — never tokenized by theme)

| Token          | Value              | Usage                                         |
| -------------- | ------------------ | --------------------------------------------- |
| `--qr-ink`     | `#050505`          | QR code foreground modules                    |
| `--qr-paper`   | `#FFFFFF`          | QR code background + quiet zone               |
| `--qr-quiet`   | `14px`             | Minimum quiet zone around every rendered code |
| `--scan-guide` | `var(--accent)`    | Viewfinder corner brackets, sweep line        |
| `--scan-mask`  | `rgba(5,5,5,0.55)` | Dimmed area outside the viewfinder frame      |

#### Contrast reference (current pick, dark theme)

| Pair                                         | Ratio                                 | Level    |
| -------------------------------------------- | ------------------------------------- | -------- |
| `--text-strong` on `--bg`                    | 20.4 : 1                              | AAA      |
| `--text` on `--surface`                      | 15.1 : 1                              | AAA      |
| `--text-muted` on `--surface`                | 5.3 : 1                               | AA       |
| `--text-faint` on `--bg` (micro-labels only) | 3.6 : 1                               | AA-large |
| computed `--on-accent` on `--accent`         | ≥ 4.5 : 1 (enforced by `bestOnColor`) | AA       |
| `--qr-ink` on `--qr-paper`                   | 20.6 : 1                              | AAA      |

#### Browser chrome, focus, and CodeMirror tokens

| Token              | Dark                      | Light                     | Usage                                                                               |
| ------------------ | ------------------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| `color-scheme`     | `dark`                    | `light`                   | Set on `:root`/`html` per theme — native form controls, scrollbars follow the theme |
| `--focus-ring`     | `2px solid var(--accent)` | `2px solid var(--accent)` | Every focusable element's outline                                                   |
| `--focus-offset`   | `2px`                     | `2px`                     | Outline offset paired with `--focus-ring`                                           |
| `--cm-bg`          | `#111111`                 | `#FFFFFF`                 | CodeMirror editor background (= `--surface`)                                        |
| `--cm-text`        | `#EBEBEB`                 | `#1A1917`                 | CodeMirror text (= `--text`)                                                        |
| `--cm-caret`       | `#AAAAAD`                 | `#AAAAAD`                 | CodeMirror caret (= `--accent`)                                                     |
| `--cm-selection`   | `rgba(170,170,173,0.25)`  | `rgba(170,170,173,0.25)`  | CodeMirror selection background                                                     |
| `--cm-gutter-bg`   | `#161616`                 | `#FAF9F6`                 | Line-number gutter background (= `--surface-2`)                                     |
| `--cm-gutter-text` | `#666666`                 | `#8A8780`                 | Line-number text (= `--text-faint`)                                                 |
| `--cm-line-active` | `#161616`                 | `#FAF9F6`                 | Active line highlight (= `--surface-2`)                                             |
| `--cm-match`       | `rgba(251,191,36,0.28)`   | `rgba(161,98,7,0.22)`     | Search-match highlight (= `--warn-line`)                                            |
| `--cm-bracket`     | `#AAAAAD`                 | `#AAAAAD`                 | Matching-bracket highlight (= `--accent`)                                           |
| `--cm-scrollbar`   | `#333333`                 | `#DEDCD6`                 | Scrollbar thumb (= `--line`)                                                        |

Every `--cm-*` value is a direct alias of an existing palette token — CodeMirror gets no colors of
its own, it just needs its own token names because `@codemirror/*` themes are configured
programmatically, not via arbitrary CSS custom properties.

### 2.2 Typography

| Token         | Family                                 | Usage                                                                                              |
| ------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `--font-ui`   | `'Inter Variable', sans-serif`         | All UI text — headings, labels, body, buttons                                                      |
| `--font-mono` | `'JetBrains Mono Variable', monospace` | Anything that is _data_: counters, byte sizes, frame counts, checksums, the large-text editor body |

Self-hosted via `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` (both
bundled — no CDN, no Google Fonts request; the app must work offline). `font-display: swap`; the
two `.woff2` files are preloaded in `index.html`.

#### Type scale

| Token          | Size / line-height / tracking | Weight | Usage                                                           |
| -------------- | ----------------------------- | ------ | --------------------------------------------------------------- |
| `--fs-h1`      | 34px / 1.05 / -0.035em        | 650    | Page/section titles (settings dialog title, result heading)     |
| `--fs-h2`      | 20px / 1.2 / -0.025em         | 700    | Dialog headings, error headings                                 |
| `--fs-body`    | 14px / 1.6 / 0                | 400    | Descriptions, hints, paragraph copy                             |
| `--fs-ui`      | 13px / 1.2 / 0                | 700    | Buttons, tabs, segmented controls, inputs                       |
| `--fs-ui-sm`   | 12.5px / 1.2 / 0              | 700    | Dense contexts: notice/error/verified body copy                 |
| `--fs-label`   | 10px / 1.2 / 0.2em, uppercase | 800    | Micro-labels, section eyebrows, badges (never interactive text) |
| `--fs-data`    | 12px, monospace               | 450    | Counters, KB/MB, frame index, checksums, editor body            |
| `--fs-data-sm` | 11px, monospace               | 450    | Chip contents, dense metadata rows                              |

Minimum interactive text size: **12.5px** (`--fs-ui-sm`). Never go smaller for anything clickable.

### 2.3 Spacing

4px base unit. Use the scale, never an arbitrary value.

| Token     | Value | Typical usage                             |
| --------- | ----- | ----------------------------------------- |
| `--sp-1`  | 4px   | Icon-to-label gap, tight chip padding     |
| `--sp-2`  | 8px   | Control internal gaps, small stacks       |
| `--sp-3`  | 12px  | Card internal padding (dense), row gaps   |
| `--sp-4`  | 16px  | Standard card padding, panel gaps         |
| `--sp-5`  | 20px  | Section padding (mobile)                  |
| `--sp-6`  | 24px  | Section padding (desktop), dialog padding |
| `--sp-8`  | 32px  | Large vertical rhythm between blocks      |
| `--sp-10` | 40px  | Rare — hero-scale spacing only            |

Layout constants (not on the 4px scale, but fixed):

| Token             | Value  | Usage                                                                           |
| ----------------- | ------ | ------------------------------------------------------------------------------- |
| `--header-height` | 60px   | App header                                                                      |
| `--panel-gap`     | 16px   | Gap between compose pane and optical stage                                      |
| `--content-max`   | 1320px | Max width of the two-pane layout, centered                                      |
| `--stage-max`     | 560px  | Max width of the optical stage column                                           |
| `--compose-max`   | 720px  | Max width of the compose column in hero layouts (Large Transfer send · editing) |

### 2.4 Radius

| Token         | Value                   | Usage                                       |
| ------------- | ----------------------- | ------------------------------------------- |
| `--r-control` | 10px                    | Buttons, inputs, selects, chips             |
| `--r-card`    | 16px                    | Cards, summary grid cells, notices          |
| `--r-stage`   | 22px                    | Optical stage container (QR / camera panel) |
| `--r-sheet`   | 24px (top corners only) | Bottom sheet (settings on mobile)           |
| `--r-pill`    | 999px                   | Segmented control track, status dot, badges |

### 2.5 Shadows & elevation

| Token             | Dark                            | Light                           | Usage                                                                                                              |
| ----------------- | ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `--sh-qr`         | `0 24px 60px rgba(0,0,0,0.45)`  | `0 12px 32px rgba(0,0,0,0.14)`  | The QR card, always elevated                                                                                       |
| `--sh-sheet`      | `0 -20px 60px rgba(0,0,0,0.50)` | `0 -12px 32px rgba(0,0,0,0.16)` | Bottom sheet / dialog                                                                                              |
| `--overlay-blur`  | `6px`                           | `6px`                           | Backdrop blur behind dialogs/sheets                                                                                |
| `--overlay-scrim` | `rgba(5,5,5,0.72)`              | `rgba(5,5,5,0.72)`              | Backdrop color behind dialogs/sheets — intentionally theme-invariant (always sits over imagery/camera, not `--bg`) |

No card elevation beyond a 1px `--line-soft` border in the default state — shadows are reserved
for things that float above the layout (QR card, sheet, fullscreen exit button). Light-theme
shadows are tighter and lower-opacity than dark, matching a pale background (a dark-theme shadow
value copied unchanged onto `--bg: #F4F3F0` reads as visibly wrong — too heavy, too spread).

### 2.6 Motion

| Token               | Value                     | Usage                                             |
| ------------------- | ------------------------- | ------------------------------------------------- |
| `--duration-fast`   | `120ms`                   | Hover/press micro-interactions                    |
| `--duration-base`   | `200ms`                   | Active transitions, tab underline                 |
| `--duration-sheet`  | `280ms`                   | Sheet/dialog enter                                |
| `--easing-standard` | `ease`                    | Default easing (pairs with `--duration-base`)     |
| `--easing-out`      | `ease-out`                | Enter transitions (pairs with `--duration-sheet`) |
| `--anim-scan-sweep` | `2.4s linear infinite`    | Camera viewfinder scan line                       |
| `--anim-pulse`      | `2s ease-in-out infinite` | Live/status pulse dot                             |
| `--anim-spin`       | `0.8s linear infinite`    | Loading spinners (preparing, starting camera)     |

**`prefers-reduced-motion: reduce`** must disable: the scan sweep, the pulse dot, and the
frame-accepted flash (`.scan-guide-hit`, 700ms). The animated QR loop itself is **not** disabled —
it is functional, not decorative.

**CSS vs. `motion` (`src/lib/motion/`)** — the table above stays CSS-only: infinite/functional
animations (scan sweep, pulse, spin) and simple hover/press states never need JS. Layout and
presence transitions where an element's mount/unmount or resting position changes go through
`motion` (motion.dev) instead, reading the same duration/easing tokens via `getComputedStyle` so
there is one source of truth:

| Transition                         | Component                            | Preset                     |
| ---------------------------------- | ------------------------------------ | -------------------------- |
| Dialog enter/exit (modal/sheet)    | `Dialog`                             | `sheetEnter`               |
| Feedback/ResultPanel mount/unmount | `Feedback` (`ResultPanel` overrides) | `presence` / `fadeSlideUp` |
| Summary cell stagger               | `SummaryGrid`                        | `staggerList`              |
| Mobile compose↔stage pane switch   | `AppShell`                           | `paneSwitch`               |

Every preset collapses to the settled end-state with zero duration under
`useReducedMotion()` (`src/lib/motion/reducedMotion.ts`), independently of the CSS-only handling
above — a `motion`-reduced user sees exactly the same static end-state whether the transition
would have been CSS or JS-driven.

### 2.7 Breakpoints & layout

One breakpoint, **900px**. Not a CSS custom property — media queries can't read custom
properties — it's the TypeScript constant `BREAKPOINT_DESKTOP = 900` (`src/lib/theme/breakpoints.ts`),
used both to build the `@media` query and to drive JS behavior (e.g. `Dialog`'s `modal`/`sheet`
variant, the mobile view switcher's visibility).

| Range   | Layout                                                                                                                                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 900px | Single column. Bottom view-switcher (Content ↔ Stage) toggles which pane is visible — only in `split` layout. Sheet has safe-area padding.                                                                     |
| ≥ 900px | Default `split`: two columns (`1.35fr` compose / `minmax(400px, var(--stage-max))` stage) inside `100dvh`, no page scroll. Hero layouts (`compose-hero` / `stage-hero`) collapse to one column at every width. |

Container: `max-width: var(--content-max)`, centered, `padding-inline: 20px` (< 900px) /
`24px` (≥ 900px).

### 2.8 Z-index scale

| Token            | Value | Usage                          |
| ---------------- | ----- | ------------------------------ |
| `--z-header`     | 10    | Sticky app header              |
| `--z-sheet`      | 200   | Settings dialog / bottom sheet |
| `--z-fullscreen` | 300   | Fullscreen QR overlay          |

---

## 3. Theming

- **Theme**: `data-theme="dark" | "light"` on `<html>`. Falls back to `prefers-color-scheme` on
  first load only, then persists through the preferences store (`src/store/preferences.ts`,
  Zustand `persist`, key `qr-transfer:prefs`) — the same store also holds `language` and the
  last-used transfer profile. An inline `<script>` in `index.html` reads the persisted value and
  sets `data-theme` before first paint, so there's no flash of the wrong theme.
- **Accent**: fixed to `piedra` (`#AAAAAD`) for this pass. The accent palette below stays
  documented for future reference, but the picker UI is **not built** — it's backlog (macro plan
  Stage 11). `--accent`, `--accent-hover`, `--accent-soft`, `--accent-line`, and computed
  `--on-accent` are set once at theme init via `src/lib/theme/accent.ts` (`applyAccent(root)`),
  not per-user-choice.

### Accent palette (curated options, for future reference)

| Key          | Name            | Hex           | Notes                                                                                           |
| ------------ | --------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `celeste`    | Celeste         | `#B5D3E7`     | Palest, most neutral option                                                                     |
| `bosque`     | Verde bosque    | `#248C54`     | ⚠️ Sits close to `--ok` green — avoid if status color confusion is a concern                    |
| `lago`       | Azul lago       | `#90C0DF`     | Mid-saturation blue                                                                             |
| **`piedra`** | **Gris piedra** | **`#AAAAAD`** | **Current pick.** Neutral, nearly desaturated — accent recedes into the UI rather than shouting |
| `hueso`      | Hueso           | `#DFDEDD`     | Lightest, warm-neutral option                                                                   |

Adding a new accent = adding one entry to this table + running `bestOnColor()` once to confirm its
computed `--on-accent`. No other token or component changes.

```css
:root {
  --accent: #aaaaad;
  --accent-hover: #8f8f92;
  --accent-soft: rgba(170, 170, 173, 0.12);
  --accent-line: rgba(170, 170, 173, 0.4);
  --on-accent: #050505; /* computed via bestOnColor('#AAAAAD') */
}
```

---

## 4. Primitives

Lowest-level building blocks. Everything in [§5](#5-components) is composed from these.

### 4.1 Button

- Height: `42px` (primary actions), `38px` (secondary contexts like error retry), `34px` (icon-only, header).
- Radius: `--r-control`.
- Padding: `0 var(--sp-4)` (16px, has label), `0` centered (icon-only, fixed width = height).
- Font: `--fs-ui` (700 weight).
- Variants:
  - **Primary** — `background: var(--accent)`, `color: var(--on-accent)`, no border in dark theme;
    **light theme adds** `border: 1px solid var(--line)` — every non-`bosque` accent (including
    the current `piedra` pick, 2.32:1) fails 3:1 contrast as a borderless fill against the light
    surfaces, so the border is required for the light theme to meet a11y, not optional polish.
  - **Secondary** — `background: transparent`, `border: 1px solid var(--line)`, `color: var(--text-muted)`.
  - **Destructive** — `background: var(--danger-bg)`, `border: 1px solid var(--danger-line)`, `color: var(--danger)`.
  - **Disabled** — `background: var(--surface-2)`, `border: 1px solid var(--line-soft)`, `color: var(--text-faint)`, `cursor: not-allowed`.
- Minimum hit target: 44×44px on touch (pad icon-only buttons to reach this even if the visual box is smaller).

### 4.2 Input surfaces (textarea / select)

- Background: `transparent` inside a bordered container (editor), or `var(--surface-2)` when standalone (select, range).
- Border: `1px solid var(--line)`; no visible border for the borderless textarea (its container carries the border).
- Radius: `--r-control` for standalone inputs; the outer container uses `--r-card`.
- Focus: `2px solid var(--accent)` outline, `2px` offset.
- Placeholder color: `var(--text-faint)`.

### 4.3 Segmented control

- Track: `background: var(--surface-2)`, `border: 1px solid var(--line-soft)`, `padding: 3px`, `border-radius: --r-control`.
- Segment (inactive): `background: transparent`, `color: var(--text-muted)` — **not**
  `--text-faint` (fails AA at 3.15:1 dark / 3.40:1 light against `--surface-2`; `--text-muted`
  clears 4.5:1).
- Segment (active): `background: var(--surface-active)`, `color: var(--text-strong)`.
- Used for: Send/Receive, Text/File source, view switcher (mobile).

### 4.4 Tab (underline style)

- Label: `--fs-label` treatment but not always uppercase — see actual usage (mode nav uses uppercase + tracking).
- Active: `border-bottom: 2px solid var(--accent)`, `color: var(--text-strong)`.
- Inactive: `border-bottom: 2px solid transparent`, `color: var(--text-faint)`.
- Used for: Quick QR / Large Transfer mode nav.

### 4.5 Status dot

- `6–7px` circle, `border-radius: --r-pill`, `background: var(--accent)`.
- Animated with `--anim-pulse` when representing "live" state.

### 4.6 Chip

- `padding: 4px 8px`, `background: var(--surface-2)`, `border: 1px solid var(--line-soft)`, `border-radius: --r-control`, `font: --fs-data`.
- Used for: missing-frame indexes, badges.

### 4.7 Card / panel

- `background: var(--surface)`, `border: 1px solid var(--line-soft)`, `border-radius: --r-card`.
- No shadow by default.

### 4.8 Icon

- Source: `lucide-react` (bundled dependency — `iconify-icon` fetched from a CDN at runtime,
  which violates this app's offline requirement, so it is not used).
- Standard sizes: `14px` (inline with 12–13px text), `16px` (buttons, list items), `22px`/`26px`
  (empty states, error badges).
- Color: inherits `currentColor` — never hardcode an icon fill.
- **Inventory** (the only names the `Icon` primitive needs to support —
  `Icon.constants.ts`): `qr-code`, `scan-line`, `upload`, `file-up`, `file`, `x`, `copy`,
  `check`, `check-circle`, `shield-check`, `alert-triangle`, `octagon-alert`, `chevron-down`,
  `chevron-up`, `chevron-left`, `chevron-right`, `settings`, `sun`, `moon`, `globe`,
  `zap`, `zap-off`, `camera`, `camera-off`, `rotate-cw`, `maximize`, `minimize`, `loader-circle`.

### 4.9 Feedback

Named primitive for the 3-level Notice/Error/Verified shape described in [§5.7](#57-notice--error--verified-3-level-feedback):
`level: notice | error | verified`, icon + title + body + optional action row, `role="status"`
for notice/verified, `role="alert"` for error.

### 4.10 Dialog

Wraps the native `<dialog>` element (`showModal()`/`close()`, built-in focus trap, Escape-to-close,
focus restoration to the triggering control) — no custom modal mechanism. `variant: modal | sheet`,
chosen automatically from `BREAKPOINT_DESKTOP` (§2.7). Backdrop uses `--overlay-scrim` +
`--overlay-blur`. Composed as `Dialog.Header` / `Dialog.Body` / `Dialog.Footer`.

### 4.11 ProgressBar

8px pill (`--r-pill`), `value`/`max`, `aria-valuenow` (and `aria-valuemin`/`aria-valuemax`), fill
in `--accent`, optional label slot. Backs the receive status panel's progress sub-block (§5.10).

### 4.12 Spinner

Rotating indicator using `--anim-spin`, a small size scale, `aria-label` describing what's
loading ("Starting camera…", "Preparing…"). No `Skeleton` primitive — no screen in this redesign
needs a placeholder-shape loading state.

---

## 5. Components

Composed from primitives above. Each entry lists structure, states, and the primitive(s) it uses.

### 5.1 App header

- Fixed height `--header-height`, `border-bottom: 1px solid var(--line-soft)`.
- Left: 30px logo mark + mode nav (Tab primitive ×2: Quick QR / Large Transfer).
- Right: Send/Receive segmented control, accent swatch group, language toggle button, theme toggle button.
- **State:** active mode item gets `aria-current="page"`.

### 5.2 Context label

- One line above the compose pane: live status dot + `--fs-label` text describing mode + role + constraint (e.g. "QUICK QR · SEND · UP TO 2,000 CHARACTERS").
- Purely informational, always present, never wraps to 2 lines (truncate with ellipsis).

### 5.3 Text editor (Quick QR + Large Transfer "Text" source)

- Container: Card primitive.
- Header row: `--fs-label` title left, action buttons right (Copy, Clear; Large Transfer adds Format select + Fullscreen).
- Body: **Quick QR** uses a plain `<textarea>`; **Large Transfer**'s Text source keeps CodeMirror 6
  (already in the codebase, themed with the `--cm-*` tokens from §2.1). Both are `--font-mono`,
  `--fs-data` size, no visible border, fill available height — this is a styling convention shared
  by two different editor implementations, not one shared component.
- Footer: counter (`--fs-data`, `--text-faint`) left, limit-reached warning (`--warn`) right when applicable.
- **Toolbar scope decision:** reduced from the legacy 7-action toolbar (Undo/Redo/Find/Wrap/Format/Copy/Clear/Fullscreen) to **Format, Fullscreen, Copy, Clear**. Undo/redo/find rely on native browser/editor shortcuts instead of dedicated buttons.
- **States:** empty (placeholder shown) / filled / at-limit (Quick QR only, 2000 chars) / fullscreen (position: fixed, full viewport, same styling scaled up).

### 5.4 Dropzone (Large Transfer, File source, empty)

- Card primitive with `border: 1px dashed var(--line)` instead of solid.
- Centered content: file-up icon (26–32px), title (`--fs-body`, 650 weight), hint (`--fs-ui`, `--text-faint`), primary Button ("Choose file").
- **Hover/drag-over:** `border-color: var(--accent)`, `background: var(--surface-2)`.

### 5.5 File card (Large Transfer, File source, selected)

- Card primitive, horizontal layout: 52–56px thumbnail/icon box (`--surface-2`, `--r-control`) + filename (`--fs-body`, 650) + metadata (`--fs-data`, `--text-faint`) + Change (secondary Button) + Remove (icon button).

### 5.6 Summary grid

- CSS grid, `auto-fit, minmax(112px, 1fr)`, `gap: 1px` on a `--line-soft` background (creates hairline dividers), wrapped in `--r-card`.
- Each cell: `--fs-label` key (`--text-faint`) over `--fs-data` value (`--text-strong`), `padding: var(--sp-3) var(--sp-3)` (12px, snapped from the prototype's ad hoc `11px 13px`), `background: var(--surface)`.
- Fields: Characters/Filename, Original size, Transfer size, Compression ratio, QR frame count, Estimated loop time.

### 5.7 Notice / Error / Verified (3-level feedback)

All three share one shape — Card primitive + left accent bar + icon + title + body — but use
different fixed status tokens, never the accent:

| Level            | Background    | Border          | Left bar / icon color | Icon             |
| ---------------- | ------------- | --------------- | --------------------- | ---------------- |
| Notice           | `--warn-bg`   | `--warn-line`   | `--warn`              | `alert-triangle` |
| Error (blocking) | `--danger-bg` | `--danger-line` | `--danger`            | `octagon-alert`  |
| Verified         | `--ok-bg`     | `--ok-line`     | `--ok`                | `shield-check`   |

Structure: `display:flex; gap:var(--sp-3); padding:var(--sp-3) var(--sp-4); border-left:3px solid <status>; border-radius:var(--r-control)`
(the prototype's `11px`/`14px`/`12px` snap onto `--sp-3` (12px) / `--sp-4` (16px) / `--r-control` (10px)).
Title: `--fs-ui`, 700 weight, status color. Body: `--fs-ui-sm` (12.5px), `--text-muted`.

### 5.8 Optical stage — QR display

- Card primitive at `--r-stage`, centered content, fills the stage column height.
- **Empty:** dashed inner box (`1px dashed var(--line)`) with qr-code icon (38px) + placeholder text.
- **Ready:** white card (`--qr-paper`, `--qr-quiet` padding, `--r-card`, `--sh-qr`) containing the `<canvas>` QR at `min(46vh, 300px)`, caption below (`--fs-data`).
- **Preparing (Large Transfer):** spinner + label + Cancel, optional `SendingStrip` header. Occupies the stage, not the compose pane.
- **Looping (Large Transfer):** `SendingStrip` header (what is being sent), QR at `min(56dvh, 520px)` desktop / `min(48dvh, 100%)` mobile, frame counter caption ("4 / 14"), Slower/Faster, Fullscreen + Stop, one-line hint. The compose editor stays mounted but hidden.
- **Fullscreen:** `position: fixed; inset:0; z-index: var(--z-fullscreen)`, pure white background, QR scaled to `min(74vh,74vw)`, exit button top-right (dark pill, fixed).

### 5.9 Optical stage — Camera / scanner

- Card primitive at `--r-stage`.
- Camera picker `<select>` + torch icon button row on top.
- Viewfinder: dark radial-gradient background, centered square guide box `min(62%, 240px)` with 4 corner brackets (`3px solid var(--scan-guide)`, `26px` each corner), scan sweep line (disabled under reduced motion).
- Starting overlay: spinner + "Starting camera…" on scrim.
- Live badge: bottom-left pill, status dot + label ("live" / percentage while receiving).
- Hint text below the frame (`--fs-ui`, `--text-faint`).

### 5.10 Receive status panel

- Card primitive. Header row: status icon (color varies by state) + title + right-aligned meta (`--fs-data`).
- Body copy (`--fs-body`, `--text-muted`).
- **Progress sub-block** (receiving/assembling only): progress bar (8px, `--r-pill`, fill = `--accent`), frame count + transfer label row, collapsible "Missing frames" disclosure with Chip list (max-height 96px, internal scroll).
- States: idle → scanning → receiving → assembling → complete | error.

### 5.11 Result panel (Complete)

- Card primitive, `border-color: var(--ok-line)`.
- Header: "Verified" badge (`--ok`, shield-check icon) + metadata right.
- Body: scrollable content area (`--font-mono` for text results).
- Footer: primary action (Copy all / Download) + secondary (Scan another).

### 5.12 Settings sheet / dialog

- **Implemented as a native `<dialog>` element** (`showModal()`/`close()`) — not a styled `<div>`
  overlay. Native semantics (focus trap, Escape-to-close, focus restoration to the trigger) come
  for free from the element and must not be reimplemented in JS.
- **Desktop (≥900px):** centered modal, `max-width: 520px`, `--r-card`.
- **Mobile (<900px):** bottom sheet, `--r-sheet` (top corners only), `max-height: 88dvh`, safe-area bottom padding.
- Backdrop: `--overlay-scrim` + `--overlay-blur`.
- Content: title + close icon button, description, list of profile options (radio card — see 5.13), collapsible "Advanced" section with a range input (frame duration), footer with Reset + Done buttons.

### 5.13 Profile radio option

- Row: custom radio indicator (17px circle, `2px solid var(--line)`, filled dot in `--accent` when checked; active row border becomes `--accent`) + name/spec header row + description line.
- Spec shown in `--font-mono` (e.g. "300 ms · 550 B · EC M").

### 5.14 Mobile view switcher

- Fixed bottom bar, `--surface` background, `border-top: 1px solid var(--line-soft)`, safe-area bottom padding.
- Two equal-width buttons (icon + label), active state = `--surface-active` background + `--text-strong`.
- Only rendered below the desktop breakpoint **and** when the shell is in `split` layout. Hero layouts (Large Transfer send) have a single pane per phase, so the switcher is hidden.

### 5.15 Sending strip (Large Transfer send · preparing / looping)

- Dense row, not a nested Card: `StatusDot` + title (`--fs-ui`, `--text-strong`) + one `--fs-data` meta line (source · size · frames · profile), ellipsis on overflow.
- Sits at the top of the optical-stage card. Hidden in fullscreen. Not editable — Stop returns to compose-hero to change the payload.

---

## 6. Patterns

### 6.1 Two-pane app shell

Default layout (`split`) — Quick QR and Large Transfer receive:

```
┌─────────────────────────────────────────── header (60px) ───┐
│ logo · mode tabs                 send/receive · accent · EN · theme │
├───────────────────────────────┬─────────────────────────────┤
│                                │                              │
│  COMPOSE PANE (1.35fr)         │  OPTICAL STAGE (400–560px)   │
│  context label                 │  QR display / camera scanner │
│  editor or status / result      │                              │
│                                │                              │
└───────────────────────────────┴─────────────────────────────┘
```

Large Transfer send is sequential (`editing → preparing → transferring`), so it uses a **phase-aware
hero** instead of an empty second column:

```
compose-hero (editing)                    stage-hero (preparing / looping)
┌──────── compose max 720px ────────┐    ┌──────────── stage full width ────────────┐
│ context · source · editor/file     │    │ SendingStrip (name · size · frames)      │
│ summary (scrolls)                  │    │ QR large / preparing spinner             │
│ ── Settings + Start (pinned) ──    │    │ Slower/Faster · Fullscreen · Stop        │
└────────────────────────────────────┘    └──────────────────────────────────────────┘
```

Below 900px `split` collapses to a single column with the bottom view switcher (5.14). Hero
layouts have no switcher — the phase change _is_ the pane change. Neither pane ever requires
page-level scroll — only inner regions scroll (editor body, result body, missing-frames list).
Actions for the primary task stay in the viewport.

### 6.2 State-driven visibility, no routing

Quick QR and Large Transfer are two values of the same `mode` state; Send/Receive are two values
of `role`; each flow has its own discriminated-union `phase` (`editing → preparing → transferring`
for send — matches `SendFlow`; `idle → scanning → receiving → assembling → complete | error` for
receive — matches `useTransferScanner`). This app has **no router and no URL state** — `mode`,
`role`, and each flow's `phase` are plain React state on `App`/`LargeTransfer`, nothing is a deep
link. Content (draft text, selected file, chosen settings) persists across mode/role switches —
never reset it on navigation — because it lives in `LargeTransfer`'s state, not because it's
encoded anywhere externally.

### 6.3 Three-level feedback, never conflated

Always pick the right level for a message:

- **Can proceed, should know** → Notice (warn tokens).
- **Cannot proceed until fixed** → Error (danger tokens), and the blocking control (e.g. "Start
  transfer") must be visibly `disabled`.
- **Succeeded, confirm it** → Verified (ok tokens).

Never reuse `--danger` styling for both "your camera is blocked" (recoverable, show "Try again")
and "this sender is incompatible" (not recoverable, no retry button) — differ the action row, not
just the copy.

### 6.4 What persists vs. what's ephemeral

| Persisted (`src/store/preferences.ts`, Zustand `persist`, key `qr-transfer:prefs`) | Ephemeral React state, reset on reload                         |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Theme                                                                              | Current mode / role / phase                                    |
| Language                                                                           | Draft text, selected file                                      |
| Last-used transfer profile                                                         | Fullscreen / sheet-open flags                                  |
|                                                                                    | Accent (fixed to `piedra`, not user-configurable in this pass) |

Content (text, files, anything received) is **never** persisted, matching the app's no-content-
persistence rule — only these three UI preferences are.

---

## 7. Accessibility rules

- Color is never the only signal — every status state pairs its color with an icon and explicit
  text (progress bar always shows the frame count next to it, not just a color fill).
- Focus ring: `2px solid var(--accent)`, `2px` offset, on every focusable element including inside
  the settings sheet and the missing-frames chip list.
- The receive status block is `aria-live="polite"` so screen readers announce "61 of 96 frames",
  "verified", "could not be verified" without the user needing to poll it.
- `prefers-reduced-motion: reduce` disables: scan sweep, pulse dot, frame-accepted flash. It does
  **not** disable the animated QR loop (functional, not decorative).
- All touch targets ≥ 44×44px, including the view switcher and the loop speed buttons.
- The settings `<dialog>` keeps native focus trap + Escape-to-close + focus restoration to the
  triggering button.

---

## 8. File & implementation structure

Owned by [`frontend-architecture.md`](frontend-architecture.md) — the actual standard for CSS
Modules, the token file split, folder-per-primitive conventions, and where app-level components,
the preferences store, and `src/lib/theme/` live. This document defines _what_ to build; that one
defines _where it goes and how it's structured_. Execution order (which screen gets built when)
is owned by the [macro plan](specs/design-system-refactor/macro-plan.md), not this section.
