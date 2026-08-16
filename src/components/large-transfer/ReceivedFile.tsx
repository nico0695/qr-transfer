import { useEffect, useMemo, useRef, useState } from 'react'
import { ResultPanel } from '../app/ResultPanel'
import { Button } from '../primitives/Button'
import buttonStyles from '../primitives/Button/Button.module.css'
import { cx } from '../../lib/cx'
import { useI18n } from '../../i18n'
import { formatBytes } from '../../lib/format'
import { sanitizeFilename } from '../../lib/transfer/filename'
import type { ReceivedTransfer } from '../../lib/transfer/types'
import styles from './ReceivedFile.module.css'

interface ReceivedFileProps {
  file: Extract<ReceivedTransfer, { type: 'file' }>
  onScanAnother: () => void
}

function canCopyImages(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  )
}

/** Re-encodes any browser-decodable image as PNG, the only type clipboards reliably accept. */
async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (png) => (png ? resolve(png) : reject(new Error('toBlob failed'))),
        'image/png',
      ),
    )
  } finally {
    bitmap.close()
  }
}

/**
 * Verified file result: name / size / MIME, an image preview when applicable, local Download
 * (a Blob object URL, revoked on unmount) and optional Copy image.
 */
export function ReceivedFile({ file, onScanAnother }: ReceivedFileProps) {
  const t = useI18n()
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyTimerRef = useRef<number | undefined>(undefined)
  const isImage = file.mimeType.startsWith('image/')
  const downloadName = useMemo(() => sanitizeFilename(file.filename), [file.filename])
  const blob = useMemo(
    () => new Blob([file.bytes as BlobPart], { type: file.mimeType }),
    [file.bytes, file.mimeType],
  )
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [blob])

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), [])

  const copyImage = async () => {
    try {
      const png = await toPngBlob(blob)
      await navigator.clipboard.write([new ClipboardItem({ [png.type]: png })])
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => setCopyState('idle'), 2000)
  }

  return (
    <ResultPanel
      title={t.transferComplete}
      meta={`${downloadName} · ${formatBytes(file.bytes.length)} · ${file.mimeType}`}
      body={
        isImage &&
        url !== null && (
          <img className={styles.image} src={url} alt={downloadName} draggable={false} />
        )
      }
      actions={
        <>
          {url !== null && (
            <a
              className={cx(buttonStyles.button, buttonStyles.sm, buttonStyles.primary)}
              href={url}
              download={downloadName}
            >
              {t.download}
            </a>
          )}
          {isImage && canCopyImages() && (
            <Button variant="secondary" size="sm" onClick={() => void copyImage()}>
              {copyState === 'copied'
                ? t.copied
                : copyState === 'failed'
                  ? t.copyFailed
                  : t.copyImage}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onScanAnother}>
            {t.scanAnother}
          </Button>
        </>
      }
    />
  )
}
