# QR Transfer

Minimalist web application for transferring text and files between devices using QR codes.
Everything runs in the browser: no backend, no database, no uploads — the content never leaves
your device (the only thing stored locally is your preferred transfer profile).

- **Quick QR**
  - **Generate QR**: type text (up to 2000 characters) and a QR code is generated in real time.
  - **Scan QR**: scan a QR code with the camera and copy the resulting text.
- **Large Transfer**: paste a large text (Markdown, JSON, logs, configs…) or pick **one file**
  (documents, images, archives, small binaries); it is compressed when that helps, split into
  chunks and shown as an animated loop of QR codes with a Reliable / Balanced / Fast profile; the
  other device scans continuously, collects the frames in any order, verifies the SHA-256 and
  rebuilds the exact original — text to copy/view, files to download (images with preview). See
  [Large Transfer](docs/large-transfer.md).

Documentation: [Technical Overview](docs/technical-overview.md) ·
[Transfer Flow](docs/qr-transfer-flow.md) · [Large Transfer](docs/large-transfer.md)

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Installation

```bash
npm install
```

## Scripts

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Development server (http://localhost:5173) |
| `npm run build`        | Production build into `dist/`              |
| `npm run preview`      | Serve the `dist/` build locally            |
| `npm run lint`         | Run ESLint                                 |
| `npm run lint:fix`     | ESLint with autofix                        |
| `npm run format`       | Format the code with Prettier              |
| `npm run format:check` | Check formatting without modifying files   |
| `npm run typecheck`    | Type-check with TypeScript                 |
| `npm test`             | Run unit tests (Vitest)                    |

## Deployment

`npm run build` generates a fully static application in `dist/`. It can be served
with any static file server (nginx, Caddy, etc.):

```bash
# Example with Caddy
caddy file-server --root dist

# Example with nginx: point `root` at the contents of dist/
```

## Browser support

- Camera scanning needs `getUserMedia` (see below).
- Large Transfer uses the native `CompressionStream` / `DecompressionStream` APIs and
  `crypto.subtle`: Chrome/Edge 80+, Safari 16.4+, Firefox 113+.

## HTTPS and the camera

Camera access (`getUserMedia`) requires a **secure context**:

- In development it works on `http://localhost` (browsers treat it as secure).
- In production the application must be served over **HTTPS**, otherwise Scan QR and
  Large Transfer → Receive will not be able to access the camera.
