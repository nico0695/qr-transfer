# App Shell

> The header, layout and responsive rules every screen in the app sits inside. Rebuilt in Stage 4
> of the [design-system refactor](../../specs/design-system-refactor/macro-plan.md). Source:
> `src/App.tsx`, `src/components/app/{AppHeader,AppShell,ContextLabel,MobileViewSwitcher}/`,
> `src/styles/layout.css`.

## Table of Contents

- [Structure](#structure)
- [States](#states)
- [Responsive rules](#responsive-rules)
- [Copy inventory](#copy-inventory)

## Structure

Every screen shares one shell (docs/DESIGN_SYSTEM.md §5.1, §5.2, §5.14, §6.1):

1. **`AppHeader`** — a visually-hidden `<h1>QR Transfer</h1>` (a11y only, no visible title), a
   `Tabs` row switching `mode` (Quick QR / Large Transfer), a `SegmentedControl` switching `role`
   (Send / Receive) — **shared by both modes**, not a per-mode control — and theme/language
   toggle buttons. Wraps onto a second row below 900px instead of overflowing.
2. **`AppShell`** — `100dvh`, no page scroll. A `compose` pane (1.35fr) and a `stage` pane
   (`minmax(400px, var(--stage-max))`) side by side at ≥900px; below that, only one pane is
   visible at a time, toggled by `MobileViewSwitcher` (fixed bottom bar, safe-area padding).
   `ContextLabel` (a live-status dot + mode · role · constraint, uppercase micro-label) sits at
   the top of the compose pane.
3. **Screen content** — for now, Quick QR and Large Transfer render entirely inside the `compose`
   pane, unchanged from before this stage; the `stage` pane is empty. Stages 5–8 split each
   screen's own QR-display/camera portion into `stage`.

There is no routing anywhere in the app: `mode`, `role`, `view` (mobile pane) and theme/language
are all React state / the `preferences` store (Stage 3). A reload always lands on Quick QR → Send.

`role` replaces two things that used to be independent: Quick QR's Generate/Scan tabs and Large
Transfer's own internal Send/Receive tabs. Toggling it now drives both — `role=send` → Generate
(Quick QR) / SendFlow (Large Transfer); `role=receive` → Scan / TransferScanner.

## States

| State                         | Desktop                                                               | Mobile                                                               |
| ----------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Home (Quick QR → Send, empty) | ![](../screens/00-app-shell/01-home.desktop.light.png)                | ![](../screens/00-app-shell/01-home.mobile.light.png)                |
| Home — dark                   | ![](../screens/00-app-shell/01-home.desktop.dark.png)                 | ![](../screens/00-app-shell/01-home.mobile.dark.png)                 |
| Header (cropped)              | ![](../screens/00-app-shell/02-header-and-nav.desktop.light.png)      | ![](../screens/00-app-shell/02-header-and-nav.mobile.light.png)      |
| Large Transfer home           | ![](../screens/00-app-shell/03-large-transfer-home.desktop.light.png) | ![](../screens/00-app-shell/03-large-transfer-home.mobile.light.png) |
| Large Transfer home — dark    | ![](../screens/00-app-shell/03-large-transfer-home.desktop.dark.png)  | ![](../screens/00-app-shell/03-large-transfer-home.mobile.dark.png)  |

## Responsive rules

Single breakpoint at **900px** (`BREAKPOINT_DESKTOP`, `src/lib/theme/breakpoints.ts` —
docs/DESIGN_SYSTEM.md §2.7, superseding the old 760px/three-tier scheme):

- Below 900px: `AppHeader` wraps onto two rows (mode tabs, then role control + theme/language);
  `AppShell`'s body collapses to one column and `MobileViewSwitcher` appears, toggling which of
  `compose`/`stage` is visible — both stay mounted, only visibility changes, so in-progress camera
  or editor state in either pane survives switching.
- At 900px and above: `AppHeader` is a single fixed-height row; `AppShell`'s body is the two-column
  grid (`1.35fr` / `minmax(400px, var(--stage-max))`), both panes visible simultaneously, and
  `MobileViewSwitcher` is hidden.
- No page-level scroll at any width ≥360px in either state — verified via
  `document.documentElement.scrollHeight === window.innerHeight` at 1280×800 and 390×844.
  Screens not yet restyled (all of them, until Stage 5) may still overflow their own `compose`
  pane, which scrolls internally rather than the page.

## Copy inventory

| Key                              | English                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `navQuick` / `navLarge`          | Quick QR / Large Transfer (mode tabs)                            |
| `ctxQuick` / `ctxLarge`          | Quick QR / Large Transfer (context label)                        |
| `roleSend` / `roleReceive`       | Send / Receive (shared role control + context label)             |
| `limitChars(n)`                  | Up to {n} characters (context label constraint, Quick QR · Send) |
| `viewCompose` / `viewStage`      | Content / Stage (mobile view switcher labels)                    |
| `switchToDark` / `switchToLight` | Switch to dark mode / Switch to light mode (aria-label only)     |
