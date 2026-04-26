import { useState } from 'react'
import Workbench from './Workbench'
import ProjectManager from './ProjectManager'
import SettingsDialog from './SettingsDialog'
import { useWorkbenchStore } from '@/store/useWorkbenchStore'
import { ipc } from '@/lib/ipc'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isProjectLoaded = useWorkbenchStore((s) => s.isProjectLoaded)
  const loadProject = useWorkbenchStore((s) => s.loadProject)

  async function handleNewProject() {
    loadProject(await ipc.projectNew())
  }

  async function handleOpenProject() {
    const project = await ipc.projectOpen()
    if (project) loadProject(project)
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="app-titlebar" />

      <ProjectManager onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="flex-1 min-h-0">
        {isProjectLoaded ? (
          <Workbench />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-zinc-950 gap-6">
            <div className="text-center">
              <h1 className="text-lg font-medium text-zinc-200 mb-1">Forma</h1>
              <p className="text-sm text-zinc-500">Build JavaScript libraries by writing examples</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleNewProject}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
              >
                New Project
              </button>
              <button
                onClick={handleOpenProject}
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
              >
                Open Project
              </button>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Configure API Key
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
