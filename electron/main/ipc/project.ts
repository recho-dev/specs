import { ipcMain, dialog, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join, basename } from 'path'
import type { LoadedProject, ProjectFile } from '@/types'

let currentFilePath: string | null = null
let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

const RFORM_FILTER = [{ name: 'Recho Form Projects', extensions: ['rform'] }]

const EMPTY_PROJECT: ProjectFile = {
  examples: [],
  libraryCode: '',
  activeExampleId: null,
  viewingLibrary: false,
  versions: [],
  snapshotBlobs: [],
}

function setTitle(filePath: string | null): void {
  const name = filePath ? basename(filePath, '.rform') : 'Untitled'
  mainWindow?.setTitle(`Recho Form — ${name}`)
}

ipcMain.handle('project:new', (): LoadedProject => {
  currentFilePath = null
  setTitle(null)
  return { filePath: null, file: { ...EMPTY_PROJECT } }
})

ipcMain.handle('project:open', async (): Promise<LoadedProject | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Open Project',
    filters: RFORM_FILTER,
    properties: ['openFile'],
  })
  if (result.canceled || !result.filePaths[0]) return null

  const filePath = result.filePaths[0]
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const file: ProjectFile = { ...EMPTY_PROJECT, ...JSON.parse(raw) }
    currentFilePath = filePath
    setTitle(filePath)
    return { filePath, file }
  } catch {
    return null
  }
})

ipcMain.handle('project:open-path', async (_e, filePath: string): Promise<LoadedProject | null> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const file: ProjectFile = { ...EMPTY_PROJECT, ...JSON.parse(raw) }
    currentFilePath = filePath
    setTitle(filePath)
    return { filePath, file }
  } catch {
    return null
  }
})

ipcMain.handle('project:save', async (_e, file: ProjectFile): Promise<string | null> => {
  if (!currentFilePath) {
    const result = await dialog.showSaveDialog({
      title: 'Save Project',
      defaultPath: 'untitled.rform',
      filters: RFORM_FILTER,
    })
    if (result.canceled || !result.filePath) return null
    currentFilePath = result.filePath
    setTitle(currentFilePath)
  }

  await fs.writeFile(currentFilePath, JSON.stringify(file, null, 2), 'utf-8')
  return currentFilePath
})
