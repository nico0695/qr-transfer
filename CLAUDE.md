# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

QR Transfer: static SPA (Vite + React 19 + strict TypeScript + plain CSS) that transfers text and
files between devices optically (screen → camera). No backend, no network requests, no content
persistence — by design. The **only** thing persisted is the preferred transfer profile
(`src/lib/settingsStorage.ts`, `localStorage`); never text, files or received content. Docs live
in `docs/` (`technical-overview.md`, `qr-transfer-flow.md`, `large-transfer.md`,
`frontend-architecture.md`).

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
object is typed as `Messages`, so TS flags omissions).

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

A design-system refactor is underway per [`docs/frontend-architecture.md`](docs/frontend-architecture.md) —
**CSS Modules** (no Tailwind, no CSS-in-JS, no Radix by default), design tokens split under
`src/styles/tokens/`, reusable primitives under `src/components/primitives/` (folder-per-component:
`Component.tsx` + `.module.css` + `index.ts`, extra files only when needed), animations in native
CSS only, respecting `prefers-reduced-motion`. Read that doc before adding new UI. Until primitives
land, the app still runs on the legacy single `src/styles.css` with CSS variables; light on
`:root`, dark on `:root[data-theme='dark']` (includes `--cm-*` CodeMirror colors). Reuse existing
classes (`.button`, `.button-small`, `.button-primary`, `.tabs`, `.panel`, `.hint`, `.error`,
`.actions`) rather than inventing new global ones. Breakpoint 760 px.
