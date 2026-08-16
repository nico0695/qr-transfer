# Large Transfer — Send

> Compose (text or one file) → review a summary → optional settings → start → animated QR loop.
> Source: `src/components/large-transfer/{SendFlow,SourceSelector,LargeTextEditor,FileInput,
FilePreview,TransferSummary,TransferSettings,AnimatedQR}.tsx`.

## Table of Contents

- [Entry point](#entry-point)
- [Composing — Text](#composing--text)
- [Composing — File](#composing--file)
- [Summary and warnings](#summary-and-warnings)
- [Settings](#settings)
- [Preparing and the animated QR](#preparing-and-the-animated-qr)
- [Copy inventory](#copy-inventory)

## Entry point

NavMenu → "Large Transfer" → "Send" tab (default direction). State shape
(`src/components/large-transfer/SendFlow.tsx`): `editing → preparing → transferring`. Source
(text/file), the draft text, the selected file and the chosen settings are held one level up in
`LargeTransfer.tsx`, so switching Send↔Receive or Text↔File never loses them — see
`flow-diagrams.md` for the state machine.

## Composing — Text

The default source. A CodeMirror 6 editor (`LargeTextEditor.tsx`) with Undo/Redo, Find, line-wrap
toggle, a format picker (Auto detects Markdown/JSON/plain text and highlights accordingly), Copy,
Clear and Fullscreen. Character/byte counters sit in the footer.

| State                 | Trigger                                  | Desktop                                                                             | Mobile                                                                             |
| --------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Empty                 | Default                                  | ![](../screens/30-large-transfer-send/01-text-empty.desktop.light.png)              | ![](../screens/30-large-transfer-send/01-text-empty.mobile.light.png)              |
| Empty — dark          |                                          | ![](../screens/30-large-transfer-send/01-text-empty.desktop.dark.png)               | ![](../screens/30-large-transfer-send/01-text-empty.mobile.dark.png)               |
| Filled, plain text    | Typed content, no Markdown/JSON detected | ![](../screens/30-large-transfer-send/02-text-filled-plain.desktop.light.png)       | ![](../screens/30-large-transfer-send/02-text-filled-plain.mobile.light.png)       |
| Filled, plain — dark  |                                          | ![](../screens/30-large-transfer-send/02-text-filled-plain.desktop.dark.png)        | ![](../screens/30-large-transfer-send/02-text-filled-plain.mobile.dark.png)        |
| Markdown highlighting | Content auto-detected as Markdown        | ![](../screens/30-large-transfer-send/03-text-markdown-highlight.desktop.light.png) | ![](../screens/30-large-transfer-send/03-text-markdown-highlight.mobile.light.png) |
| Markdown — dark       |                                          | ![](../screens/30-large-transfer-send/03-text-markdown-highlight.desktop.dark.png)  | ![](../screens/30-large-transfer-send/03-text-markdown-highlight.mobile.dark.png)  |
| JSON highlighting     | Content auto-detected as JSON            | ![](../screens/30-large-transfer-send/04-text-json-highlight.desktop.light.png)     | ![](../screens/30-large-transfer-send/04-text-json-highlight.mobile.light.png)     |
| JSON — dark           |                                          | ![](../screens/30-large-transfer-send/04-text-json-highlight.desktop.dark.png)      | ![](../screens/30-large-transfer-send/04-text-json-highlight.mobile.dark.png)      |
| Fullscreen            | Toolbar "Fullscreen" (Escape exits)      | ![](../screens/30-large-transfer-send/05-text-fullscreen.desktop.light.png)         | ![](../screens/30-large-transfer-send/05-text-fullscreen.mobile.light.png)         |
| Fullscreen — dark     |                                          | ![](../screens/30-large-transfer-send/05-text-fullscreen.desktop.dark.png)          | ![](../screens/30-large-transfer-send/05-text-fullscreen.mobile.dark.png)          |

Not screenshotted this pass (present in code, straightforward to add — see `README.md`): the Find
panel and "Wrap: off" with a long unwrapped line scrolling horizontally.

## Composing — File

Switch the `SourceSelector` segmented control to "File". Exactly one file per transfer.

| State                       | Trigger                                            | Desktop                                                                            | Mobile                                                                            |
| --------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Dropzone, idle              | Source = File, none selected                       | ![](../screens/30-large-transfer-send/08-file-dropzone.desktop.light.png)          | ![](../screens/30-large-transfer-send/08-file-dropzone.mobile.light.png)          |
| Dropzone, idle — dark       |                                                    | ![](../screens/30-large-transfer-send/08-file-dropzone.desktop.dark.png)           | ![](../screens/30-large-transfer-send/08-file-dropzone.mobile.dark.png)           |
| Dropzone, dragging          | A file is dragged over the zone                    | ![](../screens/30-large-transfer-send/09-file-dropzone-dragging.desktop.light.png) | ![](../screens/30-large-transfer-send/09-file-dropzone-dragging.mobile.light.png) |
| Dropzone, dragging — dark   |                                                    | ![](../screens/30-large-transfer-send/09-file-dropzone-dragging.desktop.dark.png)  | ![](../screens/30-large-transfer-send/09-file-dropzone-dragging.mobile.dark.png)  |
| File card, non-image        | A file selected (PDF here)                         | ![](../screens/30-large-transfer-send/10-file-card.desktop.light.png)              | ![](../screens/30-large-transfer-send/10-file-card.mobile.light.png)              |
| File card, non-image — dark |                                                    | ![](../screens/30-large-transfer-send/10-file-card.desktop.dark.png)               | ![](../screens/30-large-transfer-send/10-file-card.mobile.dark.png)               |
| File card, image            | An image file selected — thumbnail shown           | ![](../screens/30-large-transfer-send/11-file-card-image.desktop.light.png)        | ![](../screens/30-large-transfer-send/11-file-card-image.mobile.light.png)        |
| File card, image — dark     |                                                    | ![](../screens/30-large-transfer-send/11-file-card-image.desktop.dark.png)         | ![](../screens/30-large-transfer-send/11-file-card-image.mobile.dark.png)         |
| Multi-file drop notice      | Two+ files dropped at once; only the first is kept | ![](../screens/30-large-transfer-send/12-multi-drop-notice.desktop.light.png)      | ![](../screens/30-large-transfer-send/12-multi-drop-notice.mobile.light.png)      |
| Multi-file drop — dark      |                                                    | ![](../screens/30-large-transfer-send/12-multi-drop-notice.desktop.dark.png)       | ![](../screens/30-large-transfer-send/12-multi-drop-notice.mobile.dark.png)       |

## Summary and warnings

`TransferSummary.tsx` appears below the editor/file card once content is ready (250 ms debounce
for text). It shows filename (file only) / character count (text only) / original size / transfer
size (after compression) / compression ratio / QR frame count / estimated loop time, plus a
size-dependent banner:

| Threshold                                        | Banner                                             |
| ------------------------------------------------ | -------------------------------------------------- |
| < 100 KB transfer bytes                          | none                                               |
| ≥ 100 KB (`LARGE_BYTES`)                         | "Large transfer" notice — more frames, longer scan |
| ≥ 500 KB (`VERY_LARGE_BYTES`)                    | "Very large transfer" notice                       |
| > 2 MB (`MAX_TRANSFER_BYTES`, after compression) | Error — transfer blocked, Start disabled           |
| Source file > 20 MB (`MAX_SOURCE_BYTES`)         | Rejected before it's even read — "file too large"  |

| State                      | Desktop                                                                        | Mobile                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Ready — text               | ![](../screens/30-large-transfer-send/13-summary-ready-text.desktop.light.png) | ![](../screens/30-large-transfer-send/13-summary-ready-text.mobile.light.png) |
| Ready — text, dark         | ![](../screens/30-large-transfer-send/13-summary-ready-text.desktop.dark.png)  | ![](../screens/30-large-transfer-send/13-summary-ready-text.mobile.dark.png)  |
| Ready — file               | ![](../screens/30-large-transfer-send/14-summary-ready-file.desktop.light.png) | ![](../screens/30-large-transfer-send/14-summary-ready-file.mobile.light.png) |
| Ready — file, dark         | ![](../screens/30-large-transfer-send/14-summary-ready-file.desktop.dark.png)  | ![](../screens/30-large-transfer-send/14-summary-ready-file.mobile.dark.png)  |
| Large (≥100 KB)            | ![](../screens/30-large-transfer-send/15-summary-large.desktop.light.png)      | ![](../screens/30-large-transfer-send/15-summary-large.mobile.light.png)      |
| Large — dark               | ![](../screens/30-large-transfer-send/15-summary-large.desktop.dark.png)       | ![](../screens/30-large-transfer-send/15-summary-large.mobile.dark.png)       |
| Very large (≥500 KB)       | ![](../screens/30-large-transfer-send/16-summary-very-large.desktop.light.png) | ![](../screens/30-large-transfer-send/16-summary-very-large.mobile.light.png) |
| Very large — dark          | ![](../screens/30-large-transfer-send/16-summary-very-large.desktop.dark.png)  | ![](../screens/30-large-transfer-send/16-summary-very-large.mobile.dark.png)  |
| Too large (>2 MB, blocked) | ![](../screens/30-large-transfer-send/17-summary-too-large.desktop.light.png)  | ![](../screens/30-large-transfer-send/17-summary-too-large.mobile.light.png)  |
| Too large — dark           | ![](../screens/30-large-transfer-send/17-summary-too-large.desktop.dark.png)   | ![](../screens/30-large-transfer-send/17-summary-too-large.mobile.dark.png)   |

Not screenshotted: the transient "Preparing…" state inside the summary block itself (distinct from
the full-panel "preparing" screen below) — usually too brief to catch for small content.

## Settings

Opened via the "Settings" button. A native `<dialog>`, centered on desktop and a bottom sheet
below 760 px. Three presets (radio buttons) plus one Advanced override (frame duration).

| Preset             | Frame  | Chunk size | Error correction |
| ------------------ | ------ | ---------- | ---------------- |
| Reliable           | 400 ms | 400 B      | Q                |
| Balanced (default) | 300 ms | 550 B      | M                |
| Fast               | 200 ms | 600 B      | M                |

| State              | Trigger                  | Desktop                                                                                  | Mobile                                                                                  |
| ------------------ | ------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Default (Balanced) | Open Settings            | ![](../screens/40-large-transfer-settings/01-dialog-default.desktop.light.png)           | ![](../screens/40-large-transfer-settings/01-dialog-default.mobile.light.png)           |
| Default — dark     |                          | ![](../screens/40-large-transfer-settings/01-dialog-default.desktop.dark.png)            | ![](../screens/40-large-transfer-settings/01-dialog-default.mobile.dark.png)            |
| Reliable selected  | Pick a different profile | ![](../screens/40-large-transfer-settings/02-dialog-reliable-selected.desktop.light.png) | ![](../screens/40-large-transfer-settings/02-dialog-reliable-selected.mobile.light.png) |
| Reliable — dark    |                          | ![](../screens/40-large-transfer-settings/02-dialog-reliable-selected.desktop.dark.png)  | ![](../screens/40-large-transfer-settings/02-dialog-reliable-selected.mobile.dark.png)  |
| Advanced open      | Expand "Advanced"        | ![](../screens/40-large-transfer-settings/03-dialog-advanced-open.desktop.light.png)     | ![](../screens/40-large-transfer-settings/03-dialog-advanced-open.mobile.light.png)     |
| Advanced — dark    |                          | ![](../screens/40-large-transfer-settings/03-dialog-advanced-open.desktop.dark.png)      | ![](../screens/40-large-transfer-settings/03-dialog-advanced-open.mobile.dark.png)      |

Note: on mobile the dialog becomes a bottom sheet (`@media (max-width: 759px)` in `styles.css`) —
worth a deliberate design pass rather than treating it as the desktop dialog squeezed narrower.

## Preparing and the animated QR

"Start transfer" renders every QR frame as a PNG (`renderFrameImages`) before showing anything —
for large content this is visible as a dedicated screen.

| State            | Trigger                               | Desktop                                                                      | Mobile                                                                      |
| ---------------- | ------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Preparing        | Start clicked, frames still rendering | ![](../screens/30-large-transfer-send/19-preparing-screen.desktop.light.png) | ![](../screens/30-large-transfer-send/19-preparing-screen.mobile.light.png) |
| Preparing — dark |                                       | ![](../screens/30-large-transfer-send/19-preparing-screen.desktop.dark.png)  | ![](../screens/30-large-transfer-send/19-preparing-screen.mobile.dark.png)  |

Once rendering finishes, `AnimatedQR.tsx` takes over: a looping QR with frame index ("4 / 14"),
profile + speed label, Slower/Faster (disabled at the fastest/slowest preset), Fullscreen, and
Stop.

| State             | Trigger                                | Desktop                                                                             | Mobile                                                                             |
| ----------------- | -------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Looping           | Frames render, loop starts             | ![](../screens/50-large-transfer-animated-qr/01-loop.desktop.light.png)             | ![](../screens/50-large-transfer-animated-qr/01-loop.mobile.light.png)             |
| Looping — dark    |                                        | ![](../screens/50-large-transfer-animated-qr/01-loop.desktop.dark.png)              | ![](../screens/50-large-transfer-animated-qr/01-loop.mobile.dark.png)              |
| Slowest reached   | "Slower" clicked to the 500 ms floor   | ![](../screens/50-large-transfer-animated-qr/02-slowest-disabled.desktop.light.png) | ![](../screens/50-large-transfer-animated-qr/02-slowest-disabled.mobile.light.png) |
| Slowest — dark    |                                        | ![](../screens/50-large-transfer-animated-qr/02-slowest-disabled.desktop.dark.png)  | ![](../screens/50-large-transfer-animated-qr/02-slowest-disabled.mobile.dark.png)  |
| Fastest reached   | "Faster" clicked to the 200 ms ceiling | ![](../screens/50-large-transfer-animated-qr/03-fastest-disabled.desktop.light.png) | ![](../screens/50-large-transfer-animated-qr/03-fastest-disabled.mobile.light.png) |
| Fastest — dark    |                                        | ![](../screens/50-large-transfer-animated-qr/03-fastest-disabled.desktop.dark.png)  | ![](../screens/50-large-transfer-animated-qr/03-fastest-disabled.mobile.dark.png)  |
| Fullscreen        | "Fullscreen" clicked (Escape exits)    | ![](../screens/50-large-transfer-animated-qr/04-fullscreen.desktop.light.png)       | ![](../screens/50-large-transfer-animated-qr/04-fullscreen.mobile.light.png)       |
| Fullscreen — dark |                                        | ![](../screens/50-large-transfer-animated-qr/04-fullscreen.desktop.dark.png)        | ![](../screens/50-large-transfer-animated-qr/04-fullscreen.mobile.dark.png)        |

"Stop transfer" returns to the editing state with the source, text/file and settings intact.

## Copy inventory

| Key                                                                              | English                                                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `send` / `receive`                                                               | Send / Receive                                                                                               |
| `sourceLabel`, `sourceText`, `sourceFile`                                        | Source / Text / File                                                                                         |
| `editorLabel`, `editorPlaceholder`                                               | Text to transfer / Paste or type a large text…                                                               |
| `undo` `redo` `find` `wrapOn` `wrapOff` `format` `formatAuto/Text/Markdown/Json` | Undo, Redo, Find, Wrap: on/off, Format, Auto/Text/Markdown/JSON                                              |
| `dropFileHere` `or` `chooseFile` `oneFileHint`                                   | Drop a file here / or / Choose file / One file per transfer.                                                 |
| `changeFile` `removeFile` `unnamedFile` `unknownType`                            | Change / Remove / Unnamed file / unknown type                                                                |
| `multiDropNotice(name)`                                                          | Only one file per transfer — using "{name}".                                                                 |
| `summaryFilename/Characters/Original/Transfer/Compression/Frames/Loop`           | Filename, Characters, Original size, Transfer size, Compression, QR frames, Estimated loop                   |
| `largeTransferWarning(Body)` / `veryLargeTransferWarning`                        | Large transfer / "…requires N QR frames and may take longer to scan." / Very large transfer                  |
| `tooLargeError(maxKb)`                                                           | This content is too large to transfer with QR codes (limit {maxKb} after compression).                       |
| `sourceTooLargeError` / `readFailedError`                                        | This file is too large to transfer with QR codes. / The file could not be read.                              |
| `preparing`                                                                      | Preparing transfer…                                                                                          |
| `startTransfer`                                                                  | Start transfer                                                                                               |
| `settings` `settingsTitle` `profileLabel`                                        | Settings / Transfer settings / Profile                                                                       |
| `profileNames` `profileDescriptions`                                             | Balanced/Reliable/Fast + one-line descriptions                                                               |
| `advanced` `frameDuration` `profileDefault(ms)` `resetDefaults`                  | Advanced / Frame duration / Profile default ({ms} ms) / Reset defaults                                       |
| `loopingEvery(ms)` `slower` `faster` `stopTransfer`                              | Looping every {ms} ms / Slower / Faster / Stop transfer                                                      |
| `transferHint` `brightnessHint`                                                  | Point the receiving camera at this QR and keep it steady. / For better scanning, increase screen brightness. |
| `fullscreen` `exitFullscreen` `cancel` `close` `done`                            | Fullscreen / Exit fullscreen / Cancel / Close / Done                                                         |
