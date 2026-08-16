# Quick QR

> One-shot text ↔ QR, no settings, no compression, up to 2000 characters. Source:
> `src/components/QRGenerator.tsx`, `src/components/QRScanner.tsx`, `src/components/CopyButton.tsx`.

## Table of Contents

- [Generate QR](#generate-qr)
- [Scan QR](#scan-qr)
- [Errors](#errors)
- [Copy inventory](#copy-inventory)

## Generate QR

Entry point: NavMenu → "Quick QR" (default section) → "Generate QR" tab (default mode).

A textarea (2000-character hard limit via `maxLength`) with a live counter; the QR renders
in-place as you type, at 640px native resolution scaled down by CSS so it stays sharp. Desktop
shows the QR in a sticky sidebar; mobile shows a "Show QR" button that scrolls to a full-screen QR
panel below the fold (`min-height: 85svh`, so the code is easy to scan by another device).

| State                          | Trigger                    | Desktop                                                                 | Mobile                                                                          |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Empty                          | Initial load / after Clear | ![](../screens/10-quick-qr-generate/01-empty.desktop.light.png)         | ![](../screens/10-quick-qr-generate/01-empty.mobile.light.png)                  |
| Empty — dark                   |                            | ![](../screens/10-quick-qr-generate/01-empty.desktop.dark.png)          | ![](../screens/10-quick-qr-generate/01-empty.mobile.dark.png)                   |
| Filled                         | Any text typed             | ![](../screens/10-quick-qr-generate/02-filled.desktop.light.png)        | ![](../screens/10-quick-qr-generate/02-filled.mobile.light.png)                 |
| Filled — dark                  |                            | ![](../screens/10-quick-qr-generate/02-filled.desktop.dark.png)         | ![](../screens/10-quick-qr-generate/02-filled.mobile.dark.png)                  |
| Limit reached                  | Text hits 2000 chars       | ![](../screens/10-quick-qr-generate/03-limit-reached.desktop.light.png) | ![](../screens/10-quick-qr-generate/03-limit-reached.mobile.light.png)          |
| Limit reached — dark           |                            | ![](../screens/10-quick-qr-generate/03-limit-reached.desktop.dark.png)  | ![](../screens/10-quick-qr-generate/03-limit-reached.mobile.dark.png)           |
| Mobile: after "Show QR"        | Tap Show QR, page scrolls  | —                                                                       | ![](../screens/10-quick-qr-generate/04-qr-panel-after-show-qr.mobile.light.png) |
| Mobile: after "Show QR" — dark |                            | —                                                                       | ![](../screens/10-quick-qr-generate/04-qr-panel-after-show-qr.mobile.dark.png)  |

Other states not screenshotted: Copy button feedback (`Copied!` / `Copy failed`, 2 s timeout,
`src/components/CopyButton.tsx`), and a "too long to fit" QR-render error — hard to trigger at the
2000-char ceiling since the library usually still succeeds; the message exists for completeness
(`qrTooLong` in the copy inventory below).

## Scan QR

Entry point: NavMenu → "Quick QR" → "Scan QR" tab. Uses `html5-qrcode` directly
(`src/components/QRScanner.tsx`), independent of the Large Transfer scan pipeline.

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
`README.md`'s coverage notes.

## Errors

Same four camera-lifecycle errors recur in every camera-dependent screen in the app (Quick Scan
and both Large Transfer receive paths) — this is the canonical set:

| State                    | Trigger                        | Desktop                                                                  | Mobile                                                                  |
| ------------------------ | ------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Permission denied        | User denies the camera prompt  | ![](../screens/20-quick-qr-scan/04-error-permission.desktop.light.png)   | ![](../screens/20-quick-qr-scan/04-error-permission.mobile.light.png)   |
| Permission denied — dark |                                | ![](../screens/20-quick-qr-scan/04-error-permission.desktop.dark.png)    | ![](../screens/20-quick-qr-scan/04-error-permission.mobile.dark.png)    |
| Not readable             | Camera in use by another app   | ![](../screens/20-quick-qr-scan/05-error-not-readable.desktop.light.png) | ![](../screens/20-quick-qr-scan/05-error-not-readable.mobile.light.png) |
| Not readable — dark      |                                | ![](../screens/20-quick-qr-scan/05-error-not-readable.desktop.dark.png)  | ![](../screens/20-quick-qr-scan/05-error-not-readable.mobile.dark.png)  |
| Generic failure          | Any other camera-start failure | ![](../screens/20-quick-qr-scan/06-error-generic.desktop.light.png)      | ![](../screens/20-quick-qr-scan/06-error-generic.mobile.light.png)      |
| Generic failure — dark   |                                | ![](../screens/20-quick-qr-scan/06-error-generic.desktop.dark.png)       | ![](../screens/20-quick-qr-scan/06-error-generic.mobile.dark.png)       |

A fourth camera error, "no camera found" (`errorNoCamera`), and an "empty QR" content error
(`errorEmptyQr`, when a scanned code decodes to an empty string) share the same `.error` treatment
but aren't separately screenshotted — visually identical to the states above.

## Copy inventory

| Key                              | English                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `tabGenerate` / `tabScan`        | Generate QR / Scan QR                                                                 |
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
| `scannedText`                    | Scanned text                                                                          |
| `scanAgain` / `tryAgain`         | Scan again / Try again                                                                |
| `errorPermission`                | Camera access was denied. Allow camera access in your browser settings and try again. |
| `errorNoCamera`                  | No camera was found on this device.                                                   |
| `errorNotReadable`               | The camera is not available. It may be in use by another app.                         |
| `errorGeneric`                   | The camera could not be started. Please try again.                                    |
| `errorEmptyQr`                   | The QR code does not contain any readable text.                                       |
