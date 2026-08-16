# QR Transfer — Design Brief

> A one-page orientation for a designer picking up this project: what the app does, what it
> deliberately does not do, and the constraints a redesign has to respect.

## Table of Contents

- [What it is](#what-it-is)
- [Who it's for](#whos-it-for)
- [Hard constraints](#hard-constraints)
- [The two modes](#the-two-modes)
- [What's fair game to redesign](#whats-fair-game-to-redesign)
- [Where to start](#where-to-start)

## What it is

QR Transfer moves text and files between two devices using only their screens and cameras. One
device shows a QR code (or an animated sequence of them for larger content); the other scans it
with its camera. There is no server, no account, no network request of any kind, and the app
stores nothing except which transfer profile you last picked. It's meant for the moment you need
to get a password, a snippet, a photo or a small document from a laptop to a phone (or the
reverse) with no shared network, no cable, and no third-party service in the loop.

## Who it's for

Anyone who hits "how do I get this text/file to my other device right now" without a cable or a
common Wi-Fi network — travelers, people on separate networks, air-gapped or trust-sensitive
transfers. No sign-up, no install (it's a PWA-shaped static site), works offline once loaded.

## Hard constraints

These come from the architecture and should be treated as fixed for the redesign:

- **No backend, no network calls, no persistence of content.** Whatever the redesign proposes has
  to keep working as a static site with the sender and receiver as the only two participants.
- **Optical channel only.** The transfer medium is literally "camera reads screen." Frame size,
  contrast, and animation speed are not just visual choices — they're bounded by what a phone
  camera can decode at arm's length (see `docs/large-transfer.md` for the measured limits). A
  redesign can restyle the chrome around the QR but shouldn't shrink the code itself, reduce its
  contrast, or add motion behind/around it during an active transfer.
- **Compression and integrity happen automatically**, using gzip when it helps and a SHA-256 check
  on every received transfer — the receiver won't show or offer to download anything until the
  checksum matches. This is a trust feature worth keeping visible ("✓ Verified"), not hiding.
- **Two flows, symmetric-ish but not identical.** Quick QR is synchronous and single-shot (type →
  QR appears; scan → text appears). Large Transfer is a multi-step wizard: compose → review a
  summary → optionally tweak settings → start → animated QR / camera scan → progress → verified
  result. Don't merge them into one flow; they solve different problems (a URL/password vs. a
  document/photo).

## The two modes

**Quick QR** (`flows/quick-qr.md`) — type or paste up to 2000 characters, get one static QR code
immediately; or scan someone else's QR and get the text back. No settings, no file support, no
compression. This is the "just get me a QR code" path.

**Large Transfer** (`flows/large-transfer-send.md`, `flows/large-transfer-receive.md`) — text of
any length or exactly one file, chunked across many QR frames shown in a loop. Three presets
(Reliable / Balanced / Fast) trade transfer speed against how forgiving the scan is; a single
Advanced override lets the sender slow the loop down further if the receiver's camera is
struggling. The receiver's progress view is deliberately informative (frame count, missing-frame
list) because unlike Quick QR this is not instantaneous — it can take anywhere from a couple of
seconds to tens of seconds depending on content size and profile.

## What's fair game to redesign

Visual language (color, type, spacing, iconography), the settings dialog's presentation
(currently a native `<dialog>`/bottom-sheet with plain radios), how warnings and errors are
differentiated, the mobile "Show QR" scroll pattern in Quick QR, and generally anything that isn't
listed under Hard Constraints above. See `README.md`'s "Known UX issues" section for specific
opportunities spotted while building this catalog.

## Where to start

1. `flows/app-shell.md` — the shell every screen sits inside (header, nav, responsive rules).
2. `flows/quick-qr.md` and `flows/large-transfer-send.md` / `large-transfer-receive.md` — the two
   flows end to end, screenshots inline.
3. `components.md` — the same UI cut a different way, by reusable piece instead of by screen.
