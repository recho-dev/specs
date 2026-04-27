import { app, BrowserWindow, protocol, net, Menu, ipcMain, shell } from 'electron'
import { join } from 'path'

// Must be called before app.ready
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false }
}])

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    }
  })

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  // Serve sandbox.html via app:// for both dev and prod
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    if (!app.isPackaged) {
      return net.fetch(`http://localhost:5173${url.pathname}`)
    }
    const filePath = join(__dirname, '../renderer', url.pathname)
    return net.fetch(`file://${filePath}`)
  })

  const win = createWindow()
  Menu.setApplicationMenu(buildMenu(win))

  // Register IPC handlers (imported lazily to avoid circular deps at startup)
  import('./ipc/settings').catch(() => {})
  import('./ipc/claude').catch(() => {})
  import('./ipc/project').then(({ setMainWindow }) => setMainWindow(win)).catch(() => {})
  import('./ipc/export').then(({ setMainWindow }) => setMainWindow(win)).catch(() => {})

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  contents.on('will-navigate', (event, url) => {
    const isLocal = url.startsWith('http://localhost') || url.startsWith('file://') || url.startsWith('app://')
    if (!isLocal) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
})

function buildMenu(win: BrowserWindow): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send('menu:new-project')
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => win.webContents.send('menu:open-project')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('menu:save-project')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Reset Anthropic API Key',
          click: async () => {
            const { writeApiKey } = await import('./ipc/keystore')
            await writeApiKey('')
          }
        }
      ]
    }
  ])
}
