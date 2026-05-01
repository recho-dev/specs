import { useEffect } from 'react'
import { ipc } from '@/lib/ipc'
import { useWorkbenchStore } from '@/store/useWorkbenchStore'

export default function ProjectManager() {
  const loadProject = useWorkbenchStore((s) => s.loadProject)
  const setProjectPath = useWorkbenchStore((s) => s.setProjectPath)
  const markSaved = useWorkbenchStore((s) => s.markSaved)
  const isDirty = useWorkbenchStore((s) => s.isDirty)

  useEffect(() => {
    ipc.projectSetDirty(isDirty).catch(() => {})
  }, [isDirty])

  useEffect(() => {
    ipc.onMenu('new-project', async () => {
      loadProject(await ipc.projectNew())
    })

    ipc.onMenu('open-project', async () => {
      const project = await ipc.projectOpen()
      if (project) loadProject(project)
    })

    ipc.onMenu('save-project', async () => {
      const state = useWorkbenchStore.getState()
      const file = state.buildProjectFile()
      const filePath = await ipc.projectSave(file)
      if (filePath) {
        if (!state.projectPath) setProjectPath(filePath)
        markSaved()
      }
    })

    return () => {
      ipc.offMenu('new-project')
      ipc.offMenu('open-project')
      ipc.offMenu('save-project')
    }
  }, [loadProject, markSaved])

  return null
}
