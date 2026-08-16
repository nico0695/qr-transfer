# QR Transfer — Design System

> Scope: **App only** — Quick QR and Large Transfer (send + receive). Excludes the marketing
> landing page. Everything here is grounded in the working prototype (`App.dc.html`) and is meant
> to be copied 1:1 into the production codebase.

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

| Token             | Dark       | Light      | Usage                                      |
| ------------------ | ---------- | ---------- | ------------------------------------------- |
| `--bg`             | `#050505`  | `#F4F3F0`  | App background                              |
| `--surface`        | `#111111`  | `#FFFFFF`  | Cards, panels, editor body                  |
| `--surface-2`      | `#161616`  | `#FAF9F6`  | Nested surfaces (toolbar, input fill, chip) |
| `--surface-active`  | `#242424`  | `#EFEDE7`  | Selected segment / active tab background    |
| `--line`           | `#333333`  | `#DEDCD6`  | Default borders (buttons, inputs, dialogs)  |
| `--line-soft`      | `#222222`  | `#E8E6E1`  | Low-emphasis dividers, card borders         |
| `--text-strong`    | `#FFFFFF`  | `#050505`  | Headings, primary values                    |
| `--text`           | `#EBEBEB`  | `#1A1917`  | Body text                                   |
| `--text-muted`     | `#888888`  | `#5C5A55`  | Secondary text, descriptions                |
| `--text-faint`     | `#666666`  | `#8A8780`  | Micro-labels, placeholders, metadata        |

#### Accent (swappable — see [§3](#3-theming))

| Token             | Value (current pick: **Gris piedra**) | Usage                                            |
| ------------------ | -------------------------------------- | ------------------------------------------------- |
| `--accent`         | `#AAAAAD`                              | Primary buttons, active tab underline, links, QR-scan guide corners |
| `--accent-hover`   | `#8F8F92`                              | Hover/active state of accent-colored controls     |
| `--accent-soft`    | `rgba(170,170,173,0.12)`               | Tinted backgrounds (rare — prefer neutral surfaces) |
| `--accent-line`    | `rgba(170,170,173,0.40)`               | Tinted borders                                    |
| `--on-accent`      | *(computed, see below)*                | Text/icon color drawn on top of `--accent`        |

`--on-accent` is **not a fixed hex** — it must be computed per accent color so text stays
readable regardless of which accent is active:

```js
function relativeLuminance(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) / 255);
  const f = v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function bestOnColor(hex) {
  const L = relativeLuminance(hex);
  const blackRatio = (L + 0.05) / 0.05;
  const whiteRatio = 1.05 / (L + 0.05);
  return blackRatio >= whiteRatio ? '#050505' : '#FFFFFF';
}
```

Run this once when the accent is set (theme init, or user picks a new accent) and write the result
to `--on-accent`. Never hardcode `color: #050505` on an accent-filled element — always
`color: var(--on-accent)`.

#### Status (fixed — never follow the accent)

| Token           | Dark                     | Light                     | Usage                                   |
| --------------- | ------------------------ | -------------------------- | ---------------------------------------- |
| `--ok`          | `#4ADE80`                | `#15803D`                  | Verified checksum, success confirmation  |
| `--ok-bg`       | `rgba(74,222,128,0.07)`  | `rgba(21,128,61,0.06)`     | Verified panel background                |
| `--ok-line`     | `rgba(74,222,128,0.30)`  | `rgba(21,128,61,0.28)`     | Verified panel border                    |
| `--warn`        | `#FBBF24`                | `#A16207`                  | Informational notice (large transfer)    |
| `--warn-bg`     | `rgba(251,191,36,0.07)`  | `rgba(161,98,7,0.06)`      | Notice background                        |
| `--warn-line`   | `rgba(251,191,36,0.28)`  | `rgba(161,98,7,0.22)`      | Notice border                            |
| `--danger`      | `#F87171`                | `#B91C1C`                  | Blocking error, camera/verification fail |
| `--danger-bg`   | `rgba(248,113,113,0.10)` | `rgba(185,28,28,0.06)`     | Error background                         |
| `--danger-line` | `rgba(248,113,113,0.30)` | `rgba(185,28,28,0.22)`     | Error border                             |

#### Optical channel (fixed in both themes — never tokenized by theme)

| Token           | Value       | Usage                                           |
| --------------- | ----------- | ------------------------------------------------ |
| `--qr-ink`      | `#050505`   | QR code foreground modules                       |
| `--qr-paper`    | `#FFFFFF`   | QR code background + quiet zone                  |
| `--qr-quiet`    | `14px`      | Minimum quiet zone around every rendered code     |
| `--scan-guide`  | `var(--accent)` | Viewfinder corner brackets, sweep line       |
| `--scan-mask`   | `rgba(5,5,5,0.55)` | Dimmed area outside the viewfinder frame   |

#### Contrast reference (current pick, dark theme)

| Pair                                         | Ratio    | Level     |
| --------------------------------------------- | -------- | --------- |
| `--text-strong` on `--bg`                     | 20.4 : 1 | AAA       |
| `--text` on `--surface`                       | 15.1 : 1 | AAA       |
| `--text-muted` on `--surface`                 | 5.3 : 1  | AA        |
| `--text-faint` on `--bg` (micro-labels only)  | 3.6 : 1  | AA-large  |
| computed `--on-accent` on `--accent`          | ≥ 4.5 : 1 (enforced by `bestOnColor`) | AA |
| `--qr-ink` on `--qr-paper`                    | 20.6 : 1 | AAA       |

### 2.2 Typography

| Token           | Family                          | Usage                                             |
| --------------- | -------------------------------- | --------------------------------------------------- |
| `--font-ui`     | `'Satoshi', 'Inter', sans-serif` | All UI text — headings, labels, body, buttons       |
| `--font-mono`   | `'JetBrains Mono', monospace`    | Anything that is *data*: counters, byte sizes, frame counts, checksums, the large-text editor body |

Load Satoshi as a variable font (weight 300–900); fall back to Inter, then system sans. Load
JetBrains Mono at 400/500.

#### Type scale

| Token          | Size / line-height / tracking      | Weight | Usage                                    |
| -------------- | ----------------------------------- | ------ | ------------------------------------------ |
| `--fs-h1`      | 34px / 1.05 / -0.035em              | 650    | Page/section titles (settings dialog title, result heading) |
| `--fs-h2`      | 20px / 1.2 / -0.025em               | 700    | Dialog headings, error headings          |
| `--fs-body`    | 14px / 1.6 / 0                      | 400    | Descriptions, hints, paragraph copy      |
| `--fs-ui`      | 12.5–13.5px / 1.2 / 0               | 600–750| Buttons, tabs, segmented controls, inputs |
| `--fs-label`   | 10px / 1.2 / 0.2em, uppercase       | 800    | Micro-labels, section eyebrows, badges   |
| `--fs-data`    | 11–13px, monospace                  | 400–500| Counters, KB/MB, frame index, checksums, editor body |

Minimum interactive text size: **12.5px**. Never go smaller for anything clickable.

### 2.3 Spacing

4px base unit. Use the scale, never an arbitrary value.

| Token      | Value | Typical usage                                |
| ---------- | ----- | ---------------------------------------------- |
| `--sp-1`   | 4px   | Icon-to-label gap, tight chip padding          |
| `--sp-2`   | 8px   | Control internal gaps, small stacks            |
| `--sp-3`   | 12px  | Card internal padding (dense), row gaps        |
| `--sp-4`   | 16px  | Standard card padding, panel gaps              |
| `--sp-5`   | 20px  | Section padding (mobile)                       |
| `--sp-6`   | 24px  | Section padding (desktop), dialog padding      |
| `--sp-8`   | 32px  | Large vertical rhythm between blocks           |
| `--sp-10`  | 40px  | Rare — hero-scale spacing only                 |

Layout constants (not on the 4px scale, but fixed):

| Token                | Value  | Usage                                  |
| -------------------- | ------ | ---------------------------------------- |
| `--header-height`    | 60px   | App header                               |
| `--panel-gap`        | 16px   | Gap between compose pane and optical stage |
| `--content-max`      | 1320px | Max width of the two-pane layout, centered |
| `--stage-max`        | 560px  | Max width of the optical stage column    |

### 2.4 Radius

| Token          | Value  | Usage                                          |
| -------------- | ------ | ------------------------------------------------ |
| `--r-control`  | 10–12px| Buttons, inputs, selects, chips                  |
| `--r-card`     | 16–18px| Cards, summary grid cells, notices               |
| `--r-stage`    | 22px   | Optical stage container (QR / camera panel)      |
| `--r-sheet`    | 24px (top corners only) | Bottom sheet (settings on mobile)   |
| `--r-pill`     | 999px  | Segmented control track, status dot, badges      |

### 2.5 Shadows & elevation

| Token         | Value                                | Usage                          |
| ------------- | -------------------------------------- | -------------------------------- |
| `--sh-qr`     | `0 24px 60px rgba(0,0,0,0.45)`         | The QR card, always elevated     |
| `--sh-sheet`  | `0 -20px 60px rgba(0,0,0,0.50)`        | Bottom sheet / dialog             |
| `--overlay-blur` | `6px`                                | Backdrop blur behind dialogs/sheets |
| `--overlay-scrim` | `rgba(5,5,5,0.72)`                  | Backdrop color behind dialogs/sheets |

No card elevation beyond a 1px `--line-soft` border in the default state — shadows are reserved
for things that float above the layout (QR card, sheet, fullscreen exit button).

### 2.6 Motion

| Token              | Value              | Usage                                       |
| ------------------ | -------------------- | ---------------------------------------------- |
| `--ease-base`      | `200ms ease`          | Hover/active transitions, tab underline        |
| `--ease-sheet`      | `280ms ease-out`      | Sheet/dialog enter                             |
| `--anim-scan-sweep` | `2.4s linear infinite`| Camera viewfinder scan line                    |
| `--anim-pulse`      | `2s ease-in-out infinite` | Live/status pulse dot                       |
| `--anim-spin`       | `0.8s linear infinite`| Loading spinners (preparing, starting camera)  |

**`prefers-reduced-motion: reduce`** must disable: the scan sweep, the pulse dot, and the
frame-accepted flash (`.scan-guide-hit`, 700ms). The animated QR loop itself is **not** disabled —
it is functional, not decorative.

### 2.7 Breakpoints & layout

| Breakpoint      | Range        | Layout                                                                 |
| ---------------- | ------------ | ------------------------------------------------------------------------ |
| `--bp-mobile`    | < 640px      | Single column. Bottom view-switcher (Content ↔ Stage). Sheet has safe-area padding. |
| `--bp-tablet`    | 640–899px    | Still switcher-based; compose pane widens, summary grid goes to 3 columns. |
| `--bp-desktop`   | ≥ 900px      | Two fixed columns (`1.35fr` compose / `400–560px` stage) inside `100dvh`, no page scroll. |

Container: `max-width: var(--content-max)`, centered, `padding-inline: 20px` (mobile) /
`24px` (desktop).

### 2.8 Z-index scale

| Token          | Value | Usage                    |
| -------------- | ----- | -------------------------- |
| `--z-header`   | 10    | Sticky app header         |
| `--z-sheet`    | 200   | Settings dialog / bottom sheet |
| `--z-fullscreen` | 300 | Fullscreen QR overlay      |

---

## 3. Theming

Two independent axes, both persisted to `localStorage` and both readable from the URL for deep
links / QA:

- **Theme**: `data-theme="dark" | "light"` on `<html>`. Falls back to
  `prefers-color-scheme` on first load only.
- **Accent**: one key from the accent palette below, applied by setting `--accent`,
  `--accent-hover`, `--accent-soft`, `--accent-line`, and computed `--on-accent`.

### Accent palette (curated options)

| Key        | Name          | Hex       | Notes                                                        |
| ---------- | ------------- | --------- | -------------------------------------------------------------- |
| `celeste`  | Celeste        | `#B5D3E7` | Palest, most neutral option                                    |
| `bosque`   | Verde bosque   | `#248C54` | ⚠️ Sits close to `--ok` green — avoid if status color confusion is a concern |
| `lago`     | Azul lago      | `#90C0DF` | Mid-saturation blue                                             |
| **`piedra`** | **Gris piedra** | **`#AAAAAD`** | **Current pick.** Neutral, nearly desaturated — accent recedes into the UI rather than shouting |
| `hueso`    | Hueso          | `#DFDEDD` | Lightest, warm-neutral option                                   |

Adding a new accent = adding one entry to this table + running `bestOnColor()` once to confirm its
computed `--on-accent`. No other token or component changes.

```css
:root {
  --accent: #AAAAAD;
  --accent-hover: #8F8F92;
  --accent-soft: rgba(170, 170, 173, 0.12);
  --accent-line: rgba(170, 170, 173, 0.40);
  --on-accent: #050505; /* computed via bestOnColor('#AAAAAD') */
}
```

---

## 4. Primitives

Lowest-level building blocks. Everything in [§5](#5-components) is composed from these.

### 4.1 Button

- Height: `42px` (primary actions), `38px` (secondary contexts like error retry), `34px` (icon-only, header).
- Radius: `--r-control`.
- Padding: `0 16–18px` (has label), `0` centered (icon-only, fixed width = height).
- Font: `--fs-ui`, weight 650–750.
- Variants:
  - **Primary** — `background: var(--accent)`, `color: var(--on-accent)`, no border.
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
- Segment (inactive): `background: transparent`, `color: var(--text-faint)`.
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

- Source: Lucide icon set via `iconify-icon`.
- Standard sizes: `14px` (inline with 12–13px text), `16–17px` (buttons, list items), `22–26px` (empty states, error badges).
- Color: inherits `currentColor` — never hardcode an icon fill.

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
- Body: `<textarea>`, `--font-mono`, `--fs-data` size, no visible border, fills available height.
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
- Each cell: `--fs-label` key (`--text-faint`) over `--fs-data` value (`--text-strong`), `padding: 11px 13px`, `background: var(--surface)`.
- Fields: Characters/Filename, Original size, Transfer size, Compression ratio, QR frame count, Estimated loop time.

### 5.7 Notice / Error / Verified (3-level feedback)

All three share one shape — Card primitive + left accent bar + icon + title + body — but use
different fixed status tokens, never the accent:

| Level        | Background     | Border          | Left bar / icon color | Icon             |
| ------------ | -------------- | ----------------- | ---------------------- | ------------------ |
| Notice       | `--warn-bg`    | `--warn-line`     | `--warn`                | `alert-triangle`    |
| Error (blocking) | `--danger-bg` | `--danger-line`  | `--danger`               | `octagon-alert`      |
| Verified     | `--ok-bg`      | `--ok-line`       | `--ok`                   | `shield-check`        |

Structure: `display:flex; gap:11px; padding:12px 14px; border-left:3px solid <status>; border-radius:12px`.
Title: `--fs-ui`, 750 weight, status color. Body: `--fs-ui` (12px), `--text-muted`.

### 5.8 Optical stage — QR display

- Card primitive at `--r-stage`, centered content, fills the stage column height.
- **Empty:** dashed inner box (`1px dashed var(--line)`) with qr-code icon (38px) + placeholder text.
- **Ready:** white card (`--qr-paper`, `--qr-quiet` padding, `--r-card`, `--sh-qr`) containing the `<canvas>` QR at `min(46vh, 300px)`, caption below (`--fs-data`).
- **Looping (Large Transfer):** adds frame counter caption ("4 / 14"), Slower/Faster button row, Fullscreen + Stop button row, hint text.
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

- Native `<dialog>` semantics (focus trap, Escape-to-close, focus restoration).
- **Desktop (≥760px):** centered modal, `max-width: 520px`, `--r-card`.
- **Mobile (<760px):** bottom sheet, `--r-sheet` (top corners only), `max-height: 88dvh`, safe-area bottom padding.
- Backdrop: `--overlay-scrim` + `--overlay-blur`.
- Content: title + close icon button, description, list of profile options (radio card — see 5.13), collapsible "Advanced" section with a range input (frame duration), footer with Reset + Done buttons.

### 5.13 Profile radio option

- Row: custom radio indicator (17px circle, `2px solid var(--line)`, filled dot in `--accent` when checked; active row border becomes `--accent`) + name/spec header row + description line.
- Spec shown in `--font-mono` (e.g. "300 ms · 550 B · EC M").

### 5.14 Mobile view switcher

- Fixed bottom bar, `--surface` background, `border-top: 1px solid var(--line-soft)`, safe-area bottom padding.
- Two equal-width buttons (icon + label), active state = `--surface-active` background + `--text-strong`.
- Only rendered below the desktop breakpoint; swaps between Compose and Stage panes since both can't fit on screen at once.

---

## 6. Patterns

### 6.1 Two-pane app shell

```
┌─────────────────────────────────────────── header (60px) ───┐
│ logo · mode tabs                 send/receive · accent · EN · theme │
├───────────────────────────────┬─────────────────────────────┤
│                                │                              │
│  COMPOSE PANE (1.35fr)         │  OPTICAL STAGE (400–560px)   │
│  context label                 │  QR display / camera scanner │
│  editor or dropzone/file card   │                              │
│  notice/error (conditional)     │                              │
│  summary grid (conditional)     │                              │
│  primary action row             │                              │
│                                │                              │
└───────────────────────────────┴─────────────────────────────┘
```

Below 640px this collapses to a single column with the bottom view switcher (5.14) toggling which
pane is visible. Neither pane ever requires page-level scroll — only their own internal content
scrolls (editor textarea, result body, missing-frames list).

### 6.2 State-driven visibility, not route changes

Quick QR and Large Transfer are two values of the same `mode` state; Send/Receive are two values
of `role`; each flow has its own `phase` enum (`editing → preparing → transferring` for send,
`idle → scanning → receiving → assembling → complete | error` for receive). Encode all three in
the URL query string so every screen is a deep link (`?mode=large&role=receive&phase=receiving`).
Content (draft text, selected file, chosen settings) persists across mode/role switches — never
reset it on navigation.

### 6.3 Three-level feedback, never conflated

Always pick the right level for a message:
- **Can proceed, should know** → Notice (warn tokens).
- **Cannot proceed until fixed** → Error (danger tokens), and the blocking control (e.g. "Start
  transfer") must be visibly `disabled`.
- **Succeeded, confirm it** → Verified (ok tokens).

Never reuse `--danger` styling for both "your camera is blocked" (recoverable, show "Try again")
and "this sender is incompatible" (not recoverable, no retry button) — differ the action row, not
just the copy.

### 6.4 Persisted preferences vs. URL state

| Persisted to `localStorage`   | Carried in the URL only          |
| ------------------------------- | ----------------------------------- |
| Theme                          | Current mode / role / phase        |
| Language                       | Content-dependent demo flags (file type, size tier) |
| Accent choice                  | Fullscreen / sheet-open flags      |
| Last-used transfer profile     |                                      |

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

Suggested source layout when implementing this system for real (framework-agnostic; adjust paths
to your stack):

```
src/
  styles/
    tokens.css          # §2 — all custom properties, :root + [data-theme="light"]
    tokens.accent.ts     # §3 — accent palette map + bestOnColor()
  components/
    primitives/          # §4
      Button.*
      Input.*            # textarea, select wrappers
      SegmentedControl.*
      Tab.*
      StatusDot.*
      Chip.*
      Card.*
      Icon.*
    app/                  # §5, App-scoped components
      AppHeader.*
      ContextLabel.*
      TextEditor.*        # Quick QR + Large Transfer text source
      Dropzone.*
      FileCard.*
      SummaryGrid.*
      Feedback.*           # Notice / Error / Verified — one component, `level` prop
      OpticalStage/
        QrDisplay.*
        CameraScanner.*
      ReceiveStatusPanel.*
      ResultPanel.*
      SettingsSheet.*
      ProfileOption.*
      MobileViewSwitcher.*
  hooks/ (or equivalent)
    useAppRoute.*          # mode/role/phase <-> URL query string
    useTheme.*              # theme + accent, localStorage-backed
```

**Do not** create a landing-specific token file or component — this document intentionally excludes
the marketing page. Anything under `components/app/` should have zero dependency on landing-only
copy or layout.

**Implementation order** (matches the PR breakdown from the visual redesign doc): tokens → routing
→ shell/header → Quick QR → Large Transfer send → settings → Large Transfer receive.
