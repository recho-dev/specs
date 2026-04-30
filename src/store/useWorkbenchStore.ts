import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { ipc } from '@/lib/ipc'
import { extractCodeFromBuffer } from '@/lib/sandbox'
import type {
  Example,
  LibraryState,
  ConsoleLine,
  GenerateRequestBody,
  ChatRequestBody,
  ChatPlan,
  ExamplesDiff,
  FileDiff,
  Version,
  VersionedExample,
  ProjectFile,
  LoadedProject,
  ExampleStatus,
  SnapshotStatus,
  SnapshotBlob,
  ExportMeta,
} from '@/types'

const MAX_VERSIONS = 50

const DEFAULT_EXAMPLE_CODE = `// Write how you want to use the library here
// Example:
// const chart = new BarChart(document.querySelector('#container'));
// chart.setData([10, 30, 20, 50, 40]);
// chart.render();
`

const GENERATE_PROMPT = 'Analyze the current examples for problems — syntax errors, conflicting API shapes between examples. Fix any issues. Then regenerate the library to make all examples work.'

export interface ToastState {
  kind: 'thinking' | 'done'
  message: string
  step?: string
}

interface WorkbenchStore {
  projectPath: string | null
  isProjectLoaded: boolean

  examples: Example[]
  library: LibraryState
  activeExampleId: string | null
  viewingLibrary: boolean

  versions: Version[]
  activeVersionId: string | null
  generationId: number

  lastGeneratedExamples: VersionedExample[]
  toastState: ToastState | null
  lastDiff: FileDiff[] | null

  snapshotBlobs: SnapshotBlob[]
  snapshotCapturePending: string | null

  exportMeta: ExportMeta | null
  setExportMeta: (meta: ExportMeta) => void
  setToastState: (state: ToastState | null) => void
  setLastDiff: (diff: FileDiff[] | null) => void

  setExampleSnapshot: (id: string, html: string) => Promise<void>
  runSnapshotTest: (id: string, currentHtml: string) => void
  clearSnapshotStatus: (id: string) => void
  requestSnapshotCapture: (exampleId: string) => void
  clearSnapshotCapturePending: () => void
  chatFromSnapshot: (exampleId: string, snapshotHtml: string, currentHtml: string) => Promise<void>
  deleteSnapshot: (id: string) => Promise<void>

  addExample: () => void
  insertExampleAt: (index: number) => void
  deleteExample: (id: string) => void
  setExampleCode: (id: string, code: string) => void
  setExampleName: (id: string, name: string) => void
  setExampleStatus: (id: string, status: Example['status'], error?: string | null) => void
  appendConsoleLine: (id: string, line: ConsoleLine) => void
  setActiveExample: (id: string) => void
  reorderExamples: (orderedIds: string[]) => void

  setLibraryCode: (code: string) => void
  setGenerating: (isGenerating: boolean) => void
  appendStreamBuffer: (chunk: string) => void
  clearStreamBuffer: () => void
  setGenerationError: (error: string | null) => void

  saveVersion: (
    refinementPrompt: string,
    priorLibraryCode: string,
    priorExamples: VersionedExample[]
  ) => Promise<void>
  restoreVersion: (id: string) => Promise<void>
  _updateVersionDescription: (id: string, description: string) => void

  loadProject: (project: LoadedProject) => void
  buildProjectFile: () => ProjectFile
  setProjectPath: (path: string) => void

  chat: (instruction: string, mode: 'generate' | 'chat') => Promise<void>
  chatFromGenerate: () => Promise<void>
  _generateLibraryCode: (refinement: string) => Promise<boolean>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeDiff(last: VersionedExample[], current: Example[]): ExamplesDiff {
  const lastMap = new Map(last.map((e) => [e.id, e]))
  const currentMap = new Map(current.map((e) => [e.id, e]))
  return {
    added: current.filter((e) => !lastMap.has(e.id)).map((e) => ({ id: e.id, name: e.name })),
    removed: last.filter((e) => !currentMap.has(e.id)).map((e) => ({ id: e.id, name: e.name })),
    modified: current
      .filter((e) => {
        const prev = lastMap.get(e.id)
        return prev && (prev.code !== e.code || prev.name !== e.name)
      })
      .map((e) => ({ id: e.id, name: e.name })),
  }
}

function examplesChanged(prior: VersionedExample[], current: VersionedExample[]): boolean {
  if (prior.length !== current.length) return true
  const priorMap = new Map(prior.map((e) => [e.id, e]))
  return current.some((e) => {
    const prev = priorMap.get(e.id)
    return !prev || prev.code !== e.code || prev.name !== e.name
  })
}

function buildDoneSummary(
  priorLibraryCode: string,
  priorExamples: VersionedExample[],
  currentLibraryCode: string,
  currentExamples: VersionedExample[]
): string {
  const priorMap = new Map(priorExamples.map((e) => [e.id, e]))
  const currentMap = new Map(currentExamples.map((e) => [e.id, e]))

  const added = currentExamples.filter((e) => !priorMap.has(e.id))
  const removed = priorExamples.filter((e) => !currentMap.has(e.id))
  const fixed = currentExamples.filter((e) => {
    const prev = priorMap.get(e.id)
    return prev && prev.code !== e.code
  })
  const libraryChanged = currentLibraryCode !== priorLibraryCode

  const parts: string[] = []
  if (added.length) parts.push(`Added ${added.map((e) => e.name).join(', ')}`)
  if (removed.length) parts.push(`Removed ${removed.map((e) => e.name).join(', ')}`)
  if (fixed.length) parts.push(`Fixed ${fixed.map((e) => e.name).join(', ')}`)
  if (libraryChanged) parts.push('Updated library')

  return parts.length > 0 ? parts.join(', ') : 'No changes were necessary.'
}

function buildTruncatedDiff(before: string, after: string, maxLines = 80): string {
  const a = before.split('\n')
  const b = after.split('\n')
  const lines: string[] = []

  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const la = a[i]
    const lb = b[i]
    if (la === undefined) {
      lines.push(`+ ${lb}`)
    } else if (lb === undefined) {
      lines.push(`- ${la}`)
    } else if (la !== lb) {
      lines.push(`- ${la}`)
      lines.push(`+ ${lb}`)
    }
  }

  const truncated = lines.length > maxLines
  const shown = lines.slice(0, maxLines)
  return [
    'Diff (baseline → current):',
    '```diff',
    ...shown,
    ...(truncated ? [`… (${lines.length - maxLines} more lines truncated)`] : []),
    '```',
  ].join('\n')
}

// ── Selector ──────────────────────────────────────────────────────────────────

export function selectHasChangedSinceLastGeneration(state: WorkbenchStore): boolean {
  if (!state.library.code) return true
  const last = state.lastGeneratedExamples
  const current = state.examples
  if (last.length === 0 && current.length > 0) return true
  if (last.length !== current.length) return true
  const lastMap = new Map(last.map((e) => [e.id, e]))
  return current.some((e) => {
    const prev = lastMap.get(e.id)
    return !prev || prev.code !== e.code || prev.name !== e.name
  })
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useWorkbenchStore = create<WorkbenchStore>()(
  immer((set, get) => ({
    projectPath: null,
    isProjectLoaded: false,
    examples: [],
    library: {
      code: '',
      isGenerating: false,
      generationError: null,
      streamBuffer: '',
    },
    activeExampleId: null,
    viewingLibrary: false,
    generationId: 0,
    exportMeta: null,
    versions: [],
    activeVersionId: null,
    lastGeneratedExamples: [],
    toastState: null,
    lastDiff: null,
    snapshotBlobs: [],
    snapshotCapturePending: null,

    setToastState: (state) => {
      set((s) => { s.toastState = state })
    },

    setLastDiff: (diff) => {
      set((s) => { s.lastDiff = diff })
    },

    setExampleSnapshot: async (id, html) => {
      set((s) => {
        let blob = s.snapshotBlobs.find((b) => b.html === html)
        if (!blob) {
          blob = { id: nanoid(), html }
          s.snapshotBlobs.push(blob)
        }
        const ex = s.examples.find((e) => e.id === id)
        if (ex) {
          ex.snapshotId = blob.id
          ex.snapshotStatus = 'pass'
          ex.snapshotCurrentHtml = html
        }
      })
      await ipc.projectSave(get().buildProjectFile())
    },

    runSnapshotTest: (id, currentHtml) => {
      set((s) => {
        const ex = s.examples.find((e) => e.id === id)
        if (!ex?.snapshotId) return
        const blob = s.snapshotBlobs.find((b) => b.id === ex.snapshotId)
        if (!blob) return
        ex.snapshotStatus = blob.html === currentHtml ? 'pass' : 'fail'
        ex.snapshotCurrentHtml = currentHtml
      })
    },

    clearSnapshotStatus: (id) => {
      set((s) => {
        const ex = s.examples.find((e) => e.id === id)
        if (ex) ex.snapshotStatus = 'none'
      })
    },

    requestSnapshotCapture: (exampleId) => {
      set((s) => { s.snapshotCapturePending = exampleId })
    },

    clearSnapshotCapturePending: () => {
      set((s) => { s.snapshotCapturePending = null })
    },

    deleteSnapshot: async (id) => {
      set((s) => {
        const ex = s.examples.find((e) => e.id === id)
        if (ex) {
          ex.snapshotId = undefined
          ex.snapshotStatus = 'none'
          ex.snapshotCurrentHtml = undefined
        }
      })
      await ipc.projectSave(get().buildProjectFile())
    },

    chatFromSnapshot: async (exampleId, snapshotHtml, currentHtml) => {
      const ex = get().examples.find((e) => e.id === exampleId)
      if (!ex) return

      const truncatedDiff = buildTruncatedDiff(snapshotHtml, currentHtml)
      const instruction = [
        `The snapshot test failed for "${ex.name}". Fix the example code (or the library if needed) so the rendered output matches the baseline.`,
        '',
        truncatedDiff,
      ].join('\n')

      return get().chat(instruction, 'chat')
    },

    loadProject: (project: LoadedProject) => {
      const { file } = project
      set((s) => {
        s.projectPath = project.filePath
        s.isProjectLoaded = true
        s.versions = file.versions
        s.activeVersionId = file.versions[0]?.id ?? null
        s.viewingLibrary = file.viewingLibrary
        s.activeExampleId = file.activeExampleId
        s.library.code = file.libraryCode
        s.library.isGenerating = false
        s.library.generationError = null
        s.library.streamBuffer = ''
        s.lastGeneratedExamples = file.examples
        s.toastState = null
        s.lastDiff = null
        s.snapshotBlobs = file.snapshotBlobs ?? []
        s.snapshotCapturePending = null
        s.examples = file.examples.map((e) => ({
          id: e.id,
          name: e.name,
          code: e.code,
          status: 'idle' as ExampleStatus,
          error: null,
          consoleOutput: [],
          snapshotStatus: 'none' as SnapshotStatus,
          snapshotId: e.snapshotId,
        }))
        s.exportMeta = file.exportMeta ?? null
      })
    },

    setProjectPath: (path: string) => {
      set((s) => { s.projectPath = path })
    },

    buildProjectFile: (): ProjectFile => {
      const s = get()
      return {
        examples: s.examples.map((e) => ({
          id: e.id, name: e.name, code: e.code,
          ...(e.snapshotId ? { snapshotId: e.snapshotId } : {}),
        })),
        libraryCode: s.library.code,
        activeExampleId: s.activeExampleId,
        viewingLibrary: s.viewingLibrary,
        versions: s.versions,
        snapshotBlobs: s.snapshotBlobs,
        ...(s.exportMeta ? { exportMeta: s.exportMeta } : {}),
      }
    },

    setExportMeta: (meta: ExportMeta) => {
      set((s) => { s.exportMeta = meta })
    },

    addExample: () => {
      const id = nanoid()
      set((state) => {
        state.examples.push({
          id,
          name: 'untitled.js',
          code: DEFAULT_EXAMPLE_CODE,
          status: 'idle',
          error: null,
          consoleOutput: [],
          snapshotStatus: 'none',
        })
        state.activeExampleId = id
        state.viewingLibrary = false
      })
    },

    insertExampleAt: (index) => {
      const id = nanoid()
      set((state) => {
        const next = {
          id,
          name: 'untitled.js',
          code: DEFAULT_EXAMPLE_CODE,
          status: 'idle' as ExampleStatus,
          error: null,
          consoleOutput: [],
          snapshotStatus: 'none' as SnapshotStatus,
        }
        const clamped = Math.max(0, Math.min(index, state.examples.length))
        state.examples.splice(clamped, 0, next)
        state.activeExampleId = id
        state.viewingLibrary = false
      })
    },

    deleteExample: (id) => {
      set((state) => {
        const idx = state.examples.findIndex((e) => e.id === id)
        if (idx === -1) return
        state.examples.splice(idx, 1)

        if (state.activeExampleId === id) {
          const next = state.examples[idx] ?? state.examples[idx - 1] ?? null
          state.activeExampleId = next?.id ?? null
        }

        if (state.examples.length === 0) {
          state.viewingLibrary = false
        }
      })
    },

    setExampleCode: (id, code) => {
      set((state) => {
        const ex = state.examples.find((e) => e.id === id)
        if (ex) {
          ex.code = code
          ex.snapshotStatus = 'none'
        }
      })
    },

    setExampleName: (id, name) => {
      set((state) => {
        const ex = state.examples.find((e) => e.id === id)
        if (ex) ex.name = name
      })
    },

    setExampleStatus: (id, status, error = null) => {
      set((state) => {
        const ex = state.examples.find((e) => e.id === id)
        if (ex) {
          ex.status = status
          ex.error = error ?? null
        }
      })
    },

    appendConsoleLine: (id, line) => {
      set((state) => {
        const ex = state.examples.find((e) => e.id === id)
        if (ex) ex.consoleOutput.push(line)
      })
    },

    setActiveExample: (id) => {
      set((state) => {
        state.activeExampleId = id
        state.viewingLibrary = false
      })
    },

    reorderExamples: (orderedIds) => {
      set((state) => {
        const map = new Map(state.examples.map((e) => [e.id, e]))
        state.examples = orderedIds.flatMap((id) => {
          const e = map.get(id)
          return e ? [e] : []
        })
      })
    },

    setLibraryCode: (code) => {
      set((state) => {
        state.library.code = code
        state.library.streamBuffer = ''
      })
    },

    setGenerating: (isGenerating) => {
      set((state) => {
        state.library.isGenerating = isGenerating
      })
    },

    appendStreamBuffer: (chunk) => {
      set((state) => {
        state.library.streamBuffer += chunk
      })
    },

    clearStreamBuffer: () => {
      set((state) => {
        state.library.streamBuffer = ''
      })
    },

    setGenerationError: (error) => {
      set((state) => {
        state.library.generationError = error
        state.library.isGenerating = false
        state.library.streamBuffer = ''
        state.examples.forEach((e) => {
          if (e.status === 'running') e.status = 'idle'
        })
      })
    },

    _updateVersionDescription: (id, description) => {
      set((s) => {
        const v = s.versions.find((v) => v.id === id)
        if (v) v.description = description
      })
    },

    saveVersion: async (refinementPrompt, priorLibraryCode, priorExamples) => {
      const state = get()
      if (!state.projectPath) return

      const currentExamples: VersionedExample[] = state.examples.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        ...(e.snapshotId ? { snapshotId: e.snapshotId } : {}),
      }))

      const versionId = nanoid()
      const newVersion: Version = {
        id: versionId,
        versionNumber: state.versions.length + 1,
        timestamp: Date.now(),
        description: refinementPrompt || 'Generated',
        libraryCode: state.library.code,
        examples: currentExamples,
      }

      set((s) => {
        s.versions.unshift(newVersion)
        if (s.versions.length > MAX_VERSIONS) s.versions.splice(MAX_VERSIONS)
        s.activeVersionId = versionId
      })

      await ipc.projectSave(get().buildProjectFile())

      // Async: generate a richer version label (fire and forget — does not affect toast)
      ipc.invokeSummarize({
        refinementPrompt,
        previousLibraryCode: priorLibraryCode,
        currentLibraryCode: state.library.code,
        previousExamples: priorExamples,
        currentExamples,
      })
        .then(({ description }) => {
          if (description) {
            get()._updateVersionDescription(versionId, description)
            ipc.projectSave(get().buildProjectFile()).catch(() => {})
          }
        })
        .catch(() => {})
    },

    restoreVersion: async (id) => {
      const state = get()
      if (!state.projectPath) return

      const version = state.versions.find((v) => v.id === id)
      if (!version) return

      const restoreId = nanoid()
      const restoreVersion: Version = {
        id: restoreId,
        versionNumber: state.versions.length + 1,
        timestamp: Date.now(),
        description: `Restored to v${version.versionNumber}`,
        libraryCode: version.libraryCode,
        examples: version.examples,
      }

      set((s) => {
        s.library.code = version.libraryCode
        s.library.generationError = null
        s.library.streamBuffer = ''
        s.viewingLibrary = true
        s.activeExampleId = null
        s.toastState = null
        s.lastGeneratedExamples = version.examples
        s.examples = version.examples.map((e) => ({
          id: e.id,
          name: e.name,
          code: e.code,
          status: 'idle' as ExampleStatus,
          error: null,
          consoleOutput: [],
          snapshotStatus: 'none' as SnapshotStatus,
          snapshotId: e.snapshotId,
        }))
        s.versions.unshift(restoreVersion)
        if (s.versions.length > MAX_VERSIONS) s.versions.splice(MAX_VERSIONS)
        s.activeVersionId = restoreId
      })

      await ipc.projectSave(get().buildProjectFile())
    },

    // Internal: streams library code from the generation model. Returns true on success.
    _generateLibraryCode: async (refinement: string): Promise<boolean> => {
      const state = get()

      const failedExamples = state.examples
        .filter((e) => e.status === 'fail' && e.error)
        .map((e) => ({ name: e.name, code: e.code, error: e.error! }))

      const body: GenerateRequestBody = {
        examples: state.examples.map((e) => ({ name: e.name, code: e.code })),
        currentLibraryCode: state.library.code,
        refinementInstruction: refinement,
        failedExamples,
      }

      set((s) => {
        s.library.isGenerating = true
        s.library.generationError = null
        s.library.streamBuffer = ''
        s.viewingLibrary = true
        s.examples.forEach((e) => {
          e.status = 'running'
          e.consoleOutput = []
          e.error = null
        })
      })

      return new Promise<boolean>((resolve) => {
        ipc.offGenerateListeners()

        ipc.onGenerateChunk((chunk) => {
          get().appendStreamBuffer(chunk)
        })

        ipc.onGenerateDone(async () => {
          ipc.offGenerateListeners()
          const buffer = get().library.streamBuffer

          if (buffer.includes('__ERROR__:')) {
            const errMsg = buffer.split('__ERROR__:')[1]?.trim() ?? 'Generation failed'
            set((s) => {
              s.library.generationError = errMsg
              s.library.streamBuffer = ''
              s.examples.forEach((e) => { if (e.status === 'running') e.status = 'idle' })
            })
            resolve(false)
            return
          }

          const libraryCode = extractCodeFromBuffer(buffer)
          get().setLibraryCode(libraryCode)
          set((s) => {
            s.generationId += 1
            if (s.activeExampleId) s.viewingLibrary = false
          })
          resolve(true)
        })

        ipc.onGenerateError((err) => {
          ipc.offGenerateListeners()
          set((s) => {
            s.library.generationError = err
            s.library.streamBuffer = ''
            s.examples.forEach((e) => { if (e.status === 'running') e.status = 'idle' })
          })
          resolve(false)
        })

        ipc.generateStart(body).catch((err) => {
          ipc.offGenerateListeners()
          set((s) => {
            s.library.generationError = err instanceof Error ? err.message : 'Unknown error'
            s.library.streamBuffer = ''
          })
          resolve(false)
        })
      })
    },

    // Sugar: called by the Generate button with a hidden prompt
    chatFromGenerate: async () => {
      return get().chat(GENERATE_PROMPT, 'generate')
    },

    chat: async (instruction: string, mode: 'generate' | 'chat') => {
      const state = get()

      if (state.examples.length === 0) {
        set((s) => {
          s.toastState = { kind: 'done', message: 'Add at least one example before generating.' }
        })
        return
      }

      const priorLibraryCode = state.library.code
      const priorExamples: VersionedExample[] = state.examples.map((e) => ({
        id: e.id, name: e.name, code: e.code,
      }))

      // No-op check: generate mode with nothing changed and library exists
      const diff = computeDiff(state.lastGeneratedExamples, state.examples)
      const nothingChanged = diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0
      if (mode === 'generate' && nothingChanged && state.library.code) {
        set((s) => {
          s.toastState = { kind: 'done', message: 'Nothing has changed since the last generation — the library is already up to date.' }
        })
        return
      }

      const toastMessage = mode === 'generate' ? 'Generating…' : `"${instruction}"`

      set((s) => {
        s.library.generationError = null
        s.lastDiff = null
        s.toastState = { kind: 'thinking', message: toastMessage, step: 'Planning…' }
      })

      try {
        const body: ChatRequestBody = {
          instruction,
          mode,
          examples: state.examples.map((e) => ({
            id: e.id,
            name: e.name,
            code: e.code,
            error: e.status === 'fail' ? e.error : null,
          })),
          libraryCode: state.library.code,
          diff,
        }

        const plan: ChatPlan = await ipc.invokeChat(body)

        if (plan.type === 'answer') {
          set((s) => {
            s.library.isGenerating = false
            s.toastState = { kind: 'done', message: plan.text }
          })
          return
        }

        // Execute action steps in sequence
        for (const step of plan.steps) {
          if (step.tool === 'optimize_example') {
            const name = get().examples.find((e) => e.id === step.id)?.name ?? 'example'
            set((s) => {
              s.toastState = { kind: 'thinking', message: toastMessage, step: `Fixing ${name}…` }
            })
            get().setExampleCode(step.id, step.code)

          } else if (step.tool === 'delete_example') {
            const name = get().examples.find((e) => e.id === step.id)?.name ?? 'example'
            set((s) => {
              s.toastState = { kind: 'thinking', message: toastMessage, step: `Removing ${name}…` }
            })
            get().deleteExample(step.id)

          } else if (step.tool === 'add_example') {
            set((s) => {
              s.toastState = { kind: 'thinking', message: toastMessage, step: `Adding ${step.name}…` }
              const id = nanoid()
              s.examples.push({
                id,
                name: step.name,
                code: step.code,
                status: 'idle',
                error: null,
                consoleOutput: [],
                snapshotStatus: 'none',
              })
              s.activeExampleId = id
              s.viewingLibrary = false
            })

          } else if (step.tool === 'rename_example') {
            const ex = get().examples.find((e) => e.id === step.id)
            if (ex && ex.name === 'untitled.js') {
              get().setExampleName(step.id, step.name)
            }

          } else if (step.tool === 'update_library') {
            set((s) => {
              s.toastState = { kind: 'thinking', message: toastMessage, step: 'Generating library…' }
            })
            const ok = await get()._generateLibraryCode(instruction)
            if (!ok) {
              throw new Error(get().library.generationError ?? 'Library generation failed')
            }
          }
        }

        // Determine what actually changed
        const finalExamples: VersionedExample[] = get().examples.map((e) => ({
          id: e.id, name: e.name, code: e.code,
        }))
        const libraryChanged = get().library.code !== priorLibraryCode
        const samplesChanged = examplesChanged(priorExamples, finalExamples)

        if (libraryChanged || samplesChanged) {
          await get().saveVersion(instruction, priorLibraryCode, priorExamples)
          set((s) => { s.lastGeneratedExamples = finalExamples })
        }

        // Build done summary: prefer AI note for conflict explanations, otherwise use diff
        const summary = plan.note ?? buildDoneSummary(priorLibraryCode, priorExamples, get().library.code, finalExamples)

        // Compute per-file diffs for the diff modal
        const displayName = (name: string) => /\.\w+$/.test(name) ? name : `${name}.js`
        const fileDiffs: FileDiff[] = []
        if (get().library.code !== priorLibraryCode) {
          fileDiffs.push({ name: 'library.js', before: priorLibraryCode, after: get().library.code, kind: 'modified' })
        }
        const priorExMap = new Map(priorExamples.map((e) => [e.id, e]))
        for (const e of finalExamples) {
          const prev = priorExMap.get(e.id)
          if (!prev) {
            fileDiffs.push({ name: displayName(e.name), before: '', after: e.code, kind: 'added' })
          } else if (prev.code !== e.code || prev.name !== e.name) {
            fileDiffs.push({ name: displayName(e.name), before: prev.code, after: e.code, kind: 'modified' })
          }
        }
        for (const e of priorExamples) {
          if (!finalExamples.find((fe) => fe.id === e.id)) {
            fileDiffs.push({ name: displayName(e.name), before: e.code, after: '', kind: 'removed' })
          }
        }

        set((s) => {
          s.library.isGenerating = false
          s.lastDiff = fileDiffs.length > 0 ? fileDiffs : null
          s.toastState = { kind: 'done', message: summary }
        })

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        set((s) => {
          s.library.isGenerating = false
          s.library.generationError = msg
          s.toastState = { kind: 'done', message: `Error: ${msg}` }
        })
      }
    },
  }))
)
