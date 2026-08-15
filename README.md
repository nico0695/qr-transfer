# QR Transfer

Aplicación web minimalista para transferir texto entre dispositivos usando códigos QR.
Todo funciona en el navegador: no hay backend, base de datos ni almacenamiento — el texto
nunca sale de tu dispositivo.

- **Generate QR**: escribí texto (hasta 2000 caracteres) y se genera un QR en tiempo real.
- **Scan QR**: escaneá un QR con la cámara y copiá el texto obtenido.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm

## Instalación

```bash
npm install
```

## Scripts

| Comando                | Descripción                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo (http://localhost:5173) |
| `npm run build`        | Build de producción en `dist/`                 |
| `npm run preview`      | Sirve el build de `dist/` localmente           |
| `npm run lint`         | Ejecuta ESLint                                 |
| `npm run lint:fix`     | ESLint con autofix                             |
| `npm run format`       | Formatea el código con Prettier                |
| `npm run format:check` | Verifica el formato sin modificar archivos     |
| `npm run typecheck`    | Verifica tipos con TypeScript                  |

## Deploy

`npm run build` genera una aplicación completamente estática en `dist/`. Se puede servir
con cualquier static file server (nginx, Caddy, etc.):

```bash
# Ejemplo con Caddy
caddy file-server --root dist

# Ejemplo con nginx: apuntar `root` al contenido de dist/
```

## HTTPS y cámara

El acceso a la cámara (`getUserMedia`) requiere un **secure context**:

- En desarrollo funciona en `http://localhost` (los navegadores lo tratan como seguro).
- En producción la aplicación debe servirse por **HTTPS**, de lo contrario el modo
  Scan QR no podrá acceder a la cámara.
