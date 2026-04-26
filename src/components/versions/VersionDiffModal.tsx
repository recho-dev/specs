import { lazy, Suspense, useState } from 'react'
import type { Version } from '@/types'
import { useWorkbenchStore } from '@/store/useWorkbenchStore'

const MonacoDiffEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.DiffEditor }))
)

interface Props {
  version: Version
  onClose: () => void
}

const DIFF_OPTIONS = {
  readOnly: true,
  fontSize: 13,
  lineHeight: 20,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  padding: { top: 12 },
  renderLineHighlight: 'none' as const,
  overviewRulerLanes: 0,
  contextmenu: false,
  folding: false,
}

export default function VersionDiffModal({ version, onClose }: Props) {
  const currentLibraryCode = useWorkbenchStore((s) => s.library.code)
  const currentExamples = useWorkbenchStore((s) => s.examples)
  const [activeTab, setActiveTab] = useState<'library' | string>('library')

  const versionExampleMap = new Map(version.examples.map((e) => [e.id, e]))
  const currentExampleMap = new Map(currentExamples.map((e) => [e.id, e]))

  // Show tabs for any example that exists in either snapshot
  const allExampleIds = Array.from(
    new Set([...version.examples.map((e) => e.id), ...currentExamples.map((e) => e.id)])
  )

  const original =
    activeTab === 'library'
      ? version.libraryCode
      : (versionExampleMap.get(activeTab)?.code ?? '')

  const modified =
    activeTab === 'library'
      ? currentLibraryCode
      : (currentExampleMap.get(activeTab)?.code ?? '')

  const tabLabel = (id: string) =>
    versionExampleMap.get(id)?.name ?? currentExampleMap.get(id)?.name ?? id

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="flex flex-col bg-white border border-zinc-200 rounded-lg overflow-hidden"
        style={{ width: '80vw', height: '75vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 flex-shrink-0">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-indigo-400 font-mono">v{version.versionNumber}</span>
            {version.description && (
              <span className="text-zinc-600 text-xs truncate max-w-sm" title={version.description}>
                {version.description}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 text-lg leading-none">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 flex-shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 text-xs whitespace-nowrap transition-colors ${
              activeTab === 'library'
                ? 'text-zinc-900 border-b-2 border-indigo-500'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Library
          </button>
          {allExampleIds.map((id) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-xs whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'text-zinc-900 border-b-2 border-indigo-500'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {tabLabel(id)}
            </button>
          ))}
        </div>

        {/* Diff editor */}
        <div className="flex-1 min-h-0">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              Loading…
            </div>
          }>
            <MonacoDiffEditor
              original={original}
              modified={modified}
              language="javascript"
              theme="vs"
              options={DIFF_OPTIONS}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
