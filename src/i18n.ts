import { createContext, useContext } from 'react'

export type Lang = 'es' | 'en'

const en = {
  subtitle: 'Transfer text between devices using QR codes.',
  switchToDark: 'Switch to dark mode',
  switchToLight: 'Switch to light mode',
  tabGenerate: 'Generate QR',
  tabScan: 'Scan QR',
  textLabel: 'Text to transfer',
  textPlaceholder: 'Type or paste the text you want to transfer…',
  limitReached: ' — limit reached',
  copy: 'Copy',
  copied: 'Copied!',
  copyFailed: 'Copy failed',
  clear: 'Clear',
  showQr: 'Show QR',
  qrPlaceholder: 'The QR code will appear here.',
  qrTooLong: 'This text is too long to fit in a QR code. Try shortening it.',
  loadingScanner: 'Loading scanner…',
  cameraLabel: 'Camera',
  cameraDefault: 'Default (back camera)',
  startingCamera: 'Starting camera…',
  scanHint: 'Point the camera at a QR code.',
  scannedText: 'Scanned text',
  scanAgain: 'Scan again',
  tryAgain: 'Try again',
  errorPermission:
    'Camera access was denied. Allow camera access in your browser settings and try again.',
  errorNoCamera: 'No camera was found on this device.',
  errorNotReadable: 'The camera is not available. It may be in use by another app.',
  errorGeneric: 'The camera could not be started. Please try again.',
  errorEmptyQr: 'The QR code does not contain any readable text.',
}

export type Messages = typeof en

const es: Messages = {
  subtitle: 'Transferí texto entre dispositivos usando códigos QR.',
  switchToDark: 'Cambiar a modo oscuro',
  switchToLight: 'Cambiar a modo claro',
  tabGenerate: 'Generar QR',
  tabScan: 'Escanear QR',
  textLabel: 'Texto a transferir',
  textPlaceholder: 'Escribí o pegá el texto que querés transferir…',
  limitReached: ' — límite alcanzado',
  copy: 'Copiar',
  copied: '¡Copiado!',
  copyFailed: 'Error al copiar',
  clear: 'Limpiar',
  showQr: 'Ver QR',
  qrPlaceholder: 'El código QR va a aparecer acá.',
  qrTooLong: 'El texto es demasiado largo para un código QR. Probá acortarlo.',
  loadingScanner: 'Cargando escáner…',
  cameraLabel: 'Cámara',
  cameraDefault: 'Predeterminada (cámara trasera)',
  startingCamera: 'Iniciando cámara…',
  scanHint: 'Apuntá la cámara a un código QR.',
  scannedText: 'Texto escaneado',
  scanAgain: 'Escanear de nuevo',
  tryAgain: 'Reintentar',
  errorPermission:
    'Se denegó el acceso a la cámara. Permitilo en la configuración del navegador y volvé a intentar.',
  errorNoCamera: 'No se encontró una cámara en este dispositivo.',
  errorNotReadable: 'La cámara no está disponible. Puede estar en uso por otra aplicación.',
  errorGeneric: 'No se pudo iniciar la cámara. Volvé a intentar.',
  errorEmptyQr: 'El código QR no contiene texto legible.',
}

export const messages: Record<Lang, Messages> = { en, es }

export function detectLang(): Lang {
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export const LangContext = createContext<Messages>(en)

export function useI18n(): Messages {
  return useContext(LangContext)
}
