# App Shell

> The header, navigation and responsive rules every screen in the app sits inside. Source:
> `src/App.tsx`, `src/components/NavMenu.tsx`, `src/components/ModeTabs.tsx`, `src/styles.css`.

## Table of Contents

- [Structure](#structure)
- [States](#states)
- [Responsive rules](#responsive-rules)
- [Copy inventory](#copy-inventory)

## Structure

Every screen shares one shell:

1. **Header** — app title "QR Transfer", a one-line subtitle, and two toggle buttons: theme
   (🌙/☀️) and language (EN/ES). Neither choice is persisted — both reset to the OS's
   `prefers-color-scheme` and `navigator.language` on every reload.
2. **NavMenu** — two links, "Quick QR" and "Large Transfer", switching the whole app body. Not a
   route: clicking one just swaps which component `App.tsx` renders. The active item gets
   `aria-current="page"`.
3. **Section body** — Quick QR additionally shows a `ModeTabs` row (Generate QR / Scan QR) above
   its content; Large Transfer shows its own Send/Receive tabs (see the flow docs).

There is no routing anywhere in the app: section, mode, theme and language are all in-memory
`useState` in `App.tsx`. A reload always lands back on Quick QR → Generate QR.

## States

| State                             | Desktop                                                               | Mobile                                                               |
| --------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Home (Quick QR → Generate, empty) | ![](../screens/00-app-shell/01-home.desktop.light.png)                | ![](../screens/00-app-shell/01-home.mobile.light.png)                |
| Home — dark                       | ![](../screens/00-app-shell/01-home.desktop.dark.png)                 | ![](../screens/00-app-shell/01-home.mobile.dark.png)                 |
| Header + nav (cropped)            | ![](../screens/00-app-shell/02-header-and-nav.desktop.light.png)      | ![](../screens/00-app-shell/02-header-and-nav.mobile.light.png)      |
| Large Transfer home               | ![](../screens/00-app-shell/03-large-transfer-home.desktop.light.png) | ![](../screens/00-app-shell/03-large-transfer-home.mobile.light.png) |
| Large Transfer home — dark        | ![](../screens/00-app-shell/03-large-transfer-home.desktop.dark.png)  | ![](../screens/00-app-shell/03-large-transfer-home.mobile.dark.png)  |

## Responsive rules

Single breakpoint at **760 px** (`src/styles.css`):

- Below 760 px: the app is edge-to-edge (no max-width), the Quick QR result panel
  (`.qr-panel`) is `min-height: 85svh` so a shown QR fills the screen for easy scanning by another
  device, and a mobile-only "Show QR" button appears (see `flows/quick-qr.md`).
- At 760 px and above: `.app` caps at `max-width: 880px`, centered; the Quick QR generator becomes
  a two-column grid (`1fr 320px`) with the QR panel sticky alongside the textarea; the mobile-only
  button is hidden; the Large Transfer settings dialog is centered instead of a bottom sheet (see
  `large-transfer-send.md`).

## Copy inventory

| Key                              | English                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| `subtitle`                       | Transfer text between devices using QR codes.                |
| `switchToDark` / `switchToLight` | Switch to dark mode / Switch to light mode (aria-label only) |
| `navQuick`                       | Quick QR                                                     |
| `navLarge`                       | Large Transfer                                               |
| `navLabel`                       | Sections (aria-label on the `<nav>`)                         |
