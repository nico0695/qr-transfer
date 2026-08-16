# Spec — Design System refactor (visual redesign)

Status: **approved for planning** — decisions below were settled in a grilling session on
2026-08-15. Execution plan: [`macro-plan.md`](./macro-plan.md).
Sources of truth: [`../../DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) (tokens, primitives,
components — to be corrected in Stage 0), the prototype `App.dc.html` (to be copied to
`docs/design/prototype/`), [`../../frontend-architecture.md`](../../frontend-architecture.md)
(file/CSS conventions), [`../../design/`](../../design/) (screenshot catalog of the current app).

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [User Stories](#user-stories)
- [Implementation Decisions](#implementation-decisions)
- [Testing Decisions](#testing-decisions)
- [Out of Scope](#out-of-scope)
- [Further Notes](#further-notes)

## Problem Statement

QR Transfer works, but its UI is a single ~1000-line global stylesheet with hand-typed class
names, no reusable component layer, no loading indicators, an unpolished light/dark theme and a
single-column layout that hides the QR below the fold on mobile and wastes width on desktop. A
designer produced a full redesign (dark-first, two-pane "compose ↔ optical stage" shell, one
accent, fixed status colors, editorial typography) documented in `DESIGN_SYSTEM.md` and a working
prototype. Nothing of it can be adopted incrementally on the current CSS structure without
creating two visual languages.

## Solution

Rebuild the front-end presentation layer in stages on a single feature branch, following the
design system: design tokens → primitives (with a dev-only demo page) → new app shell → screen by
screen (Quick QR, Large Transfer send, settings, Large Transfer receive) → persisted preferences
via a store → optional animation kit. The transfer/scan libraries (`src/lib/**`), the state
machines and the camera lifecycle are **not** touched. When the last stage lands, `src/styles.css`
is deleted and every screen matches the prototype in both themes.

## User Stories

1. As a user, I want the app to open in a dark, high-contrast theme by default (following my OS
   preference on first load), so that the QR on screen is the brightest thing in the room.
2. As a user, I want to switch to a light theme and have that choice remembered on reload, so I
   don't reset it every time.
3. As a user, I want my language choice remembered on reload, so the app opens in my language.
4. As a user on desktop, I want to see what I'm sending (or the receive status) on the left and
   the QR / camera on the right at the same time, without page scroll, so both devices can be
   aligned without scrolling.
5. As a user on mobile, I want a bottom switcher between "Content" and "QR/Camera" panes, so the
   QR fills the screen when the other device is scanning it.
6. As a user, I want Quick QR and Large Transfer to share the same header, the same Send/Receive
   switch and the same component set, so switching mode doesn't feel like a different app.
7. As a user, I want a one-line context label ("QUICK QR · SEND · UP TO 2,000 CHARACTERS") so I
   always know which mode/direction/limit I'm in.
8. As a user, I want notices, blocking errors and verified results to look different from each
   other (amber / red / green, with an icon), so I can tell "you should know" from "you can't
   proceed" from "done".
9. As a user, I want loading states (preparing frames, starting camera) to show a spinner, not
   just text.
10. As a user, I want the QR frame to keep full black-on-white contrast and quiet zone in both
    themes, so decoding never depends on my theme.
11. As a user in Large Transfer, I want the text editor to keep syntax highlighting (Markdown /
    JSON) and fullscreen, with a leaner toolbar (Format, Fullscreen, Copy, Clear) and keyboard
    shortcuts for undo/redo/find, so the toolbar is not cluttered.
12. As a user, I want the file dropzone and file card to look like the rest of the redesigned UI
    (dashed card, icon, primary "Choose file").
13. As a user, I want the transfer summary as a compact grid (chars/filename, original size,
    transfer size, compression, frames, loop time), so I read numbers at a glance.
14. As a user, I want the settings dialog to open as a centered modal on desktop and as a bottom
    sheet on small screens, keeping Escape/focus behavior, with a range slider for frame duration.
15. As a user receiving, I want a framed viewfinder with corner brackets and a "live" badge, a
    progress bar with frame counts, and a collapsible list of missing frames as chips.
16. As a user, I want the same viewfinder look whether the WASM or the fallback scan engine is
    running.
17. As a user, I want a verified result panel with a green "Verified" badge and clear primary
    (Copy all / Download) and secondary (Scan another) actions.
18. As a user with reduced-motion preference, I want decorative animations (scan sweep, pulse,
    frame flash, sheet transitions) disabled while the functional QR loop keeps running.
19. As a keyboard/screen-reader user, I want visible focus rings on every control, ≥44 px touch
    targets, and receive progress announced politely.
20. As a developer, I want a `?demo=primitives` page rendering every primitive in every
    variant/state and both themes, so visual review and screenshots are cheap.
21. As a developer, I want each stage to leave typecheck/lint/test/build green and the screenshot
    catalog regenerated for the touched module, so regressions are visible in diffs.
22. As a developer, I want the tokens, primitives, and component conventions documented in one
    corrected `DESIGN_SYSTEM.md` and one architecture doc, so future UI work has one source of
    truth.

## Implementation Decisions

**Scope and information architecture**

- Full redesign as prototyped: two-pane shell (`compose 1.35fr` / `stage 400–560px`) inside
  `100dvh`, no page scroll; single breakpoint at **900 px** (below: one column, bottom view
  switcher, settings as bottom sheet; above: two panes, centered modal). No 640/760 breakpoints.
- Quick QR loses its Generate/Scan tabs; **direction (Send/Receive) is a header segmented control
  shared by both modes**. `NavMenu`/`ModeTabs` are retired. No landing page; the app opens directly
  in the shell as today.
- No URL routing. Mode/direction/phase remain in-memory React state.
- Content (draft text, selected file, chosen settings) keeps surviving mode/direction switches.

**Tokens and theming**

- `DESIGN_SYSTEM.md` is corrected in place first (Stage 0) and becomes the single source of token
  truth. Corrections: every range token becomes one value; `--ease-*` split into `--duration-*` +
  `--easing-*`; breakpoint is a TS constant + literal `@media`, not a CSS variable;
  `color-scheme` added per theme; a `--focus-ring` token; `--cm-*` CodeMirror tokens added for
  both themes; DS token names win over the prototype's runtime names (`--danger`, `--ok`, `--warn`,
  `--surface-active`, `--warn-bg`…); segmented-control inactive text uses `--text-muted` (the
  `--text-faint` pairing fails AA); the primary button carries `1px solid var(--line)` in the light
  theme (accent fill fails 3:1 there); shadow tokens get light/dark values; a changelog is
  prepended.
- Dark palette on bare `:root`, light under `:root[data-theme='light']`. A tiny inline script in
  `index.html` sets `data-theme` before first paint (no flash). `App` keeps writing `data-theme`.
- **One fixed accent**: `piedra #AAAAAD` (+ `--accent-hover`, `--accent-soft`, `--accent-line`,
  computed `--on-accent`). No accent picker in the product; the swatch group from the prototype is
  not built.
- Token files: `src/styles/tokens/{colors,typography,spacing,radius,shadows,motion,z}.css`,
  `src/styles/base.css`, `src/styles/layout.css`, imported by `src/styles/index.css` (per
  `frontend-architecture.md`).

**Typography and icons**

- UI font **Inter variable** and data font **JetBrains Mono variable**, self-hosted via
  `@fontsource-variable/*` (OFL). Satoshi is not shipped (its license forbids self-hosting;
  loading it remotely breaks the offline requirement). No Google Fonts links.
- Icons: **`lucide-react`** with named imports (~28 icons from the prototype inventory). No
  `iconify-icon`, no runtime icon fetch.

**Styling and components**

- CSS Modules per component (`Component.module.css`), plus tokens as global custom properties.
  Folder-per-component under `src/components/primitives/<Name>/` and, for redesigned screens,
  `src/components/app/<Name>/` (`Name.tsx`, `Name.module.css`, `index.ts`, optional
  `.interface.ts`/`.constants.ts`/`.utils.ts`, nested `components/` for subcomponents).
- Primitives (12): `Button` (primary/secondary/destructive, sizes, icon-only), `IconButton` folded
  into Button, `Input` (textarea/select/range surfaces), `SegmentedControl`, `Tabs`, `StatusDot`,
  `Chip`, `Card`, `Icon` (thin wrapper over lucide with size tokens), `Feedback` (notice / error /
  verified), `Dialog` (native `<dialog>`, modal ↔ sheet by breakpoint), `ProgressBar`, `Spinner`.
  No `Skeleton`.
- Existing feature components are rewritten into `components/app/` as each screen stage lands
  (`AppHeader`, `ContextLabel`, `TextEditor` (CodeMirror), `Dropzone`, `FileCard`, `SummaryGrid`,
  `OpticalStage/{QrDisplay,CameraScanner}`, `ReceiveStatusPanel`, `ResultPanel`,
  `SettingsSheet`, `ProfileOption`, `MobileViewSwitcher`). Hooks (`useTransferScanner`,
  `usePreparedPayload`, `useFrameLoop`) and `src/lib/**` are reused unchanged.
- **CodeMirror 6 stays** as the Large Transfer editor, re-themed through `--cm-*` tokens; the
  toolbar shrinks to Format / Fullscreen / Copy / Clear; the search keymap (Cmd/Ctrl-F) stays
  enabled and line wrap is on by default. Quick QR keeps a plain textarea.
- Settings uses the native `<dialog>` (focus trap, Escape, focus restore); bottom-sheet look is
  CSS only. Frame duration becomes a range input snapping to the existing presets.
- Both scan engines share one viewfinder chrome (corner brackets, sweep line, live badge, hint).
- A dev-only **`?demo=primitives`** page (same query-param pattern as `?debug=1`, excluded from
  the main bundle via lazy import) renders every primitive × variant × state × theme.

**Preferences**

- Persist theme, language and preferred transfer profile through a **Zustand** store with the
  `persist` middleware, one key `qr-transfer:prefs`, in `src/store/preferences.ts`. It replaces
  `settingsStorage.ts`. It never stores content. `CLAUDE.md` is updated accordingly.

**Motion**

- Primitives ship native CSS motion (spin, pulse, sweep, hover/press transitions, `@starting-style`
  for dialog enter) using the motion tokens and honoring `prefers-reduced-motion`.
- A late, opt-in **animation kit** on `motion` (`motion/react`, formerly framer-motion):
  `src/lib/motion/` exposes presets (`fadeSlideUp`, `sheetEnter`, `paneSwitch`, `staggerList`,
  `presence`) that app components adopt for pane switching, sheet enter/exit, feedback presence
  and summary-grid stagger. `frontend-architecture.md` is amended: "CSS for micro-interactions,
  `motion` for layout/presence transitions".

**Docs**

- `frontend-architecture.md`: replace "native CSS only" and "incremental migration" wording with
  the decisions above; add `components/app/`, `src/store/`, `src/lib/motion/`; add the demo page.
- `CLAUDE.md`: Styling section points to the corrected DS + architecture doc; persistence rule
  reworded; Quick QR IA change; breakpoint 900.
- `docs/design/prototype/`: `App.dc.html` + `support.js` + README ("visual reference; do not copy
  code; loads remote fonts/icons and is not offline-safe").
- Screenshot catalog regenerated per stage; a `05-primitives` module is added.

## Testing Decisions

- Seams (highest possible, all existing):
  1. **Repo checks** — `npm run typecheck`, `lint`, `test`, `build`, `prettier --check .` after
     every stage. `react-refresh/only-export-components` still enforced.
  2. **Screenshot catalog** — `npm run screenshots -- --only <module>` after each screen stage and
     a full run at the end; diffs under `docs/design/screens/` are the visual regression record.
     New module `05-primitives` captures `?demo=primitives` in both themes and viewports.
  3. **Unit tests** (Vitest, node): pure helpers only — `src/lib/theme/*` (`bestOnColor`, palette
     application), preferences store reducers/migration (`src/store/preferences.test.ts` with a
     mocked storage), any `.utils.ts` in primitives (e.g. class-name/variant mapping). Prior art:
     `src/lib/camera.test.ts`, `src/lib/transfer/*.test.ts`.
  4. **Manual camera regression** on a phone at the end of Stage 7 (receive): start/stop, switch
     tab mid-scan, permission denied, engine fallback (`?scanner=legacy`), fullscreen loop.
- Good tests assert external behavior (rendered class/variant, persisted JSON shape, contrast
  helper output), never internal structure. No DOM component tests are added (no jsdom today);
  the demo page + screenshots cover visual behavior.

## Out of Scope

- Landing/marketing page (`Landing.dc.html`) and PR 08 of the redesign doc.
- URL routing / deep links of any kind.
- Accent picker (product feature) and torch/flashlight control (prototype handler is a no-op; not
  supported on iOS Safari). Both are listed as optional follow-ups in the macro plan.
- Satoshi font (license) and any remote font/icon loading.
- Skeleton primitive.
- Any change to `src/lib/transfer/**`, `src/lib/scan/**`, protocol, profiles, state machines,
  camera lifecycle, i18n mechanism.
- Storybook or any component-library dependency (Radix stays a per-primitive exception, currently
  unused).

## Further Notes

- The prototype's inline `var(--x, fallback)` literals are stale (coral accent, four values for
  `--surface-2`); only its `PALETTES` JS object matches the DS. Never copy inline values from it.
- Contrast facts (computed): text-on-accent passes for `piedra` (8.8:1); accent-as-fill fails
  3:1 on light surfaces (2.3:1) → border rule above; `--text-faint` on `--surface-2` is 3.2–3.4:1
  → not used for interactive text.
- New i18n keys expected: ~15–20 (context label templates, view switcher, live badge, empty stage,
  demo page is exempt like `?debug=1`).
