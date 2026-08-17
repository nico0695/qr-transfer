# Quick QR

> One-shot text ↔ QR, no settings, no compression, up to 2000 characters. Rebuilt in Stage 5 of the
> [design-system refactor](../../specs/design-system-refactor/macro-plan.md) onto the app shell
> (`../app-shell.md`). Source: `src/components/QRGenerator.tsx`, `src/components/QRScanner.tsx`,
> `src/components/app/{TextEditor,OpticalStage/QrDisplay,OpticalStage/CameraScanner,ResultPanel}/`,
> `src/hooks/useCopy.ts`.

## Table of Contents

- [Generate QR (role = Send)](#generate-qr-role--send)
- [Scan QR (role = Receive)](#scan-qr-role--receive)
- [Errors](#errors)
- [Copy inventory](#copy-inventory)

## Generate QR (role = Send)

Entry point: header mode `Tabs` → "Quick QR" (default mode) → role `SegmentedControl` → "Send"
(default role). "Generate QR" isn't a separate tab anymore — Send/Receive is the app-wide `role`
shared with Large Transfer (see `../app-shell.md`).

`TextEditor` (compose pane): a `Card` with a header row (`--fs-label` title, Copy/Clear as `Button`
primitives), a plain `<textarea>` (2000-character hard limit via `maxLength`) with a live counter
in the footer. `QrDisplay` (stage pane, reached via `createPortal` — see the app-shell doc's
"Anything risky" note on why): empty state is a dashed inner `Card` with a `qr-code` icon and
placeholder text; ready state renders the QR at 640px native resolution, scaled down by CSS so it
stays sharp, inside a white `--qr-paper` card with `--sh-qr` elevation.

Below 900px only one pane is visible at a time (`MobileViewSwitcher`); a "Show QR" `Button` in the
compose pane jumps straight to the stage pane instead of requiring a tap on the bottom switcher.

| State                          | Trigger                    | Desktop                                                                 | Mobile                                                                          |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Empty                          | Initial load / after Clear | ![](../screens/10-quick-qr-generate/01-empty.desktop.light.png)         | ![](../screens/10-quick-qr-generate/01-empty.mobile.light.png)                  |
| Empty — dark                   |                            | ![](../screens/10-quick-qr-generate/01-empty.desktop.dark.png)          | ![](../screens/10-quick-qr-generate/01-empty.mobile.dark.png)                   |
| Filled                         | Any text typed             | ![](../screens/10-quick-qr-generate/02-filled.desktop.light.png)        | ![](../screens/10-quick-qr-generate/02-filled.mobile.light.png)                 |
| Filled — dark                  |                            | ![](../screens/10-quick-qr-generate/02-filled.desktop.dark.png)         | ![](../screens/10-quick-qr-generate/02-filled.mobile.dark.png)                  |
| Limit reached                  | Text hits 2000 chars       | ![](../screens/10-quick-qr-generate/03-limit-reached.desktop.light.png) | ![](../screens/10-quick-qr-generate/03-limit-reached.mobile.light.png)          |
| Limit reached — dark           |                            | ![](../screens/10-quick-qr-generate/03-limit-reached.desktop.dark.png)  | ![](../screens/10-quick-qr-generate/03-limit-reached.mobile.dark.png)           |
| Mobile: after "Show QR"        | Tap Show QR, switches pane | —                                                                       | ![](../screens/10-quick-qr-generate/04-qr-panel-after-show-qr.mobile.light.png) |
| Mobile: after "Show QR" — dark |                            | —                                                                       | ![](../screens/10-quick-qr-generate/04-qr-panel-after-show-qr.mobile.dark.png)  |

Other states not screenshotted: Copy button feedback (`Copied!` / `Copy failed`, 2s timeout,
`src/hooks/useCopy.ts`), and a "too long to fit" QR-render error — hard to trigger at the
2000-char ceiling since the library usually still succeeds; the message exists for completeness
(`qrTooLong` in the copy inventory below).

## Scan QR (role = Receive)

Entry point: header mode `Tabs` → "Quick QR" → role `SegmentedControl` → "Receive". Uses
`html5-qrcode` directly (`src/components/QRScanner.tsx`), independent of the Large Transfer scan
pipeline — camera lifecycle (the `finished` flag, `session` counter, `stopScanner()` in cleanup)
is unchanged from before the redesign.

`CameraScanner` (stage pane, portaled): a `Card` with the camera `Select` (only shown with >1
camera), a viewfinder with corner brackets (`--scan-guide`) and a sweep line (disabled under
`prefers-reduced-motion`), a starting overlay with a `Spinner`, and a live `StatusDot` badge.
`ResultPanel` (compose pane, once decoded): built on the `Feedback` primitive (`level="verified"`),
Copy/Scan-again as `Button`s.

Below 900px, `QRScanner` drives `view` from status: `starting` / `scanning` open the `stage`;
`done` / `error` switch to `compose`. "Scan again" / "Try again" return to `stage`. Desktop still
shows both columns at once.

| State           | Trigger                       | Desktop                                                        | Mobile                                                        |
| --------------- | ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Starting        | Camera permission requested   | ![](../screens/20-quick-qr-scan/01-starting.desktop.light.png) | ![](../screens/20-quick-qr-scan/01-starting.mobile.light.png) |
| Starting — dark |                               | ![](../screens/20-quick-qr-scan/01-starting.desktop.dark.png)  | ![](../screens/20-quick-qr-scan/01-starting.mobile.dark.png)  |
| Scanning        | Camera live, viewfinder shown | ![](../screens/20-quick-qr-scan/02-scanning.desktop.light.png) | ![](../screens/20-quick-qr-scan/02-scanning.mobile.light.png) |
| Scanning — dark |                               | ![](../screens/20-quick-qr-scan/02-scanning.desktop.dark.png)  | ![](../screens/20-quick-qr-scan/02-scanning.mobile.dark.png)  |
| Done            | A QR code decoded             | ![](../screens/20-quick-qr-scan/03-done.desktop.light.png)     | ![](../screens/20-quick-qr-scan/03-done.mobile.light.png)     |
| Done — dark     |                               | ![](../screens/20-quick-qr-scan/03-done.desktop.dark.png)      | ![](../screens/20-quick-qr-scan/03-done.mobile.dark.png)      |

A camera picker `<select>` appears above the viewfinder whenever more than one camera is
available ("Default (back camera)" plus each device's label) — not screenshotted in this pass, see
`README.md`'s coverage notes. On mobile, decoding only happens once the `stage` pane is actually
visible — a `<video>` inside a `display:none` pane never produces a frame — matching the app
shell's compose/stage split, not a scanner-specific quirk.

## Errors

Same four camera-lifecycle errors recur in every camera-dependent screen in the app (Quick Scan
and both Large Transfer receive paths) — this is the canonical set. Rendered with the `Feedback`
primitive (`level="error"`, `role="alert"`) instead of the old `.error` paragraph.

| State                    | Trigger                        | Desktop                                                                  | Mobile                                                                  |
| ------------------------ | ------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Permission denied        | User denies the camera prompt  | ![](../screens/20-quick-qr-scan/04-error-permission.desktop.light.png)   | ![](../screens/20-quick-qr-scan/04-error-permission.mobile.light.png)   |
| Permission denied — dark |                                | ![](../screens/20-quick-qr-scan/04-error-permission.desktop.dark.png)    | ![](../screens/20-quick-qr-scan/04-error-permission.mobile.dark.png)    |
| Not readable             | Camera in use by another app   | ![](../screens/20-quick-qr-scan/05-error-not-readable.desktop.light.png) | ![](../screens/20-quick-qr-scan/05-error-not-readable.mobile.light.png) |
| Not readable — dark      |                                | ![](../screens/20-quick-qr-scan/05-error-not-readable.desktop.dark.png)  | ![](../screens/20-quick-qr-scan/05-error-not-readable.mobile.dark.png)  |
| Generic failure          | Any other camera-start failure | ![](../screens/20-quick-qr-scan/06-error-generic.desktop.light.png)      | ![](../screens/20-quick-qr-scan/06-error-generic.mobile.light.png)      |
| Generic failure — dark   |                                | ![](../screens/20-quick-qr-scan/06-error-generic.desktop.dark.png)       | ![](../screens/20-quick-qr-scan/06-error-generic.mobile.dark.png)       |

A fourth camera error, "no camera found" (`errorNoCamera`), and an "empty QR" content error
(`errorEmptyQr`, when a scanned code decodes to an empty string) share the same `Feedback` treatment
but aren't separately screenshotted — visually identical to the states above.

## Copy inventory

| Key                              | English                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `textLabel`                      | Text to transfer                                                                      |
| `textPlaceholder`                | Type or paste the text you want to transfer…                                          |
| `limitReached`                   | " — limit reached" (appended to the counter)                                          |
| `copy` / `copied` / `copyFailed` | Copy / Copied! / Copy failed                                                          |
| `clear`                          | Clear                                                                                 |
| `showQr`                         | Show QR                                                                               |
| `qrPlaceholder`                  | The QR code will appear here.                                                         |
| `qrTooLong`                      | This text is too long to fit in a QR code. Try shortening it.                         |
| `cameraLabel` / `cameraDefault`  | Camera / Default (back camera)                                                        |
| `startingCamera`                 | Starting camera…                                                                      |
| `scanHint`                       | Point the camera at a QR code.                                                        |
| `liveLabel`                      | Live (camera viewfinder status badge)                                                 |
| `scannedText`                    | Scanned text                                                                          |
| `scanAgain` / `tryAgain`         | Scan again / Try again                                                                |
| `errorPermission`                | Camera access was denied. Allow camera access in your browser settings and try again. |
| `errorNoCamera`                  | No camera was found on this device.                                                   |
| `errorNotReadable`               | The camera is not available. It may be in use by another app.                         |
| `errorGeneric`                   | The camera could not be started. Please try again.                                    |
| `errorEmptyQr`                   | The QR code does not contain any readable text.                                       |
