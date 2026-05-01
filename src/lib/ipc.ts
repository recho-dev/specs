import type { GenerateRequestBody, ChatRequestBody, ChatPlan, LoadedProject, ProjectFile, SummarizeRequestBody, ExportRequestBody, ExportResult, PreviewFile, PreviewSyncRequest, GenerateReadmeRequest, GenerateTestFilesRequest } from '@/types'

const api = () => (window as unknown as { electronAPI: ElectronAPI }).electronAPI

interface ElectronAPI {
  generateStart: (body: GenerateRequestBody) => Promise<void>
  onGenerateChunk: (cb: (chunk: string) => void) => void
  onGenerateDone: (cb: () => void) => void
  onGenerateError: (cb: (err: string) => void) => void
  offGenerateListeners: () => void
  invokeChat: (body: ChatRequestBody) => Promise<ChatPlan>
  invokeSummarize: (body: SummarizeRequestBody) => Promise<{ description: string; aiMessage: string }>
  projectNew: () => Promise<LoadedProject>
  projectOpen: () => Promise<LoadedProject | null>
  projectOpenPath: (filePath: string) => Promise<LoadedProject | null>
  projectSave: (file: ProjectFile) => Promise<string | null>
  projectSetDirty: (isDirty: boolean) => Promise<void>
  hasApiKey: () => Promise<boolean>
  setApiKey: (key: string) => Promise<void>
  validateApiKey: (key: string) => Promise<{ valid: true } | { valid: false; reason: string }>
  onMenu: (event: string, cb: () => void) => void
  offMenu: (event: string) => void
  invokeExport: (body: ExportRequestBody) => Promise<ExportResult>
  previewSync: (body: PreviewSyncRequest) => Promise<PreviewFile[]>
  generateReadme: (body: GenerateReadmeRequest) => Promise<string>
  generateTestFiles: (body: GenerateTestFilesRequest) => Promise<PreviewFile[]>
  openPath: (path: string) => Promise<void>
}

export const ipc = {
  generateStart: (body: GenerateRequestBody) => api().generateStart(body),
  onGenerateChunk: (cb: (chunk: string) => void) => api().onGenerateChunk(cb),
  onGenerateDone: (cb: () => void) => api().onGenerateDone(cb),
  onGenerateError: (cb: (err: string) => void) => api().onGenerateError(cb),
  offGenerateListeners: () => api().offGenerateListeners(),
  invokeChat: (body: ChatRequestBody) => api().invokeChat(body),
  invokeSummarize: (body: SummarizeRequestBody) => api().invokeSummarize(body),
  projectNew: () => api().projectNew(),
  projectOpen: () => api().projectOpen(),
  projectOpenPath: (filePath: string) => api().projectOpenPath(filePath),
  projectSave: (file: ProjectFile) => api().projectSave(file),
  projectSetDirty: (isDirty: boolean) => api().projectSetDirty(isDirty),
  hasApiKey: () => api().hasApiKey(),
  setApiKey: (key: string) => api().setApiKey(key),
  validateApiKey: (key: string) => api().validateApiKey(key),
  onMenu: (event: string, cb: () => void) => api().onMenu(event, cb),
  offMenu: (event: string) => api().offMenu(event),
  invokeExport: (body: ExportRequestBody) => api().invokeExport(body),
  previewSync: (body: PreviewSyncRequest) => api().previewSync(body),
  generateReadme: (body: GenerateReadmeRequest) => api().generateReadme(body),
  generateTestFiles: (body: GenerateTestFilesRequest) => api().generateTestFiles(body),
  openPath: (path: string) => api().openPath(path),
}
