import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { search, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightSpecialChars,
  keymap,
  placeholder as placeholderExt,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import type { ContentFormat } from '../../lib/transfer/types'

/** Colors come from CSS variables so highlighting follows the app theme (light/dark). */
const highlightStyle = HighlightStyle.define([
  { tag: tags.heading, fontWeight: 'bold', color: 'var(--cm-heading)' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--cm-link)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--cm-link)' },
  { tag: tags.monospace, color: 'var(--cm-code)' },
  { tag: tags.processingInstruction, color: 'var(--text-muted)' },
  { tag: tags.quote, color: 'var(--text-muted)', fontStyle: 'italic' },
  { tag: tags.propertyName, color: 'var(--cm-property)' },
  { tag: tags.string, color: 'var(--cm-string)' },
  { tag: tags.number, color: 'var(--cm-number)' },
  { tag: [tags.bool, tags.null], color: 'var(--cm-keyword)' },
  { tag: tags.invalid, color: 'var(--danger)' },
])

const theme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '0.9375rem',
    color: 'var(--text)',
    backgroundColor: 'var(--surface)',
  },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    lineHeight: '1.5',
    overscrollBehavior: 'contain',
  },
  '.cm-content': { padding: '0.75rem 0', caretColor: 'var(--text)' },
  '.cm-line': { padding: '0 0.75rem' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
    { backgroundColor: 'var(--cm-selection) !important' },
  '.cm-placeholder': { color: 'var(--text-muted)' },
  '.cm-panels': {
    backgroundColor: 'var(--surface-muted)',
    color: 'var(--text)',
    borderColor: 'var(--border)',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
  '.cm-panel.cm-search': { padding: '0.5rem 0.75rem', fontSize: '0.875rem' },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': {
    font: 'inherit',
    color: 'inherit',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '0.2rem 0.45rem',
    margin: '0.1rem 0.25rem 0.1rem 0',
  },
  '.cm-panel.cm-search label': { marginRight: '0.5rem' },
  '.cm-panel.cm-search [name=close]': { color: 'var(--text-muted)', fontSize: '1.25rem' },
  '.cm-searchMatch': { backgroundColor: 'var(--cm-match)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--cm-match-selected)' },
})

export function languageFor(format: ContentFormat): Extension {
  switch (format) {
    case 'json':
      return json()
    case 'markdown':
      return markdown()
    default:
      return []
  }
}

export interface EditorCompartments {
  language: Compartment
  wrap: Compartment
  readOnly: Compartment
}

export interface CreateEditorOptions {
  parent: HTMLElement
  doc: string
  format: ContentFormat
  wrap: boolean
  readOnly: boolean
  placeholder?: string
  onChange?: (doc: string) => void
}

export function createEditor(options: CreateEditorOptions): {
  view: EditorView
  compartments: EditorCompartments
} {
  const compartments: EditorCompartments = {
    language: new Compartment(),
    wrap: new Compartment(),
    readOnly: new Compartment(),
  }
  const { onChange } = options
  const state = EditorState.create({
    doc: options.doc,
    extensions: [
      history(),
      drawSelection(),
      highlightSpecialChars(),
      search({ top: true }),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      syntaxHighlighting(highlightStyle),
      theme,
      compartments.language.of(languageFor(options.format)),
      compartments.wrap.of(options.wrap ? EditorView.lineWrapping : []),
      compartments.readOnly.of([
        EditorState.readOnly.of(options.readOnly),
        EditorView.editable.of(!options.readOnly),
      ]),
      options.placeholder ? placeholderExt(options.placeholder) : [],
      onChange
        ? EditorView.updateListener.of((update) => {
            if (update.docChanged) onChange(update.state.doc.toString())
          })
        : [],
    ],
  })
  const view = new EditorView({ state, parent: options.parent })
  return { view, compartments }
}
