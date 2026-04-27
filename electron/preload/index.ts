import { contextBridge, ipcRenderer } from 'electron'
import type { GenerateRequestBody, SpecRequestBody, SpecResponse, LoadedProject, ProjectFile, ExportRequestBody, ExportResult } from '../../src/types'

contextBridge.exposeInMainWorld('electronAPI', {
  // Claude: streaming generation
  generateStart: (body: GenerateRequestBody) => ipcRenderer.invoke('claude:generate', body),
  onGenerateChunk: (cb: (chunk: string) => void) =>
    ipcRenderer.on('claude:generate:chunk', (_e, chunk) => cb(chunk)),
  onGenerateDone: (cb: () => void) =>
    ipcRenderer.on('claude:generate:done', () => cb()),
  onGenerateError: (cb: (err: string) => void) =>
    ipcRenderer.on('claude:generate:error', (_e, err) => cb(err)),
  offGenerateListeners: () => {
    ipcRenderer.removeAllListeners('claude:generate:chunk')
    ipcRenderer.removeAllListeners('claude:generate:done')
    ipcRenderer.removeAllListeners('claude:generate:error')
  },

  // Claude: non-streaming
  invokeSpec: (body: SpecRequestBody): Promise<SpecResponse> =>
    ipcRenderer.invoke('claude:spec', body),
  invokeSummarize: (body: unknown): Promise<{ description: string; aiMessage: string }> =>
    ipcRenderer.invoke('claude:summarize', body),

  // Project
  projectNew: (): Promise<LoadedProject> =>
    ipcRenderer.invoke('project:new'),
  projectOpen: (): Promise<LoadedProject | null> =>
    ipcRenderer.invoke('project:open'),
  projectSave: (file: ProjectFile): Promise<string | null> =>
    ipcRenderer.invoke('project:save', file),

  // Settings
  hasApiKey: (): Promise<boolean> =>
    ipcRenderer.invoke('settings:has-api-key'),
  setApiKey: (key: string): Promise<void> =>
    ipcRenderer.invoke('settings:set-api-key', key),
  validateApiKey: (key: string): Promise<{ valid: true } | { valid: false; reason: string }> =>
    ipcRenderer.invoke('settings:validate-api-key', key),

  // Menu events from main process
  onMenu: (event: string, cb: () => void) =>
    ipcRenderer.on(`menu:${event}`, () => cb()),
  offMenu: (event: string) =>
    ipcRenderer.removeAllListeners(`menu:${event}`),

  // Export
  invokeExport: (body: ExportRequestBody): Promise<ExportResult> =>
    ipcRenderer.invoke('project:export', body),
  openPath: (path: string): Promise<void> =>
    ipcRenderer.invoke('shell:open-path', path),
})
