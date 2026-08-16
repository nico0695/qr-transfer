# Large Transfer — Receive

> Camera scanning → frame-by-frame progress → verified result (or an error). Source:
> `src/components/large-transfer/{TransferScanner,ReceiveProgress,ReceivedContent,
ReceivedFile}.tsx`, `src/components/large-transfer/useTransferScanner.ts`, `src/lib/scan/`.

## Table of Contents

- [Entry point](#entry-point)
- [Scanning](#scanning)
- [Receiving](#receiving)
- [Complete](#complete)
- [Errors](#errors)
- [Copy inventory](#copy-inventory)

## Entry point

NavMenu → "Large Transfer" → "Receive" tab.
State shape (`useTransferScanner.ts`): `idle → scanning → receiving → assembling →
complete | error`. See `flow-diagrams.md` for the full machine, including which errors are
recoverable ("Try again" restarts the camera) and which aren't.

## Scanning

Two scan engines share one lifecycle: the default draws its own crop guide sized in camera
pixels (not CSS pixels — this is the fix documented in `docs/large-transfer.md` for a defect that
capped decode rates); a legacy fallback (`html5-qrcode`, reachable via `?scanner=legacy` or when
the primary engine's dependencies aren't available) has its own corner-bracket viewfinder.

| State                      | Trigger                                      | Desktop                                                                        | Mobile                                                                        |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Idle / starting camera     | Tab opened, permission pending               | ![](../screens/60-large-transfer-receive/01-idle-starting.desktop.light.png)   | ![](../screens/60-large-transfer-receive/01-idle-starting.mobile.light.png)   |
| Idle — dark                |                                              | ![](../screens/60-large-transfer-receive/01-idle-starting.desktop.dark.png)    | ![](../screens/60-large-transfer-receive/01-idle-starting.mobile.dark.png)    |
| Scanning (default engine)  | Camera live, framed guide                    | ![](../screens/60-large-transfer-receive/02-scanning-framed.desktop.light.png) | ![](../screens/60-large-transfer-receive/02-scanning-framed.mobile.light.png) |
| Scanning (default) — dark  |                                              | ![](../screens/60-large-transfer-receive/02-scanning-framed.desktop.dark.png)  | ![](../screens/60-large-transfer-receive/02-scanning-framed.mobile.dark.png)  |
| Scanning (legacy fallback) | `?scanner=legacy`, corner-bracket viewfinder | ![](../screens/60-large-transfer-receive/03-scanning-legacy.desktop.light.png) | ![](../screens/60-large-transfer-receive/03-scanning-legacy.mobile.light.png) |
| Scanning (legacy) — dark   |                                              | ![](../screens/60-large-transfer-receive/03-scanning-legacy.desktop.dark.png)  | ![](../screens/60-large-transfer-receive/03-scanning-legacy.mobile.dark.png)  |

A camera picker `<select>` appears above the viewfinder when more than one camera is available —
not screenshotted this pass (see `README.md` coverage notes).

## Receiving

Once the header frame is decoded, a progress block replaces the plain hint: frame count
("4 / 14 frames"), the transfer's name/size once known ("photo.png · 15.4 KB" or "Text · N KB"),
a progress bar, and — while the list is short enough to be useful (≤200 entries) — a collapsible
list of specific missing frame indexes.

| State                    | Trigger                              | Desktop                                                                                      | Mobile                                                                                      |
| ------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Receiving, progress bar  | Header decoded, data frames arriving | ![](../screens/60-large-transfer-receive/04-receiving.desktop.light.png)                     | ![](../screens/60-large-transfer-receive/04-receiving.mobile.light.png)                     |
| Receiving — dark         |                                      | ![](../screens/60-large-transfer-receive/04-receiving.desktop.dark.png)                      | ![](../screens/60-large-transfer-receive/04-receiving.mobile.dark.png)                      |
| Missing-frames list open | Tap "Missing frames"                 | ![](../screens/60-large-transfer-receive/05-receiving-missing-frames-open.desktop.light.png) | ![](../screens/60-large-transfer-receive/05-receiving-missing-frames-open.mobile.light.png) |
| Missing-frames — dark    |                                      | ![](../screens/60-large-transfer-receive/05-receiving-missing-frames-open.desktop.dark.png)  | ![](../screens/60-large-transfer-receive/05-receiving-missing-frames-open.mobile.dark.png)  |

A short-lived green flash on the guide box confirms each newly-accepted frame
(`.scan-guide-hit`, a 700 ms CSS fade, disabled under `prefers-reduced-motion`) — not
screenshotted, it's a transient animation rather than a state. "Assembling" (verifying the
checksum and decompressing, camera already released) reuses this exact layout with the label
"Verifying and decompressing…" instead of "Receiving transfer…" — visually identical, not
separately screenshotted.

## Complete

Once the checksum matches, the camera stops and the result replaces the scanner entirely. Text and
file results are two different components with a shared "✓ Verified" treatment.

| State                           | Trigger                                  | Desktop                                                                                   | Mobile                                                                                   |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Complete — text                 | Transfer was text                        | ![](../screens/70-large-transfer-received/01-complete-text.desktop.light.png)             | ![](../screens/70-large-transfer-received/01-complete-text.mobile.light.png)             |
| Complete — text, dark           |                                          | ![](../screens/70-large-transfer-received/01-complete-text.desktop.dark.png)              | ![](../screens/70-large-transfer-received/01-complete-text.mobile.dark.png)              |
| Complete — text, viewer open    | "View content" toggled                   | ![](../screens/70-large-transfer-received/02-complete-text-viewer-open.desktop.light.png) | ![](../screens/70-large-transfer-received/02-complete-text-viewer-open.mobile.light.png) |
| Viewer open — dark              |                                          | ![](../screens/70-large-transfer-received/02-complete-text-viewer-open.desktop.dark.png)  | ![](../screens/70-large-transfer-received/02-complete-text-viewer-open.mobile.dark.png)  |
| Complete — file (no preview)    | Transfer was a non-image file (PDF here) | ![](../screens/70-large-transfer-received/03-complete-file.desktop.light.png)             | ![](../screens/70-large-transfer-received/03-complete-file.mobile.light.png)             |
| Complete — file, dark           |                                          | ![](../screens/70-large-transfer-received/03-complete-file.desktop.dark.png)              | ![](../screens/70-large-transfer-received/03-complete-file.mobile.dark.png)              |
| Complete — file (image preview) | Transfer was an image file               | ![](../screens/70-large-transfer-received/04-complete-file-image.desktop.light.png)       | ![](../screens/70-large-transfer-received/04-complete-file-image.mobile.light.png)       |
| Complete — image, dark          |                                          | ![](../screens/70-large-transfer-received/04-complete-file-image.desktop.dark.png)        | ![](../screens/70-large-transfer-received/04-complete-file-image.mobile.dark.png)        |

The image variant adds a "Copy image" button (only rendered when the browser supports
`ClipboardItem`/`navigator.clipboard.write`), with its own `Copied!`/`Copy failed` feedback — same
pattern as the text Copy button, not separately screenshotted.

## Errors

| State                      | Trigger                            | Desktop                                                                                  | Mobile                                                                                   |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Verification failed        | Checksum mismatch after assembling | ![](../screens/60-large-transfer-receive/06-error-verification-failed.desktop.light.png) | ![](../screens/60-large-transfer-receive/06-error-verification-failed.mobile.light.png)  |
| Verification failed — dark |                                    | ![](../screens/60-large-transfer-receive/06-error-verification-failed.desktop.dark.png)  | ![](../screens/60-large-transfer-receive/06-error-verification-failed.mobile.dark.png)   |
| Incompatible sender        | A `QRT1                            | …` (or otherwise unsupported) frame scanned                                              | ![](../screens/60-large-transfer-receive/07-error-incompatible-sender.desktop.light.png) | ![](../screens/60-large-transfer-receive/07-error-incompatible-sender.mobile.light.png) |
| Incompatible — dark        |                                    | ![](../screens/60-large-transfer-receive/07-error-incompatible-sender.desktop.dark.png)  | ![](../screens/60-large-transfer-receive/07-error-incompatible-sender.mobile.dark.png)   |
| Permission denied          | Camera prompt denied               | ![](../screens/60-large-transfer-receive/08-error-permission.desktop.light.png)          | ![](../screens/60-large-transfer-receive/08-error-permission.mobile.light.png)           |
| Permission denied — dark   |                                    | ![](../screens/60-large-transfer-receive/08-error-permission.desktop.dark.png)           | ![](../screens/60-large-transfer-receive/08-error-permission.mobile.dark.png)            |

The same "not readable" and "generic" camera errors from Quick QR Scan also apply here (identical
`.error` treatment — see `quick-qr.md`). Every error state offers "Try again", which restarts the
camera from scratch.

## Copy inventory

| Key                                           | English                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `receiverIdle`                                | Point the camera at a Large Transfer QR                                                             |
| `receiving` / `assembling`                    | Receiving transfer… / Verifying and decompressing…                                                  |
| `framesProgress(received, total)`             | "{received} / {total} frames"                                                                       |
| `missingFrames`                               | Missing frames                                                                                      |
| `transferComplete` `verified`                 | Transfer complete / Verified                                                                        |
| `verificationFailed` `scanAgainHint`          | Transfer could not be verified. / Scan again.                                                       |
| `incompatibleSender`                          | This QR comes from an incompatible version of QR Transfer. Update the sending device and try again. |
| `download` `copyImage` `scanAnother`          | Download / Copy image / Scan another                                                                |
| `viewContent` `hideContent` `receivedContent` | View content / Hide content / Received content                                                      |
| `copyAll` `copy` `copied` `copyFailed`        | Copy all / Copy / Copied! / Copy failed                                                             |
| `cancel` `tryAgain`                           | Cancel / Try again                                                                                  |
