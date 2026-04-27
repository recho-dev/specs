import { useMemo, useState } from 'react'
import Workbench from './Workbench'
import ProjectManager from './ProjectManager'
import ExportModal from './ExportModal'
import { useWorkbenchStore } from '@/store/useWorkbenchStore'
import { ipc } from '@/lib/ipc'
import type { ExportMeta } from '@/types'

function getBasename(p: string): string {
  const normalized = p.replaceAll('\\', '/')
  const base = normalized.split('/').filter(Boolean).pop() ?? ''
  return base.replace(/\.[^/.]+$/, '') || base
}

function ExportIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M7 1v8M4 6l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 10v1.5A1.5 1.5 0 003.5 13h7A1.5 1.5 0 0012 11.5V10" strokeLinecap="round" />
    </svg>
  )
}

export default function App() {
  const [exportOpen, setExportOpen] = useState(false)

  const isProjectLoaded = useWorkbenchStore((s) => s.isProjectLoaded)
  const loadProject = useWorkbenchStore((s) => s.loadProject)
  const addExample = useWorkbenchStore((s) => s.addExample)
  const projectPath = useWorkbenchStore((s) => s.projectPath)
  const libraryCode = useWorkbenchStore((s) => s.library.code)
  const examples = useWorkbenchStore((s) => s.examples)
  const exportMeta = useWorkbenchStore((s) => s.exportMeta)
  const setExportMeta = useWorkbenchStore((s) => s.setExportMeta)
  const buildProjectFile = useWorkbenchStore((s) => s.buildProjectFile)

  const projectName = useMemo(() => {
    if (!isProjectLoaded) return null
    if (!projectPath) return 'Untitled'
    return getBasename(projectPath)
  }, [isProjectLoaded, projectPath])

  const defaultPackageName = useMemo(() => {
    if (!projectPath) return 'my-library'
    return getBasename(projectPath)
  }, [projectPath])

  async function handleNewProject() {
    loadProject(await ipc.projectNew())
    addExample()
  }

  async function handleOpenProject() {
    const project = await ipc.projectOpen()
    if (project) loadProject(project)
  }

  async function handleExport(meta: ExportMeta) {
    setExportMeta(meta)
    // Persist meta to project file
    await ipc.projectSave(buildProjectFile()).catch(() => {})

    const result = await ipc.invokeExport({
      meta,
      libraryCode,
      examples: examples.map((e) => ({ name: e.name, code: e.code })),
    })
    if (result.ok) return { ok: true as const, exportPath: (result as { ok: true; exportPath: string }).exportPath }
    return { ok: false as const, error: (result as { ok: false; error: string }).error }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="app-titlebar relative" style={!isProjectLoaded ? { background: '#F5F4F2', borderBottom: 'none' } : undefined}>
        {projectName && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-2 truncate max-w-[60%]" style={{ fontSize: 12, fontWeight: 700, color: '#3A3834', letterSpacing: '0.01em' }}>
              {projectName}
            </div>
          </div>
        )}
        {isProjectLoaded && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-5">
            <button
              onClick={() => setExportOpen(true)}
              title="Export package"
              style={{
                width: 24, height: 24, display: 'flex', alignItems: 'center',
                justifyContent: 'center', border: 'none', background: 'none',
                color: '#8A8780', borderRadius: 4, cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#DDD9D2'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#3A3834'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#8A8780'
              }}
            >
              <ExportIcon />
            </button>
          </div>
        )}
      </div>

      <ProjectManager />

      <div className="flex-1 min-h-0">
        {isProjectLoaded ? (
          <Workbench />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-6" style={{ background: '#F5F4F2' }}>
            <div className="text-center">
              <h1 className="text-4xl font-black font-serif tracking-tight mb-2" style={{ color: '#3A3834' }}>Forma</h1>
              <p className="text-lg" style={{ color: '#8A8780' }}>Build JavaScript libraries from examples.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleOpenProject}
                className="px-4 py-2 text-sm text-white rounded transition-colors"
                style={{ background: '#5B47D0' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#4C3AB8')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#5B47D0')}
              >
                Open Library
              </button>
              <button
                onClick={handleNewProject}
                className="px-4 py-2 text-sm rounded transition-colors"
                style={{ background: '#E4E1DA', color: '#3A3834' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#DDD9D2')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#E4E1DA')}
              >
                New Library
              </button>
            </div>
          </div>
        )}
      </div>

      {exportOpen && (
        <ExportModal
          defaultName={defaultPackageName}
          initialMeta={exportMeta}
          onClose={() => setExportOpen(false)}
          onExport={handleExport}
        />
      )}
    </div>
  )
}
