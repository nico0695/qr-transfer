import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { formatBytes } from '../../../lib/format'
import { Button } from '../../primitives/Button'
import { Card } from '../../primitives/Card'
import { Icon } from '../../primitives/Icon'
import styles from './FileCard.module.css'

export interface FileCardProps {
  file: File
  onChange: (file: File, droppedCount: number) => void
  onRemove: () => void
  unnamedLabel: string
  unknownTypeLabel: string
  changeLabel: string
  removeLabel: string
}

/** Card with name / size / MIME, an image thumbnail when applicable, Change and Remove. */
export function FileCard({
  file,
  onChange,
  onRemove,
  unnamedLabel,
  unknownTypeLabel,
  changeLabel,
  removeLabel,
}: FileCardProps) {
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
    <Card radius="card" className={styles.card}>
      {previewUrl !== null ? (
        <img className={styles.thumb} src={previewUrl} alt="" draggable={false} />
      ) : (
        <span className={styles.thumbPlaceholder}>
          <Icon name="file" size={22} />
        </span>
      )}
      <div className={styles.info}>
        <p className={styles.name} title={file.name}>
          {file.name || unnamedLabel}
        </p>
        <p className={styles.meta}>
          {formatBytes(file.size)} · {file.type || unknownTypeLabel}
        </p>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          {changeLabel}
        </Button>
        <Button variant="secondary" size="icon" aria-label={removeLabel} onClick={onRemove}>
          <Icon name="x" size={16} />
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className={styles.hiddenInput}
        aria-label={changeLabel}
        onChange={onPick}
      />
    </Card>
  )
}
