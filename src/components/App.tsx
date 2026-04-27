import { useMemo, useState } from 'react'
import Workbench from './Workbench'
import ProjectManager from './ProjectManager'
import VersionTimeline from './versions/VersionTimeline'
import { useWorkbenchStore } from '@/store/useWorkbenchStore'
import { ipc } from '@/lib/ipc'

function getBasename(p: string): string {
  const normalized = p.replaceAll('\\', '/')
  const base = normalized.split('/').filter(Boolean).pop() ?? ''
  return base.replace(/\.[^/.]+$/, '') || base
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="6" cy="6" r="4.5" />
      <path d="M6 3.5V6l1.5 1.5" />
    </svg>
  )
}

export default function App() {
  const [versionsOpen, setVersionsOpen] = useState(false)

  const isProjectLoaded = useWorkbenchStore((s) => s.isProjectLoaded)
  const loadProject = useWorkbenchStore((s) => s.loadProject)
  const addExample = useWorkbenchStore((s) => s.addExample)
  const projectPath = useWorkbenchStore((s) => s.projectPath)

  const projectName = useMemo(() => {
    if (!isProjectLoaded) return null
    if (!projectPath) return 'Untitled'
    return getBasename(projectPath)
  }, [isProjectLoaded, projectPath])

  async function handleNewProject() {
    loadProject(await ipc.projectNew())
    addExample()
  }

  async function handleOpenProject() {
    const project = await ipc.projectOpen()
    if (project) loadProject(project)
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
              onClick={() => setVersionsOpen(true)}
              title="Version history"
              style={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'none',
                color: '#8A8780',
                borderRadius: 4,
                cursor: 'pointer',
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
              <ClockIcon />
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

      {versionsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setVersionsOpen(false)}
        >
          <div
            className="overflow-hidden bg-white rounded-2xl"
            style={{ width: 720, maxWidth: 'calc(100% - 24px)', maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <div className="text-sm font-semibold text-zinc-900">Versions</div>
              <button onClick={() => setVersionsOpen(false)} className="text-zinc-500 hover:text-zinc-900 text-lg leading-none">
                ×
              </button>
            </div>
            <div className="p-2">
              <VersionTimeline defaultOpen hideHeader />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
