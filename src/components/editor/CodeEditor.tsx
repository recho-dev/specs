import { lazy, Suspense } from 'react'

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

interface Props {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  language?: string
}

export default function CodeEditor({ value, onChange, readOnly = false, language = 'javascript' }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-zinc-50 text-zinc-500 text-sm">
          Loading editor...
        </div>
      }
    >
      <MonacoEditor
        height="100%"
        language={language}
        value={value}
        onChange={(v) => onChange?.(v ?? '')}
        theme="vs"
        options={{
          readOnly,
          fontSize: 13,
          lineHeight: 20,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          contextmenu: false,
          folding: false,
        }}
      />
    </Suspense>
  )
}
