# QR Transfer

Minimalist web application for transferring text between devices using QR codes.
Everything runs in the browser: no backend, no database, no storage — the text
never leaves your device.

- **Generate QR**: type text (up to 2000 characters) and a QR code is generated in real time.
- **Scan QR**: scan a QR code with the camera and copy the resulting text.

Documentation: [Technical Overview](docs/technical-overview.md) ·
[Transfer Flow](docs/qr-transfer-flow.md)

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
