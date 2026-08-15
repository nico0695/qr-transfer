import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { CopyButton } from '../CopyButton'
import { useI18n } from '../../i18n'
import { detectFormat } from '../../lib/transfer/formatDetection'
import type { ContentFormat } from '../../lib/transfer/types'
import {
  createEditor,
  languageFor,
  openSearchPanel,
  redo,
  undo,
  type EditorCompartments,
} from './codemirrorSetup'

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
  const [wrap, setWrap] = useState(true)
  const [formatChoice, setFormatChoice] = useState<FormatChoice>('auto')
  const [fullscreen, setFullscreen] = useState(false)

  const detected = useMemo(() => detectFormat(value), [value])
  const format: ContentFormat = formatChoice === 'auto' ? detected : formatChoice

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Create the editor once; the compartments below reconfigure it without recreating it.
  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    const { view, compartments } = createEditor({
      parent: host,
      doc: lastEmittedRef.current,
      format,
      wrap,
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
      effects: compartments.wrap.reconfigure(wrap ? EditorView.lineWrapping : []),
    })
  }, [wrap])

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

  const run = (command: (view: EditorView) => boolean) => {
    const view = viewRef.current
    if (view === null) return
    command(view)
    view.focus()
  }

  return (
    <section
      className={`editor-shell${fullscreen ? ' is-fullscreen' : ''}${tall ? ' is-tall' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && fullscreen && !event.nativeEvent.defaultPrevented) {
          setFullscreen(false)
        }
      }}
    >
      <div className="editor-toolbar">
        <span className="field-label editor-title">{title}</span>
        <div className="editor-actions">
          {!readOnly && (
            <>
              <button type="button" className="button button-small" onClick={() => run(undo)}>
                {t.undo}
              </button>
              <button type="button" className="button button-small" onClick={() => run(redo)}>
                {t.redo}
              </button>
            </>
          )}
          <button
            type="button"
            className="button button-small"
            onClick={() => run(openSearchPanel)}
          >
            {t.find}
          </button>
          <button
            type="button"
            className="button button-small"
            aria-pressed={wrap}
            onClick={() => setWrap((w) => !w)}
          >
            {wrap ? t.wrapOn : t.wrapOff}
          </button>
          <label className="editor-format">
            <span className="visually-hidden">{t.format}</span>
            <select
              className="select select-small"
              value={formatChoice}
              onChange={(event) => setFormatChoice(event.target.value as FormatChoice)}
            >
              <option value="auto">
                {t.formatAuto} ({formatLabel(detected, t)})
              </option>
              <option value="text">{t.formatText}</option>
              <option value="markdown">{t.formatMarkdown}</option>
              <option value="json">{t.formatJson}</option>
            </select>
          </label>
          {!readOnly && (
            <>
              <CopyButton text={value} small />
              <button
                type="button"
                className="button button-small"
                disabled={value === ''}
                onClick={() => onChange?.('')}
              >
                {t.clear}
              </button>
            </>
          )}
          {extraActions}
          <button
            type="button"
            className="button button-small"
            aria-pressed={fullscreen}
            onClick={() => setFullscreen((f) => !f)}
          >
            {fullscreen ? t.done : t.fullscreen}
          </button>
        </div>
      </div>
      <div className="editor-host" ref={hostRef} />
      {footer !== undefined && <div className="editor-footer">{footer}</div>}
    </section>
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
