# Large Transfer — Scan Reliability, Iteration 1

Status: in-progress — implementation done and code-reviewed, pending on-device measurement
Scope: Large Transfer only (Quick QR untouched)
Protocol: **no change** — stays QRTransfer v2

## Problem Statement

Large Transfer works, but only at the slowest setting. With the Reliable profile (500 ms per
frame) a transfer completes in a reasonable number of loops; with Balanced (300 ms) and Fast
(200 ms) the receiver needs many full passes of the animation before it collects every frame.

A measured case: a 6-frame transfer takes **~8 loops at 500 ms and 30+ loops at 200 ms**. With
`fps: 15` on the scanner, the receiver gets roughly 7 capture attempts per displayed frame at
500 ms and 3 at 200 ms. Needing 8 loops at 500 ms means only ~25 % of displayed frames are
captured per pass, i.e. **an individual capture decodes successfully only ~3–4 % of the time**.

That is not a "waiting for the loop to come around" problem (coupon collector) — it is a
**decode-rate-per-capture** problem. The user's perception is right: the faster profiles feel
unreliable, and the effective throughput of Fast is _worse_ than Reliable despite its name.

Today nothing in the app measures any of this: there is no visibility into the real capture rate,
the decode success rate, the video resolution actually negotiated with the camera, or whether the
frames that go missing are random or always the same indexes. Every optimization so far would be
a guess.

## Solution

A first iteration that (1) makes the channel measurable and (2) applies the four highest
value-per-cost fixes to the capture and display sides, without touching the frame format.

1. **Diagnostics.** A debug overlay, off by default and enabled with a `?debug=1` URL parameter,
   that reports live scanner statistics: capture attempts/s, successful decodes/s, decode success
   rate, duplicate frames, mean decode time, the negotiated video resolution, and a per-pass
   histogram of which frame indexes are still missing. This is what turns "it feels unreliable"
   into a number, and it is the input for deciding iteration 2.

2. **Camera capture quality.** Request a high-resolution video stream from the camera instead of
   accepting the browser default (frequently 640×480), disable the mirrored-image decode pass, and
   widen the scan box. The dominant suspect for the low decode rate is that a QR version 26 symbol
   (121 modules plus quiet zone) rendered on a phone screen and captured at 480p leaves roughly
   3 px per module — right at the failure edge of any decoder.

3. **Profile retuning.** Reduce the symbol density of the two fast profiles so each module gets
   more camera pixels, and raise the Fast profile's error correction from L (7 % recovery) to M
   (15 %). Fast currently combines the densest symbol with the weakest error correction, which is
   the worst possible pairing for a noisy optical channel. Lowering the chunk size costs nominal
   bytes-per-second but _increases_ effective throughput, because the transfer finishes in one or
   two passes instead of thirty.

4. **Sender frame timing.** Drive the animation with `requestAnimationFrame` against a wall-clock
   deadline rather than `setInterval` + a React state update per frame, and make sure each QR image
   is fully decoded by the browser before it is displayed. This removes frames that are swapped
   mid-repaint (the camera capturing a blend of two symbols) and removes per-frame React rendering
   from the sender's main thread.

The user-visible surface stays the same: same two sections, same three profiles, same Advanced
frame-duration override. Nothing new to learn.

## User Stories

1. As a user sending a transfer, I want the Balanced profile to complete in one or two passes of
   the loop, so that a medium-sized paste does not take half a minute of staring at a phone.
2. As a user sending a transfer, I want the Fast profile to actually be the fastest one end to end,
   so that the profile names describe reality.
3. As a user receiving a transfer, I want the scanner to use the best resolution my camera offers,
   so that dense codes decode on the first attempt instead of the tenth.
4. As a user receiving a transfer on iOS, I want the same reliability as on Android, so that the
   choice of phone does not decide whether the feature works.
5. As a user receiving a transfer on Android, I want the native barcode detector to be used when
   available, so that decoding does not compete with rendering on the main thread.
6. As a user watching the progress bar, I want the count of received frames to keep climbing
   steadily, so that I can tell the transfer is progressing rather than stalled.
7. As a user whose transfer is stuck, I want to see which frames are still missing, so that I know
   to hold the camera steady rather than restarting.
8. As a developer diagnosing reliability, I want to open the app with `?debug=1` and see the real
   capture rate and decode rate, so that I can tell whether the bottleneck is the camera, the
   decoder, or the symbol density.
9. As a developer diagnosing reliability, I want to see the video resolution the browser actually
   negotiated, so that I can confirm the high-resolution request was honoured on this device.
10. As a developer diagnosing reliability, I want to see the mean decode time per capture, so that
    I can tell whether the decoder is the limiting factor (the expected story on iOS, where there
    is no native `BarcodeDetector` and the JavaScript decoder runs on the main thread).
11. As a developer diagnosing reliability, I want to see whether missing frame indexes are random
    or repeat across passes, so that I can distinguish random capture loss from a systematic
    timing/aliasing interaction with the display loop.
12. As a developer diagnosing reliability, I want the number of duplicate frames counted, so that I
    can measure how much of the capture budget is spent re-reading frames already collected.
13. As a developer, I want the debug overlay to be invisible without the URL parameter, so that no
    diagnostic clutter reaches ordinary users.
14. As a developer, I want the statistics logic to be a pure module with unit tests, so that its
    behaviour is verified without a camera or a browser.
15. As a developer, I want the scanner's camera configuration to be produced by a pure function, so
    that the constraints we send are asserted in tests rather than buried in a component.
16. As a developer, I want the animation timing logic to be a pure function of elapsed time, so that
    frame advancement is testable without a DOM.
17. As a maintainer, I want each profile's resulting QR symbol version to be asserted by a test, so
    that a future chunk-size tweak cannot silently push a profile back into the density range that
    caused this problem.
18. As a maintainer, I want the frame format left untouched, so that this iteration cannot break
    interoperability and can be reverted independently of any protocol work.
19. As a maintainer, I want the changed technical numbers to live only in the profiles/config
    modules, so that the components keep containing no hardcoded chunk sizes or error-correction
    levels.
20. As a user who set a frame-duration override in Advanced, I want that override to keep working
    after the retune, so that my saved preference is not silently discarded.
21. As a user who saved a preferred profile, I want it to still load after the retune, so that the
    persisted setting survives the change in its parameters.
22. As a user sending from a laptop to a phone, I want fullscreen playback to stay smooth under the
    new timing loop, so that the display side is never the bottleneck.
23. As a user, I want the sender to keep working when the browser throttles background tabs, so
    that switching away and back does not desynchronise the loop.
24. As a developer planning iteration 2, I want a recorded before/after measurement on both a real
    Android and a real iOS device, so that the decision between fountain-coded redundancy and a
    custom worker-based decode pipeline is made on data.

## Implementation Decisions

### Seams (the testable boundaries this work is organised around)

The guiding rule is fewest new seams, at the highest level. Three of the four changes are pushed
into pure modules under `src/lib/`, which is where the existing Vitest suite already lives; the
React components become thin consumers.

- **`src/lib/transfer/profiles.ts`** — existing seam, reused. The retune is a change to a data
  table plus a new test that derives the QR symbol version from a representative frame.
- **`src/lib/camera.ts`** — existing seam, extended. A new pure function builds the `html5-qrcode`
  start configuration (fps, `qrbox` sizing, `videoConstraints`, `disableFlip`) so the constraints
  are asserted directly instead of through a component.
- **`src/lib/transfer/scanStats.ts`** — one new pure module. A small class in the same style as
  `ChunkCollector`: events in (capture attempted, decode succeeded with a duration, frame accepted /
  duplicate / ignored, pass boundary), a snapshot of derived rates out. No React, no timers of its
  own — the caller supplies timestamps so the tests are deterministic.
- **`src/lib/transfer/frameLoop.ts`** — one new pure module. `frameIndexAt(elapsedMs, frameMs,
total)` and the small amount of arithmetic the animation needs. The React hook that wraps it holds
  only the `requestAnimationFrame` plumbing.

No new seam is introduced for the scanner engine itself. A `ScanEngine` abstraction (so that a
worker-based decoder could be swapped in) is deliberately deferred to iteration 2, when there is a
second implementation to justify it.

### Modules built or modified

- **`profiles.ts`** — retuned table. Direction, to be pinned to measured symbol versions during
  implementation: Reliable stays as-is (it is the profile that works); Balanced drops to a chunk
  size that yields a symbol no denser than version 22 while keeping error correction M; Fast drops
  to a symbol no denser than version 25 and moves from error correction L to M. The invariant that
  the three profiles remain ordered by nominal data rate (`chunkSize / frameMs`) is preserved, and
  the existing test asserting that ordering must keep passing. Frame durations are not changed in
  this iteration — the point is to prove the reliability gain at the current speeds.
- **`config.ts`** — gains the density ceiling constants that the new profile test asserts against
  (maximum QR symbol version per profile tier), so the limits live with the other tunables rather
  than inside a test file.
- **`camera.ts`** — gains the scan-configuration builder. Decisions encoded there: request
  `width: { ideal: 1920 }, height: { ideal: 1080 }` with `facingMode: 'environment'` (an _ideal_
  constraint, never `exact`, so a camera that cannot deliver it still starts rather than throwing);
  `disableFlip: true`, which halves the decoder's work by skipping the mirrored-image pass that is
  useless for a screen-to-camera transfer; and the `qrbox` sizing function moved out of the
  component and widened from 85 % to 95 % of the shorter side. `useBarCodeDetectorIfSupported`
  stays enabled so Chrome/Android keeps using the native detector.
- **`scanStats.ts`** — new. Tracks: capture attempts, successful decodes, decode failures,
  duplicates, ignored frames, decode durations (kept as a running mean plus a max, not a full
  array), first-seen timestamp per frame index, and pass boundaries inferred from the sender's
  loop period. Exposes a plain snapshot object; the overlay renders it, the tests assert it.
- **`frameLoop.ts`** + a `useFrameLoop` hook — new. The hook lives in its own `.ts` file next to
  `AnimatedQR.tsx`, not inside it, because `react-refresh/only-export-components` forbids a `.tsx`
  file exporting both a component and a hook (same arrangement as `usePreparedPayload.ts` beside
  `SendFlow.tsx`).
- **`AnimatedQR.tsx`** — the `setInterval` + `setState`-per-frame loop is replaced by
  `useFrameLoop`, which advances an `<img>` element's `src` through a ref on each animation frame
  when the wall clock says the current frame's duration has elapsed. React state is updated only
  for the visible `n / total` counter, and at a throttled rate rather than once per frame. The
  speed controls, fullscreen behaviour and stop button are unchanged.
- **`qrFrames.ts`** — after rendering, each data URL is handed to an `Image` and awaited via
  `decode()` (falling back to the `load` event where `decode()` is unavailable), so the first
  display of a frame is not delayed by image decoding. The existing periodic yield to the event
  loop stays; the cancellation callback contract is unchanged.
- **`TransferScanner.tsx`** — consumes the new scan configuration builder instead of building the
  config inline, feeds every scan callback into a `ScanStats` instance held in a ref, and renders
  the debug overlay when the flag is on. The discriminated-union receiver state
  (idle → scanning → receiving → assembling → complete | error) is not touched, and the existing
  `finished` flag / `session` counter camera lifecycle is preserved exactly.
- **A debug flag helper** — reads `?debug=1` (or `debug` present with any value) from the URL once
  at module load and exports a boolean. Not persisted, not exposed in the Settings dialog: it is a
  diagnostic, not a feature.

### Deliberate decisions worth recording

- **The debug overlay is not translated.** Its labels are fixed technical English (`captures/s`,
  `decode rate`, `video`, `p50 decode`). The project rule that every user-visible string exists in
  both dictionaries applies to the product surface; adding a dozen throwaway diagnostic keys to
  both `en` and `es` would be noise in a file whose value is that it is complete and reviewed. This
  is a conscious exception and it is confined to content that is unreachable without a URL
  parameter. If it ever becomes user-facing, it gets translated first.
- **`videoConstraints` uses `ideal`, never `exact`.** An `exact` constraint makes
  `getUserMedia` reject on cameras that cannot satisfy it, which would turn a reliability
  improvement into a hard failure on older devices.
- **No change to the protocol, the chunking, the checksum or the assembly path.** Everything in
  this iteration is capture-side or display-side. That keeps the diff reviewable and means a
  regression can be bisected to a single layer.
- **No third mode.** The alternative of shipping these improvements as a separate "Large Transfer
  v2" section alongside the current one was considered and rejected: it duplicates the UI, the i18n
  entries and the documentation, and it pushes a technical choice onto the user who has no way to
  evaluate it. Profiles are already the user-facing knob for this trade-off.
- **Persisted settings remain compatible.** Only profile _parameters_ change, not profile _ids_,
  so a stored `{ profile: 'fast' }` keeps loading. A stored `frameMs` override keeps being
  validated against `FRAME_MS_PRESETS`, which is unchanged.

## Testing Decisions

A good test here asserts externally observable behaviour — the constraints we hand to the camera,
the numbers a profile resolves to, the statistics derived from a sequence of events, the frame
index shown at a given elapsed time. It does not assert that a particular function was called, and
it does not reach into component internals. Prior art: the existing suite in `src/lib/transfer/`
(`protocol.test.ts`, `transfer.test.ts`, `profiles.test.ts`) — pure modules, Node environment, no
DOM, no mocking of the modules under test.

- **`profiles.test.ts`** (extended). Keep the existing invariants. Add a test that, for each
  profile, builds a representative worst-case data frame at that profile's chunk size, renders it
  with the `qrcode` package at that profile's error-correction level, and asserts the resulting
  symbol version is at or below the ceiling declared in `config.ts`. This is the test that makes the
  density decision permanent: the current file only _documents_ the measured versions in a comment,
  which is exactly how they drifted into the failure range. Also assert Fast's error correction is
  no weaker than M.
- **`camera.test.ts`** (new). Assert the built scan configuration: `fps`, `disableFlip: true`, the
  presence of `ideal` (not `exact`) width/height constraints, that `facingMode` is preserved when
  the default camera is selected and _not_ emitted when an explicit device id is chosen, and that
  the `qrbox` function returns a square sized from the shorter dimension for both landscape and
  portrait inputs.
- **`scanStats.test.ts`** (new). Feed scripted event sequences with explicit timestamps and assert
  the snapshot: rates computed over the elapsed window, decode success rate with zero captures not
  producing `NaN`, duplicates counted separately from accepted frames, mean decode time, and the
  missing-index history across simulated passes. Deterministic — the clock is a parameter.
- **`frameLoop.test.ts`** (new). Assert `frameIndexAt` at boundaries: zero elapsed, exactly one
  frame duration, wrap-around past the end of the loop, a single-frame transfer, and a total of
  zero. Assert that large elapsed values (a backgrounded tab) resolve to a valid index rather than
  drifting or throwing.
- **`transfer.test.ts` / `protocol.test.ts`** — must pass unchanged. They are the regression proof
  that the protocol layer was not touched.
- **Manual verification, recorded in this folder.** The unit tests cannot measure an optical
  channel. Before/after runs on a real Android device and a real iOS device, at all three profiles,
  recording loops-to-complete and the debug overlay's decode rate and negotiated resolution. The
  target for this iteration is Balanced completing in ≤ 2 passes; the measurement, not the target,
  is the deliverable, since it decides iteration 2.
- Full gate before finishing: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
  `prettier --check .`.

## Out of Scope

- **Any protocol change.** Fountain-coded redundancy (an LT/`bc-ur`-style scheme where the receiver
  completes with any ~N×1.05 frames regardless of which it missed) is the leading candidate for
  iteration 2 and would be QRTransfer v3. It only pays off once the per-capture decode rate is
  above roughly 0.5, which is what this iteration is for.
- **Replacing `html5-qrcode`.** A custom `getUserMedia` + `createImageBitmap` + Worker pipeline with
  `zxing-wasm` and a real capture queue is the other iteration-2 candidate, most likely to matter on
  iOS where there is no native `BarcodeDetector`. It is gated on the debug overlay showing that
  decode time, not capture quality, is the limiting factor.
- **A `ScanEngine` interface.** Deferred until there is a second engine; introducing the
  abstraction now would be speculative.
- **Interleaved frame ordering across passes.** Analysed and rejected: with capture loss that is
  random per attempt rather than correlated with the index, reordering gains nothing, and fountain
  coding supersedes it entirely.
- **Multiple QR symbols on screen at once, new frame-duration presets, and any change to
  `FRAME_MS_PRESETS`.** Speed is held constant so that the reliability change can be measured in
  isolation.
- **Quick QR (`QRGenerator` / `QRScanner`).** Untouched, including its camera lifecycle.
- **Any form of return channel from receiver to sender** (a second camera, an ACK code). It would
  make retransmission targeted, but it changes the product from "point a camera at a screen" into a
  two-way setup.

## Further Notes

- The arithmetic behind the diagnosis, for whoever picks this up: at `fps: 15` the scanner attempts
  a capture roughly every 66 ms, so a 500 ms frame gets ~7 attempts and a 200 ms frame ~3. Eight
  passes to collect six frames implies a per-pass capture probability near 0.25, hence a per-attempt
  decode probability near 0.04. Any fix that does not move that per-attempt number is treating a
  symptom.
- `html5-qrcode` has no capture queue. Its loop is capture → decode synchronously → schedule the
  next capture, so a decode slower than the frame interval silently lowers the real sampling rate.
  That is precisely what the debug overlay's decode-time figure is there to expose, and it is the
  strongest argument for the worker pipeline if the numbers demand it.
- The comment block at the top of `profiles.ts` documents the measured symbol version for each
  profile. It must be updated as part of the retune — and the new test exists so it can never again
  be the only thing keeping those numbers honest.
- No issue tracker is configured for this repository, so this spec is filed as a document rather
  than an issue; the `ready-for-agent` state is recorded in the header above.

---

## Implementation Notes

Recorded after building the iteration. Where these contradict the sections above, these are what the
code does — the spec was written before the libraries were read.

### Corrections to the spec's own premises

- **The profile density figures in the spec (and in the original `profiles.ts` comment) were right;
  an early re-measurement was wrong.** Measuring with a single repeated character as the payload
  lets `qrcode` pick its denser alphanumeric mode and under-reports the version by several steps.
  Base64URL payloads are mixed-case and force byte mode, so the test builds its sample frame through
  the real `encodeFrame`. Actual before/after, byte mode, worst-case frame:

  | profile  | before                         | after                         |
  | -------- | ------------------------------ | ----------------------------- |
  | reliable | 400 B @ Q → v22 (105 modules)  | unchanged                     |
  | balanced | 750 B @ M → v26 (121 modules)  | 550 B @ M → v22 (105 modules) |
  | fast     | 1000 B @ L → v26 (121 modules) | 600 B @ M → v23 (109 modules) |

  Reliable is the profile users report as working, so its 105-module symbol became the known-good
  reference the other two were pulled back to. `MAX_QR_VERSION` in `config.ts` is
  `{ reliable: 22, balanced: 22, fast: 23 }`. Speed, not density, is now what separates the three.

- **`videoConstraints` replaces the camera argument, it does not merge with it.** Passing
  width/height in `configuration.videoConstraints` while leaving `deviceId` in the first argument of
  `start()` makes `html5-qrcode` ignore the user's camera choice silently. `buildScanConfig` puts
  the camera identity inside `videoConstraints`. Passing `{ facingMode, width, height }` as the
  first argument instead would throw outright — that object is required to have exactly one key.

- **The capture loop is not a fixed interval.** `html5-qrcode` chains `setTimeout(1000 / fps)`
  _after_ each decode finishes, so the period is `decode + 1000/fps` and the effective rate is
  always below `fps`. `SCAN_FPS` went from 15 to 25 to cut that dead time from 66 ms to 40 ms.

- **`disableFlip` was doing more damage than the spec assumed.** Left at its default, every failed
  capture is decoded a second time mirrored — double the work per tick, and two error callbacks per
  tick. Setting it true is both a performance fix and the precondition that makes
  `attempts = decodes + failures` exact.

### Deviations from the specified design

- **Statistics.** "Frames missing per loop pass" is not computable: the receiver never learns the
  sender's frame duration. It is replaced by **sightings per frame index**, which answers the same
  diagnostic question — an index that is systematically missed simply never appears. Decode time
  cannot be measured from outside either; the tick period is measured and the known scheduling
  delay subtracted to estimate it.
- **Debug flag.** `?debug=1` only, no toggle in Advanced: the settings dialog renders inside
  `SendFlow`, so Advanced does not exist on the Receive tab, which is the device that needs the
  overlay. No new strings entered `i18n.ts`.
- **QR image scaling (not in the original spec).** Frames were rendered at 750 px and displayed at
  up to 560 px CSS with `image-rendering: pixelated`; non-integer downscaling without interpolation
  produces modules of uneven width. Frames are now rendered with `toDataURL`'s `width` at a whole
  number of pixels per module (~900 px), computed **per frame** — the header and the final partial
  chunk land on different QR versions than the full frames — and cached by frame length so it costs
  about three measurements per transfer. `.transfer-qr` now interpolates instead of using
  nearest-neighbour.
- **Sender loop.** Driven by `requestAnimationFrame` against `performance.now()`, with the image
  `src` assigned through a ref so the counter's re-render never touches the image. Two consequences
  worth knowing: a hidden tab now freezes the loop completely (rAF does not fire when hidden, where
  `setInterval` kept running) — correct for a sender that only matters while visible — and changing
  speed mid-transfer restarts the loop at frame 0, which is harmless because the receiver accepts
  frames in any order.

### Follow-up: debug tooling round two

Requested directly in chat, not written into the original spec — the constraint was "must not
break anything, must stay debug-only." Not judged against this spec's requirements, only against
that constraint.

- The debug overlay now survives past `complete` instead of unmounting with the rest of the
  receiving UI, and freezes on its final numbers when the transfer finishes: the first real
  measurement (below) was contaminated by having to read the overlay while still holding the phone
  steady enough to scan, which is exactly the failure mode a reliability instrument should not
  cause.
- A "copy report" button (`formatScanReport` in `scanStats.ts`) copies the full snapshot as text,
  with a `document.execCommand('copy')` fallback (`src/lib/clipboard.ts`) for the plain-HTTP LAN
  setup this feature is normally tested under, where `navigator.clipboard` does not exist.
- A periodic timeline sample (every 500 ms, capped at 600 rows) is recorded on the overlay's own
  refresh timer, never on the scan path, so sampling cannot slow down what it measures. It answers
  whether the decode rate degrades over a run rather than holding steady — a question the earlier
  snapshot-only view could not answer.
- `ScanStats` gained `recordTotalFrames` and `recordComplete`, so the report's headline numbers are
  time-to-complete and frames-received-of-total — the two figures the "≤ 2 passes" target is
  actually judged against.

### Verification performed

`typecheck`, `lint`, `test` (108 passing, 12 files), `build` and `prettier --check` all pass.
Verified in a real browser: the loop advances, `1 / 9` through `9 / 9`, no console errors, and the
per-frame natural width is exactly as intended (header 901 px = 53 modules × 17, data frames
981 px = 109 modules × 9). With `?debug=1` absent, confirmed no `.scan-debug` node mounts and no
console errors appear on either the Send or Receive tab.

A `/code-review` (Standards + Spec axes, run against `HEAD`) found nothing blocking. Two open
items from it:

- **Standards, judgement call, unresolved:** the debug overlay's labels (`captures/s`, `decode
rate`, `copy report`, …) are hardcoded English in the JSX, bypassing `i18n.ts`. CLAUDE.md's rule
  — "every user-visible string must be added to both en and es" — states no carve-out for
  diagnostic UI, and the overlay is real DOM rendered to a real user, gated only by a URL parameter
  rather than a build flag. The Implementation Decisions section above treats this as deliberate;
  the review disagrees that the exception is self-evidently correct. Left unresolved pending a call
  on whether debug-only UI is exempt from the translation rule, or should be — worth deciding
  before any further debug UI is added, so the exception (if kept) is written down as a rule rather
  than repeated as a judgement call each time.
- **Standards, minor, not actioned:** `formatScanReport`'s text field list and `ScanDebug`'s `<dl>`
  markup duplicate the same set of fields independently; a shared `{ label, value }` list would
  remove the duplication. Small enough to defer.

**Still outstanding, and it is the actual deliverable of this iteration:** the before/after
measurement on a real Android and a real iOS device, at all three profiles, recording time to
complete and frames received (now surfaced directly by the debug tooling above) plus the overlay's
decode rate and negotiated resolution. Also unverified here, because it needs hardware: the camera
`<select>` regression (choosing a non-default camera must still work — this is the
`videoConstraints` trap and no unit test can catch it) and the debug overlay's live rendering, which
only appears once a camera is running.
