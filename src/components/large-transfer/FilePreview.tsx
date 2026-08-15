import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useI18n } from '../../i18n'
import { formatBytes } from '../../lib/format'

interface FilePreviewProps {
  file: File
  onChange: (file: File, droppedCount: number) => void
  onRemove: () => void
}

/** Small card with name / size / MIME, an image thumbnail when applicable, Change and Remove. */
export function FilePreview({ file, onChange, onRemove }: FilePreviewProps) {
  const t = useI18n()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isImage = file.type.startsWith('image/')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // One object URL per file; revoked when the file changes or the card unmounts.
  useEffect(() => {
    if (!isImage) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isImage])

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files !== null && files.length > 0) onChange(files[0], files.length)
    event.target.value = ''
  }

  return (
    <div className="file-card">
      {previewUrl !== null && (
        <img className="file-thumb" src={previewUrl} alt="" draggable={false} />
      )}
      <div className="file-info">
        <p className="file-name" title={file.name}>
          {file.name || t.unnamedFile}
        </p>
        <p className="hint">
          {formatBytes(file.size)} · {file.type || t.unknownType}
        </p>
      </div>
      <div className="actions">
        <button
          type="button"
          className="button button-small"
          onClick={() => inputRef.current?.click()}
        >
          {t.changeFile}
        </button>
        <button type="button" className="button button-small" onClick={onRemove}>
          {t.removeFile}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="visually-hidden"
        aria-label={t.changeFile}
        onChange={onPick}
      />
    </div>
  )
}
