# Component Index

> The 12 primitives (`src/components/primitives/`), one row per component. Crops are single
> `<section>`s from the dev-only `?demo=primitives` page (`docs/design/screens/80-components/`);
> see `DESIGN_SYSTEM.md` for the full spec of each and the flow docs for in-context usage.

## Table of Contents

- [Actions & input](#actions--input)
- [Navigation](#navigation)
- [Status](#status)
- [Surfaces & overlays](#surfaces--overlays)
- [Feedback & progress](#feedback--progress)

## Actions & input

| Component | Source               | Desktop                                                | Mobile                                                |
| --------- | -------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| Button    | `primitives/Button/` | ![](screens/80-components/01-button.desktop.light.png) | ![](screens/80-components/01-button.mobile.light.png) |
| Input     | `primitives/Input/`  | ![](screens/80-components/02-input.desktop.light.png)  | ![](screens/80-components/02-input.mobile.light.png)  |

Button: primary / secondary / destructive variants, `loading` (spinner overlay, label hidden —
never combine with a separately-labelled adjacent spinner), `disabled`, `sm`/`icon` sizes. Input is
a namespace (`Input.Textarea`, `Input.Select`, `Input.Range`), not a component itself — three
separate elements sharing one stylesheet for focus ring and placeholder color.

## Navigation

| Component        | Source                         | Desktop                                                           | Mobile                                                           |
| ---------------- | ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| SegmentedControl | `primitives/SegmentedControl/` | ![](screens/80-components/03-segmented-control.desktop.light.png) | ![](screens/80-components/03-segmented-control.mobile.light.png) |
| Tabs             | `primitives/Tabs/`             | ![](screens/80-components/04-tabs.desktop.light.png)              | ![](screens/80-components/04-tabs.mobile.light.png)              |

Both are `role="radiogroup"`/radio-button groups under the hood, not native tabs/radios styled —
arrow keys move focus and the checked option, matching native radio semantics. `SegmentedControl`
backs Send/Receive and Text/File; `Tabs` backs the Quick QR / Large Transfer mode switch.

## Status

| Component | Source                  | Desktop                                                    | Mobile                                                    |
| --------- | ----------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| StatusDot | `primitives/StatusDot/` | ![](screens/80-components/05-status-dot.desktop.light.png) | ![](screens/80-components/05-status-dot.mobile.light.png) |
| Chip      | `primitives/Chip/`      | ![](screens/80-components/06-chip.desktop.light.png)       | ![](screens/80-components/06-chip.mobile.light.png)       |

`StatusDot`'s `live` variant pulses (`--anim-*`, disabled under `prefers-reduced-motion`) — the
camera viewfinder's "Live" badge. `Chip` optionally renders a Remove (×) button; the receive
flow's missing-frames list is a scrollable row of plain (non-removable) `Chip`s, one per index.

## Surfaces & overlays

| Component     | Source               | Desktop                                                | Mobile                                                |
| ------------- | -------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| Card          | `primitives/Card/`   | ![](screens/80-components/07-card.desktop.light.png)   | ![](screens/80-components/07-card.mobile.light.png)   |
| Icon          | `primitives/Icon/`   | ![](screens/80-components/08-icon.desktop.light.png)   | ![](screens/80-components/08-icon.mobile.light.png)   |
| Dialog        | `primitives/Dialog/` | ![](screens/80-components/10-dialog.desktop.light.png) | ![](screens/80-components/10-dialog.mobile.light.png) |
| Dialog — dark |                      | ![](screens/80-components/10-dialog.desktop.dark.png)  | ![](screens/80-components/10-dialog.mobile.dark.png)  |

Card takes `padding`/`radius` props and an optional `dashed` border (the Dropzone empty state).
Icon wraps a fixed 28-icon `lucide-react` inventory (`docs/DESIGN_SYSTEM.md` §4.8) behind one
`name` prop, so nothing imports `lucide-react` directly outside this file. Dialog is a native
`<dialog>` — modal on desktop, bottom sheet (safe-area padding, top-corners-only radius) below
900px; `showModal`/`close`, focus trap, Escape-to-close and focus restoration all come from the
element itself, not reimplemented in JS. It backs the transfer settings sheet
(`flows/large-transfer-send.md#settings`).

## Feedback & progress

| Component   | Source                    | Desktop                                                      | Mobile                                                      |
| ----------- | ------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| Feedback    | `primitives/Feedback/`    | ![](screens/80-components/09-feedback.desktop.light.png)     | ![](screens/80-components/09-feedback.mobile.light.png)     |
| ProgressBar | `primitives/ProgressBar/` | ![](screens/80-components/11-progress-bar.desktop.light.png) | ![](screens/80-components/11-progress-bar.mobile.light.png) |
| Spinner     | `primitives/Spinner/`     | ![](screens/80-components/12-spinner.desktop.light.png)      | ![](screens/80-components/12-spinner.mobile.light.png)      |

`Feedback` is the three-level notice/error/verified shape from `DESIGN_SYSTEM.md` §5.7/§6.3 — pick
the level by _recoverability_, not just tone: notice = can proceed, error = blocked (and the
blocking control must be `disabled`), verified = succeeded. Its icon and color are what signal
"verified" — no separate checkmark text alongside it (see `flows/large-transfer-receive.md`).
`ProgressBar` renders `role="progressbar"` with a label slot, used for the receive flow's frame
count. `Spinner` has `sm`/`md`/`lg` sizes and requires an `aria-label`.

Not cropped separately (they only exist embedded in a real screen, not the demo page): the
animated QR loop, the camera viewfinder guide/badge/hit-flash, and the settings sheet's
`ProfileOption` radio card — see `flows/large-transfer-send.md` and
`flows/large-transfer-receive.md` for those in context.
