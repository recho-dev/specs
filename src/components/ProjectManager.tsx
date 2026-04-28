import { useEffect } from 'react'
import { ipc } from '@/lib/ipc'
import { useWorkbenchStore } from '@/store/useWorkbenchStore'

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

export default function ProjectManager() {
  const loadProject = useWorkbenchStore((s) => s.loadProject)
  const setProjectPath = useWorkbenchStore((s) => s.setProjectPath)

  useEffect(() => {
    const debouncedSave = debounce(() => {
      const state = useWorkbenchStore.getState()
      if (!state.projectPath || state.library.isGenerating) return
      ipc.projectSave(state.buildProjectFile()).catch(() => {})
    }, 1500)

    const unsub = useWorkbenchStore.subscribe((state) => {
      if (!state.projectPath || state.library.isGenerating) return
      debouncedSave()
    })

    return unsub
  }, [])

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
      const filePath = await ipc.projectSave(state.buildProjectFile())
      if (filePath && !state.projectPath) setProjectPath(filePath)
    })

    return () => {
      ipc.offMenu('new-project')
      ipc.offMenu('open-project')
      ipc.offMenu('save-project')
    }
  }, [loadProject])

  return null
}
