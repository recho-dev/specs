import { ipcMain, dialog, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join, basename } from 'path'
import type { LoadedProject, ProjectFile } from '@/types'

let currentFilePath: string | null = null
let mainWindow: BrowserWindow | null = null
let isDirty = false
let pendingClose = false

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
  win.on('close', async (e) => {
    if (!isDirty) return
    e.preventDefault()
    pendingClose = false
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      message: 'Do you want to save your changes?',
      detail: "Your changes will be lost if you don't save them.",
    })
    if (response === 0) {
      pendingClose = true
      win.webContents.send('menu:save-project')
    } else if (response === 1) {
      isDirty = false
      win.close()
    }
  })
}

const RSPEC_FILTER = [{ name: 'Recho Specs Projects', extensions: ['rspec'] }]

const EMPTY_PROJECT: ProjectFile = {
  examples: [],
  libraryCode: '',
  activeExampleId: null,
  viewingLibrary: false,
  versions: [],
  snapshotBlobs: [],
}

function setTitle(filePath: string | null): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const name = filePath ? basename(filePath, '.rspec') : 'Untitled'
  mainWindow.setTitle(`Recho Specs — ${name}`)
}

ipcMain.handle('project:new', (): LoadedProject => {
  currentFilePath = null
  setTitle(null)
  return { filePath: null, file: { ...EMPTY_PROJECT } }
})

ipcMain.handle('project:open', async (): Promise<LoadedProject | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Open Project',
    filters: RSPEC_FILTER,
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
      defaultPath: 'untitled.rspec',
      filters: RSPEC_FILTER,
    })
    if (result.canceled || !result.filePath) return null
    currentFilePath = result.filePath
    setTitle(currentFilePath)
  }

  await fs.writeFile(currentFilePath, JSON.stringify(file, null, 2), 'utf-8')
  return currentFilePath
})

ipcMain.handle('project:set-dirty', (_e, dirty: boolean) => {
  isDirty = dirty
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setDocumentEdited(dirty)
    if (!dirty && pendingClose) {
      pendingClose = false
      mainWindow.close()
    }
  }
})
