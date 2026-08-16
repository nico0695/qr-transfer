# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

QR Transfer: static SPA (Vite + React 19 + strict TypeScript + plain CSS) that transfers text and
files between devices optically (screen → camera). No backend, no network requests, no content
persistence — by design. Persistence is UI preferences only — theme, language, last-used transfer
profile — **never** text, files or received content. Today that's
`src/lib/settingsStorage.ts` (`localStorage`); the design-system refactor
([`docs/specs/design-system-refactor/`](docs/specs/design-system-refactor/)) moves it to a single
Zustand `persist` store, `src/store/preferences.ts` (key `qr-transfer:prefs`), which is the only
thing allowed to touch `localStorage` once that lands. Docs live in `docs/`
(`technical-overview.md`, `qr-transfer-flow.md`, `large-transfer.md`, `frontend-architecture.md`,
`DESIGN_SYSTEM.md`, `specs/design-system-refactor/`).

## Commands

```bash
npm run dev            # Vite dev server (http://localhost:5173)
npm run build          # tsc -b && vite build → dist/
npm run typecheck      # tsc -b (strict, noUnusedLocals/Parameters)
npm run lint           # eslint . (flat config, react-hooks + react-refresh rules)
npm run format:check   # prettier (semi: false, singleQuote, printWidth 100)
npm test               # vitest run — src/**/*.test.ts, node environment
npx vitest run src/lib/transfer/protocol.test.ts        # single file
npx vitest run -t "deduplicates"                        # single test by name
```

Before finishing a change run typecheck, lint, test, build and `prettier --check .`.
`react-refresh/only-export-components` is enforced: hooks/helpers must not live in a `.tsx` file
that also exports a component (see `usePreparedPayload.ts` next to `SendFlow.tsx`).

## Architecture

Two sections chosen by a navbar in `App.tsx` (`NavMenu`): **Quick QR** (tabs Generate/Scan —
`QRGenerator`, `QRScanner`) and **Large Transfer** (`components/large-transfer/`, lazy-loaded).
`App` owns section/mode/theme/lang; strings come from the typed es/en dictionary in `src/i18n.ts`
via `useI18n()` — every user-visible string must be added to **both** `en` and `es` (the `es`
object is typed as `Messages`, so TS flags omissions). The design-system refactor's Stage 4
replaces the Generate/Scan tabs with a Send/Receive segmented control shared by both sections (a
`role` state, not a mode-specific tab set) — see `DESIGN_SYSTEM.md` §5.1 and the macro plan.

### Large Transfer

Pipeline: text → UTF-8 / file → bytes → `preparePayload` (gzip via native `CompressionStream`,
kept only if it saves ≥ 2 %; full SHA-256 of the original) → `buildTransfer` (byte chunks at the
profile's chunk size → header + data frames) → pre-rendered PNG data URLs → animated loop; the
receiver scans continuously, rebuilds, restores compression and verifies size + SHA-256 before
showing/downloading anything. Sources: **Text** or **one File** (`SourceSelector`), same pipeline.

- **`src/lib/transfer/`** is pure TypeScript over `Uint8Array` with no React imports — keep it that
  way (it runs in Vitest under Node and could move to a Web Worker). Modules: `encoding`
  (UTF-8/Base64URL), `compression` (`chooseCompression`/`restore`), `chunking`, `checksum` (full
  SHA-256), `protocol` (`encodeFrame`/`decodeFrame`, never throws on garbage → `null`;
  `detectProtocolVersion` for "incompatible sender"), `filename` (truncate on send, sanitize on
  download), `profiles` (Reliable/Balanced/Fast presets + `TransferSettings`/`resolveSettings`),
  `transfer` (`preparePayload`, `buildTransfer`, `assembleTransfer`, `ChunkCollector`,
  `countFrames`), `formatDetection`, `config` (limits/thresholds), `types`.
- Frame format (**QRTransfer v2**): header `QRT2|<id 8 b64url>|0|<total>|H|<b64url JSON meta>` with
  `{t: t|f, c: g|n, h: sha256 hex, s: size, n?: filename, m?: mime}`; data
  `QRT2|<id>|<index≥1>|<total>|D|<b64url payload>`. `total` includes the header. v1 is not
  accepted. Bump the version prefix rather than changing v2 semantics; keep frames ASCII.
- Profiles are the only user-facing knobs (`profiles.ts`); the UI never shows chunk size / ECC /
  QR version. Advanced = frame duration override only. Don't hardcode technical numbers in
  components.
- Sender/receiver state is a discriminated union (`SendFlow`: editing→preparing→transferring;
  `TransferScanner`: idle→scanning→receiving→assembling→complete|error). Don't replace it with
  boolean flags. `usePreparedPayload` runs the expensive half live (debounced, cancellable); QR
  images are rendered only on Start.
- `LargeTransfer` holds source, draft text, selected `File` and settings so Send↔Receive and
  Text↔File switching keeps them. Object URLs (previews, downloads) are revoked in effect cleanups.
- Filenames/MIME from the wire are untrusted: sanitize before `download`, normalize MIME, never
  interpret or execute content.
- `LargeTextEditor` wraps CodeMirror 6 (individual `@codemirror/*` packages only — no `codemirror`
  meta package, no autocomplete/lint). One `EditorView` per mount; options change via Compartments;
  fullscreen is a CSS class on the same wrapper (`.is-fullscreen`), never a remount.
- Format detection (`Auto | Text | Markdown | JSON`) affects highlighting only; content is never
  transformed, rendered as HTML/Markdown, or executed.

### Camera

The two scanners run different engines but share one lifecycle shape: the camera starts in an
effect whose cleanup releases it, a `finished` flag covers the start/unmount race, and restarts bump
a `session` counter. Default camera is `facingMode: 'environment'`, and camera identity is built
only by `buildVideoConstraints` (`src/lib/camera.ts`). Preserve this pattern when touching camera
code.

- **Quick QR** (`QRScanner`) uses `html5-qrcode` directly, with `stopScanner()` in the cleanup.
- **Large Transfer** (`useTransferScanner` — all imperative work lives there, `TransferScanner.tsx`
  only renders) uses `src/lib/scan/`: `getUserMedia` → `requestVideoFrameCallback` →
  `computeRoi` → one nine-argument `drawImage` onto a canvas **sized in camera pixels** →
  `getImageData` → RGBA transferred to a worker running `zxing-wasm`. One decode in flight; frames
  arriving meanwhile are skipped before any pixel work. `html5-qrcode` stays as an automatic
  fallback behind a dynamic `import()`.
- Sizing that canvas ourselves is the whole point: `html5-qrcode` derives it from the viewfinder's
  CSS width, which left dense symbols at ~3 px/module and capped the decode rate at 27 %. Don't
  reintroduce anything that couples the decoded region to on-screen size.
- The `.wasm` is served from the bundle, never a CDN — the app must work offline.

### Styling

A design-system refactor is executing, stage by stage, per
[`docs/specs/design-system-refactor/macro-plan.md`](docs/specs/design-system-refactor/macro-plan.md) —
read that plan and [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) (token values, component specs)
plus [`docs/frontend-architecture.md`](docs/frontend-architecture.md) (folder/CSS conventions)
before touching any UI covered by an unstarted stage; check the plan's tracking table for what's
already done.

Target state: **CSS Modules** (no Tailwind, no CSS-in-JS, no Radix by default), design tokens
split under `src/styles/tokens/`, reusable primitives under `src/components/primitives/` and
app-scoped components under `src/components/app/` (folder-per-component: `Component.tsx` +
`.module.css` + `index.ts`, extra files only when needed), CSS for micro-interactions + a `motion`
kit for layout/presence transitions (Stage 10), self-hosted Inter + JetBrains Mono variable fonts,
`lucide-react` icons, native `<dialog>` for the settings sheet/modal, a single **900px**
breakpoint. Every color/spacing/radius/duration must resolve through a token — no hardcoded hex or
raw px.

Until each stage lands, the app still runs on the legacy single `src/styles.css` with CSS
variables (light on `:root`, dark on `:root[data-theme='dark']`, includes `--cm-*` CodeMirror
colors, breakpoint 760px) — reuse its existing classes (`.button`, `.button-small`,
`.button-primary`, `.tabs`, `.panel`, `.hint`, `.error`, `.actions`) for anything not yet covered
by a completed stage, rather than inventing new global ones. `styles.css` is deleted entirely in
Stage 9.
