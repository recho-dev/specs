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
          <div className="h-full flex flex-col items-center justify-center bg-white gap-6">
            <div className="text-center">
              <h1 className="text-4xl font-black font-serif tracking-tight text-zinc-900 mb-2">Forma</h1>
              <p className="text-lg text-zinc-600">Build JavaScript libraries from examples.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleOpenProject}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
              >
                Open Library
              </button>
              <button
                onClick={handleNewProject}
                className="px-4 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded transition-colors"
              >
                New Library
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
