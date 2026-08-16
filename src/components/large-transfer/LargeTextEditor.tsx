import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { cx } from '../../lib/cx'
import { Button } from '../primitives/Button'
import { Icon } from '../primitives/Icon'
import { Input } from '../primitives/Input'
import { useCopy } from '../../hooks/useCopy'
import { useI18n } from '../../i18n'
import { detectFormat } from '../../lib/transfer/formatDetection'
import type { ContentFormat } from '../../lib/transfer/types'
import { createEditor, languageFor, type EditorCompartments } from './codemirrorSetup'
import styles from './LargeTextEditor.module.css'

type FormatChoice = 'auto' | ContentFormat

interface LargeTextEditorProps {
  value: string
  /** Omit to render a read-only viewer. */
  onChange?: (value: string) => void
  title: string
  placeholder?: string
  /** Rendered below the editor (e.g. content stats). */
  footer?: ReactNode
  /** Extra toolbar actions rendered before Fullscreen (e.g. Copy all for the viewer). */
  extraActions?: ReactNode
  /** Grow to fill available height even outside fullscreen. */
  tall?: boolean
}

export function LargeTextEditor({
  value,
  onChange,
  title,
  placeholder,
  footer,
  extraActions,
  tall = false,
}: LargeTextEditorProps) {
  const t = useI18n()
  const readOnly = onChange === undefined
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const compartmentsRef = useRef<EditorCompartments | null>(null)
  const onChangeRef = useRef(onChange)
  const lastEmittedRef = useRef(value)
  const [formatChoice, setFormatChoice] = useState<FormatChoice>('auto')
  const [fullscreen, setFullscreen] = useState(false)
  const { feedback, copy } = useCopy()

  const detected = useMemo(() => detectFormat(value), [value])
  const format: ContentFormat = formatChoice === 'auto' ? detected : formatChoice

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Create the editor once; the compartments below reconfigure it without recreating it. Wrap is
  // always on now (the toolbar's Wrap toggle was removed — Stage 6 of the design-system refactor).
  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    const { view, compartments } = createEditor({
      parent: host,
      doc: lastEmittedRef.current,
      format,
      wrap: true,
      readOnly,
      placeholder,
      onChange: readOnly
        ? undefined
        : (doc) => {
            lastEmittedRef.current = doc
            onChangeRef.current?.(doc)
          },
    })
    viewRef.current = view
    compartmentsRef.current = compartments
    return () => {
      view.destroy()
      viewRef.current = null
      compartmentsRef.current = null
    }
    // Only mount-time options are read here; later changes are applied via compartments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external value changes (e.g. Clear or a new received document) into the view.
  useEffect(() => {
    const view = viewRef.current
    if (view === null || value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    const compartments = compartmentsRef.current
    if (view === null || compartments === null) return
    view.dispatch({ effects: compartments.language.reconfigure(languageFor(format)) })
  }, [format])

  useEffect(() => {
    const view = viewRef.current
    const compartments = compartmentsRef.current
    if (view === null || compartments === null) return
    view.dispatch({
      effects: compartments.readOnly.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    })
  }, [readOnly])

  // Lock page scroll while the overlay is open.
  useEffect(() => {
    if (!fullscreen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [fullscreen])

  return (
    <div
      className={cx(styles.shell, fullscreen && styles.fullscreen, tall && styles.tall)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && fullscreen && !event.nativeEvent.defaultPrevented) {
          setFullscreen(false)
        }
      }}
    >
      <div className={styles.toolbar}>
        <span className={styles.title}>{title}</span>
        <div className={styles.actions}>
          <label>
            <span className={styles.visuallyHidden}>{t.format}</span>
            <Input.Select
              className={styles.formatSelect}
              value={formatChoice}
              onChange={(event) => setFormatChoice(event.target.value as FormatChoice)}
            >
              <option value="auto">
                {t.formatAuto} ({formatLabel(detected, t)})
              </option>
              <option value="text">{t.formatText}</option>
              <option value="markdown">{t.formatMarkdown}</option>
              <option value="json">{t.formatJson}</option>
            </Input.Select>
          </label>
          {!readOnly && (
            <>
              <Button variant="secondary" size="sm" onClick={() => void copy(value)}>
                {feedback === 'copied' ? t.copied : feedback === 'failed' ? t.copyFailed : t.copy}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={value === ''}
                onClick={() => onChange?.('')}
              >
                {t.clear}
              </Button>
            </>
          )}
          {extraActions}
          <Button
            variant="secondary"
            size="icon"
            aria-label={fullscreen ? t.done : t.fullscreen}
            aria-pressed={fullscreen}
            onClick={() => setFullscreen((f) => !f)}
          >
            <Icon name={fullscreen ? 'minimize' : 'maximize'} size={16} />
          </Button>
        </div>
      </div>
      <div className={styles.host} ref={hostRef} />
      {footer !== undefined && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}

function formatLabel(
  format: ContentFormat,
  t: { formatText: string; formatMarkdown: string; formatJson: string },
): string {
  switch (format) {
    case 'json':
      return t.formatJson
    case 'markdown':
      return t.formatMarkdown
    default:
      return t.formatText
  }
}
