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
  SpecRequestBody,
  SpecResponse,
  SpecConversationTurn,
  Version,
  VersionedExample,
  ProjectFile,
  LoadedProject,
  ExampleStatus,
  ExportMeta,
} from '@/types'

const MAX_VERSIONS = 50

const DEFAULT_EXAMPLE_CODE = `// Write how you want to use the library here
// Example:
// const chart = new BarChart(document.querySelector('#container'));
// chart.setData([10, 30, 20, 50, 40]);
// chart.render();
`

interface WorkbenchStore {
  projectPath: string | null
  isProjectLoaded: boolean

  examples: Example[]
  library: LibraryState
  activeExampleId: string | null
  viewingLibrary: boolean

  specQuestion: string | null
  specConversationHistory: SpecConversationTurn[]
  pendingRefinementInstruction: string

  versions: Version[]
  activeVersionId: string | null

  generationId: number

  exportMeta: ExportMeta | null
  setExportMeta: (meta: ExportMeta) => void

  aiMessage: string | null
  aiMessageLoading: boolean
  dismissAiMessage: () => void

  addExample: () => void
  insertExampleAt: (index: number) => void
  setExampleCode: (id: string, code: string) => void
  setExampleName: (id: string, name: string) => void
  setExampleStatus: (id: string, status: Example['status'], error?: string | null) => void
  appendConsoleLine: (id: string, line: ConsoleLine) => void
  setActiveExample: (id: string) => void

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

  generate: (refinement?: string) => Promise<void>
  refine: (instruction: string) => Promise<void>
  answerSpecQuestion: (answer: string) => Promise<void>
  _handleSpecResponse: (data: SpecResponse) => Promise<void>
}

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
    specQuestion: null,
    specConversationHistory: [],
    pendingRefinementInstruction: '',
    generationId: 0,
    exportMeta: null,
    versions: [],
    activeVersionId: null,

    aiMessage: null,
    aiMessageLoading: false,

    dismissAiMessage: () => {
      set((s) => {
        s.aiMessage = null
        s.aiMessageLoading = false
      })
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
        s.specQuestion = null
        s.specConversationHistory = []
        s.pendingRefinementInstruction = ''
        s.examples = file.examples.map((e) => ({
          id: e.id,
          name: e.name,
          code: e.code,
          status: 'idle' as ExampleStatus,
          error: null,
          consoleOutput: [],
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
        examples: s.examples.map((e) => ({ id: e.id, name: e.name, code: e.code })),
        libraryCode: s.library.code,
        activeExampleId: s.activeExampleId,
        viewingLibrary: s.viewingLibrary,
        versions: s.versions,
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
          name: `Example ${state.examples.length + 1}`,
          code: DEFAULT_EXAMPLE_CODE,
          status: 'idle',
          error: null,
          consoleOutput: [],
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
        }
        const clamped = Math.max(0, Math.min(index, state.examples.length))
        state.examples.splice(clamped, 0, next)
        state.activeExampleId = id
        state.viewingLibrary = false
      })
    },

    setExampleCode: (id, code) => {
      set((state) => {
        const ex = state.examples.find((e) => e.id === id)
        if (ex) ex.code = code
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

      set((s) => { s.aiMessageLoading = true })

      // Async: get a richer description and update
      ipc.invokeSummarize({
        refinementPrompt,
        previousLibraryCode: priorLibraryCode,
        currentLibraryCode: state.library.code,
        previousExamples: priorExamples,
        currentExamples,
      })
        .then(({ description, aiMessage }) => {
          if (description) {
            get()._updateVersionDescription(versionId, description)
            ipc.projectSave(get().buildProjectFile()).catch(() => {})
          }
          set((s) => {
            s.aiMessage = aiMessage || null
            s.aiMessageLoading = false
          })
        })
        .catch(() => {
          set((s) => { s.aiMessageLoading = false })
        })
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
        s.specQuestion = null
        s.specConversationHistory = []
        s.pendingRefinementInstruction = ''
        s.examples = version.examples.map((e) => ({
          id: e.id,
          name: e.name,
          code: e.code,
          status: 'idle' as ExampleStatus,
          error: null,
          consoleOutput: [],
        }))
        s.versions.unshift(restoreVersion)
        if (s.versions.length > MAX_VERSIONS) s.versions.splice(MAX_VERSIONS)
        s.activeVersionId = restoreId
      })

      await ipc.projectSave(get().buildProjectFile())
    },

    refine: async (instruction) => {
      const state = get()
      if (state.examples.length === 0) return

      set((s) => {
        s.library.isGenerating = true
        s.library.generationError = null
        s.specConversationHistory = []
        s.pendingRefinementInstruction = instruction
        s.specQuestion = null
      })

      try {
        const body: SpecRequestBody = {
          examples: state.examples.map((e) => ({ id: e.id, name: e.name, code: e.code })),
          refinementInstruction: instruction,
          conversationHistory: [],
        }
        const data = await ipc.invokeSpec(body)
        await get()._handleSpecResponse(data)
      } catch (err) {
        get().setGenerationError(err instanceof Error ? err.message : 'Spec agent failed')
      }
    },

    answerSpecQuestion: async (answer) => {
      const state = get()
      const history: SpecConversationTurn[] = [
        ...state.specConversationHistory,
        { question: state.specQuestion!, answer },
      ]

      set((s) => {
        s.specConversationHistory = history
        s.specQuestion = null
        s.library.isGenerating = true
        s.library.generationError = null
      })

      try {
        const body: SpecRequestBody = {
          examples: state.examples.map((e) => ({ id: e.id, name: e.name, code: e.code })),
          refinementInstruction: state.pendingRefinementInstruction,
          conversationHistory: history,
        }
        const data = await ipc.invokeSpec(body)
        await get()._handleSpecResponse(data)
      } catch (err) {
        get().setGenerationError(err instanceof Error ? err.message : 'Spec agent failed')
      }
    },

    _handleSpecResponse: async (data) => {
      if (data.type === 'question') {
        set((s) => {
          s.specQuestion = data.question
          s.library.isGenerating = false
        })
        return
      }

      const pendingInstruction = get().pendingRefinementInstruction

      if (data.type === 'update') {
        set((s) => {
          for (const updated of data.examples) {
            const ex = s.examples.find((e) => e.id === updated.id)
            if (ex) {
              ex.name = updated.name
              ex.code = updated.code
            }
          }
          s.specQuestion = null
          s.specConversationHistory = []
          s.pendingRefinementInstruction = ''
        })
      } else {
        set((s) => {
          s.specQuestion = null
          s.specConversationHistory = []
          s.pendingRefinementInstruction = ''
        })
      }

      await get().generate(pendingInstruction)
    },

    generate: async (refinement = '') => {
      const state = get()
      if (state.examples.length === 0) return

      const priorLibraryCode = state.library.code
      const priorExamples: VersionedExample[] = state.examples.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
      }))

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
        s.aiMessage = null
        s.aiMessageLoading = false
        s.examples.forEach((e) => {
          e.status = 'running'
          e.consoleOutput = []
          e.error = null
        })
      })

      await new Promise<void>((resolve) => {
        ipc.offGenerateListeners()

        ipc.onGenerateChunk((chunk) => {
          get().appendStreamBuffer(chunk)
        })

        ipc.onGenerateDone(async () => {
          ipc.offGenerateListeners()
          const buffer = get().library.streamBuffer

          if (buffer.includes('__ERROR__:')) {
            const errMsg = buffer.split('__ERROR__:')[1]?.trim() ?? 'Generation failed'
            get().setGenerationError(errMsg)
            resolve()
            return
          }

          const libraryCode = extractCodeFromBuffer(buffer)
          get().setLibraryCode(libraryCode)
          await get().saveVersion(refinement, priorLibraryCode, priorExamples)
          set((s) => {
            s.library.isGenerating = false
            s.generationId += 1
          })
          resolve()
        })

        ipc.onGenerateError((err) => {
          ipc.offGenerateListeners()
          get().setGenerationError(err)
          resolve()
        })

        ipc.generateStart(body).catch((err) => {
          ipc.offGenerateListeners()
          get().setGenerationError(err instanceof Error ? err.message : 'Unknown error')
          resolve()
        })
      })
    },
  }))
)
