import { ipcMain, app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

const settingsPath = join(app.getPath('userData'), 'settings.json')

async function readSettings(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(settingsPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeSettings(data: Record<string, string>): Promise<void> {
  await fs.writeFile(settingsPath, JSON.stringify(data, null, 2), 'utf-8')
}

ipcMain.handle('settings:get-api-key', async () => {
  const settings = await readSettings()
  return settings.apiKey ?? ''
})

ipcMain.handle('settings:set-api-key', async (_e, key: string) => {
  const settings = await readSettings()
  settings.apiKey = key
  await writeSettings(settings)
})
