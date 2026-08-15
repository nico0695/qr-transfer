# QR Transfer

Minimalist web application for transferring text between devices using QR codes.
Everything runs in the browser: no backend, no database, no storage — the text
never leaves your device.

- **Quick QR**
  - **Generate QR**: type text (up to 2000 characters) and a QR code is generated in real time.
  - **Scan QR**: scan a QR code with the camera and copy the resulting text.
- **Large Transfer**: paste a large text (KBs to hundreds of KB — Markdown, JSON, logs, configs…),
  it is gzip-compressed, split into chunks and shown as an animated loop of QR codes; the other
  device scans continuously, collects the frames in any order, verifies the checksum and rebuilds
  the exact original text. See [Large Transfer](docs/large-transfer.md).

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

## HTTPS and the camera

Camera access (`getUserMedia`) requires a **secure context**:

- In development it works on `http://localhost` (browsers treat it as secure).
- In production the application must be served over **HTTPS**, otherwise Scan QR
  mode will not be able to access the camera.
