# Flow Diagrams

> The same three flows as state machines, for the shape of the logic rather than its pixels.
> Mirrors the discriminated unions in the code exactly — see the source file noted under each
> diagram if a transition looks surprising.

## Table of Contents

- [Quick QR — Scan](#quick-qr--scan)
- [Large Transfer — Send](#large-transfer--send)
- [Large Transfer — Receive](#large-transfer--receive)

## Quick QR — Scan

Source: `src/components/QRScanner.tsx` (`Status = starting | scanning | done | error`).

```mermaid
stateDiagram-v2
    [*] --> starting: tab opened
    starting --> scanning: camera started
    starting --> error: permission denied / no camera / not readable / other
    scanning --> done: QR decoded
    scanning --> error: decode of an empty QR
    done --> starting: Scan again
    error --> starting: Try again
```

## Large Transfer — Send

Source: `src/components/large-transfer/SendFlow.tsx`
(`SenderState = editing | preparing | transferring`). Source/text/file/settings live one level up
in `LargeTransfer.tsx` and survive every transition below, including Stop.

```mermaid
stateDiagram-v2
    [*] --> editing
    editing --> editing: switch Text/File source, type, pick/drop a file, change settings
    editing --> preparing: Start transfer (payload ready, size within limit)
    preparing --> editing: Cancel, or frame rendering fails
    preparing --> transferring: all QR frames rendered
    transferring --> editing: Stop transfer
```

Within `editing`, the summary shown below the composer depends only on payload size — not a
separate top-level state, but worth tracking since it drives whether Start is enabled:

```mermaid
stateDiagram-v2
    [*] --> idle: no content yet
    idle --> preparing: content entered (debounced 250ms for text)
    preparing --> ready: payload computed
    preparing --> error: source unreadable / over 20MB
    ready --> ready: ok / large (>=100KB) / veryLarge (>=500KB) — Start enabled
    ready --> tooLarge: compressed size > 2MB — Start disabled
```

## Large Transfer — Receive

Source: `src/components/large-transfer/useTransferScanner.ts`
(`idle | scanning | receiving | assembling | complete | error`).

```mermaid
stateDiagram-v2
    [*] --> idle: tab opened, camera starting
    idle --> scanning: camera ready
    idle --> error: permission denied / no camera / not readable / other
    scanning --> receiving: header frame decoded
    scanning --> error: incompatible protocol version detected
    receiving --> receiving: another data frame accepted
    receiving --> assembling: all frames collected
    assembling --> complete: checksum verified — text or file result
    assembling --> error: checksum mismatch (verificationFailed)
    complete --> idle: Scan another
    error --> idle: Try again
```
