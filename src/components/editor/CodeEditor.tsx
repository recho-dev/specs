import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

type MonacoOnMount = NonNullable<React.ComponentProps<typeof MonacoEditor>['onMount']>
type EditorInstance = Parameters<MonacoOnMount>[0]
type MonacoInstance = Parameters<MonacoOnMount>[1]

const THEME_CHROME = 'recho-form-chrome'

function defineChromeTheme(monaco: MonacoInstance) {
  monaco.editor.defineTheme(THEME_CHROME, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#00000000',
      'editorGutter.background': '#00000000',
      'editorLineNumber.foreground': '#a1a1aa',
      'editorLineNumber.activeForeground': '#71717a',
    },
  })
}

interface Props {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  language?: string
  editorBackground?: string
  fontSize?: number
  /** Grow to fit content; disables vertical scroll. */
  autoHeight?: boolean
  /** When true, scrolls to the last line whenever value changes. */
  isStreaming?: boolean
}

export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
  language = 'javascript',
  editorBackground,
  fontSize = 14,
  autoHeight = false,
  isStreaming = false,
}: Props) {
  const surfaceColor = editorBackground ?? '#ffffff'
  const [contentHeight, setContentHeight] = useState(100)
  const editorRef = useRef<EditorInstance | null>(null)

  const beforeMount = useMemo(
    () => (monaco: MonacoInstance) => {
      defineChromeTheme(monaco)
    },
    []
  )

  const onMount = useMemo(
    () => (editor: EditorInstance, monaco: MonacoInstance) => {
      editorRef.current = editor
      defineChromeTheme(monaco)
      monaco.editor.setTheme(THEME_CHROME)

      if (autoHeight) {
        const update = () => setContentHeight(editor.getContentHeight())
        editor.onDidContentSizeChange(update)
        update()
      }
    },
    // autoHeight is static per instance — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    if (!isStreaming || !editorRef.current) return
    const lineCount = editorRef.current.getModel()?.getLineCount() ?? 1
    editorRef.current.revealLine(lineCount)
  }, [value, isStreaming])

  const height = autoHeight ? contentHeight : '100%'

  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center text-zinc-500 text-sm"
          style={{ backgroundColor: surfaceColor, height }}
        >
          Loading editor...
        </div>
      }
    >
      <div style={{ backgroundColor: surfaceColor, height, width: '100%' }}>
        <MonacoEditor
          height={height}
          language={language}
          value={value}
          onChange={(v) => onChange?.(v ?? '')}
          beforeMount={beforeMount}
          onMount={onMount}
          theme={THEME_CHROME}
          options={{
            readOnly,
            fontSize,
            lineHeight: Math.round(fontSize * 1.6),
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            contextmenu: false,
            folding: false,
            stickyScroll: { enabled: false },
            fixedOverflowWidgets: true,
            scrollbar: {
              vertical: autoHeight ? 'hidden' : 'auto',
              alwaysConsumeMouseWheel: !autoHeight,
            },
          }}
        />
      </div>
    </Suspense>
  )
}
