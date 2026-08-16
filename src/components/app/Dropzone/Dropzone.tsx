import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { cx } from '../../../lib/cx'
import { Button } from '../../primitives/Button'
import { Card } from '../../primitives/Card'
import { Icon } from '../../primitives/Icon'
import styles from './Dropzone.module.css'

export interface DropzoneProps {
  onSelect: (file: File, droppedCount: number) => void
  title: string
  chooseLabel: string
  hint: string
}

/** Drop zone + native file picker. One file per transfer; extra dropped files are ignored. */
export function Dropzone({ onSelect, title, chooseLabel, hint }: DropzoneProps) {
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
    <Card
      dashed
      radius="card"
      className={cx(styles.dropzone, dragging && styles.dragging)}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
    >
      <Icon name="file-up" size={26} className={styles.icon} />
      <p className={styles.title}>{title}</p>
      <Button variant="primary" onClick={() => inputRef.current?.click()}>
        {chooseLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        className={styles.hiddenInput}
        aria-label={chooseLabel}
        onChange={onChange}
      />
      <p className={styles.hint}>{hint}</p>
    </Card>
  )
}
