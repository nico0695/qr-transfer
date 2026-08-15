import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { useI18n } from '../../i18n'

interface FileInputProps {
  onSelect: (file: File, droppedCount: number) => void
}

/** Drop zone + native file picker. One file per transfer; extra dropped files are ignored. */
export function FileInput({ onSelect }: FileInputProps) {
  const t = useI18n()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const pick = (files: FileList | null) => {
    if (files === null || files.length === 0) return
    onSelect(files[0], files.length)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    pick(event.dataTransfer.files)
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!dragging) setDragging(true)
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    pick(event.target.files)
    event.target.value = '' // allow re-selecting the same file later
  }

  return (
    <div
      className={`dropzone${dragging ? ' is-dragging' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
    >
      <p className="dropzone-title">{t.dropFileHere}</p>
      <p className="hint">{t.or}</p>
      <button type="button" className="button" onClick={() => inputRef.current?.click()}>
        {t.chooseFile}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="visually-hidden"
        aria-label={t.chooseFile}
        onChange={onChange}
      />
      <p className="hint">{t.oneFileHint}</p>
    </div>
  )
}
