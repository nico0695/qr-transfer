# Component Index

> The same UI, cut a different way: one row per reusable piece instead of one section per screen.
> Useful for a component-library pass. Crops are single elements from `docs/design/screens/80-
components/`; see the flow docs for full-page context.

## Table of Contents

- [Navigation](#navigation)
- [Content controls](#content-controls)
- [File handling](#file-handling)
- [Feedback](#feedback)
- [Overlays](#overlays)

## Navigation

| Component                                   | CSS class    | Desktop                                                           | Mobile                                                           |
| ------------------------------------------- | ------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| Nav menu (Quick QR / Large Transfer)        | `.nav`       | ![](screens/80-components/01-nav-menu.desktop.light.png)          | ![](screens/80-components/01-nav-menu.mobile.light.png)          |
| Tabs (Send / Receive; also Generate / Scan) | `.tabs`      | ![](screens/80-components/02-tabs.desktop.light.png)              | ![](screens/80-components/02-tabs.mobile.light.png)              |
| Segmented control (Text / File)             | `.segmented` | ![](screens/80-components/03-segmented-control.desktop.light.png) | ![](screens/80-components/03-segmented-control.mobile.light.png) |

## Content controls

| Component                                                         | CSS class          | Desktop                                                        | Mobile                                                        |
| ----------------------------------------------------------------- | ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Editor toolbar (Undo/Redo/Find/Wrap/Format/Copy/Clear/Fullscreen) | `.editor-toolbar`  | ![](screens/80-components/04-editor-toolbar.desktop.light.png) | ![](screens/80-components/04-editor-toolbar.mobile.light.png) |
| Summary list (definition list, label/value rows)                  | `.summary-list`    | ![](screens/80-components/05-summary-list.desktop.light.png)   | ![](screens/80-components/05-summary-list.mobile.light.png)   |
| Actions row (secondary + primary button, split)                   | `.actions-between` | ![](screens/80-components/06-actions-row.desktop.light.png)    | ![](screens/80-components/06-actions-row.mobile.light.png)    |

## File handling

| Component                                      | CSS class    | Desktop                                                   | Mobile                                                   |
| ---------------------------------------------- | ------------ | --------------------------------------------------------- | -------------------------------------------------------- |
| Dropzone (empty state)                         | `.dropzone`  | ![](screens/80-components/07-dropzone.desktop.light.png)  | ![](screens/80-components/07-dropzone.mobile.light.png)  |
| File card (selected file, with thumbnail here) | `.file-card` | ![](screens/80-components/08-file-card.desktop.light.png) | ![](screens/80-components/08-file-card.mobile.light.png) |

## Feedback

| Component                                          | CSS class | Desktop                                                | Mobile                                                |
| -------------------------------------------------- | --------- | ------------------------------------------------------ | ----------------------------------------------------- |
| Notice (informational, e.g. size warnings)         | `.notice` | ![](screens/80-components/09-notice.desktop.light.png) | ![](screens/80-components/09-notice.mobile.light.png) |
| Error (blocking, e.g. too-large / camera failures) | `.error`  | ![](screens/80-components/10-error.desktop.light.png)  | ![](screens/80-components/10-error.mobile.light.png)  |

Both share the same typographic treatment today (see `README.md`'s "Known UX issues" — a good
candidate for visual differentiation in the redesign).

## Overlays

| Component                       | CSS class         | Desktop                                                        | Mobile                                                        |
| ------------------------------- | ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Dialog body (Transfer settings) | `.dialog-body`    | ![](screens/80-components/11-dialog.desktop.light.png)         | ![](screens/80-components/11-dialog.mobile.light.png)         |
| Profile radio option            | `.profile-option` | ![](screens/80-components/12-profile-option.desktop.light.png) | ![](screens/80-components/12-profile-option.mobile.light.png) |

The dialog is a native `<dialog>` element (focus trap, Escape-to-close and focus restoration come
free from the browser) that becomes a bottom sheet under 760 px — see
`flows/large-transfer-send.md#settings` for both breakpoints side by side, and
`flows/large-transfer-send.md` and `flows/large-transfer-receive.md` / `flows/quick-qr.md` for
every full-screen context these pieces appear in (buttons, `.panel`, `.progress-bar`, `.result`,
`.received-summary` and the two fullscreen overlays aren't cropped separately here — they only
make sense in context and are already covered by the flow docs).
