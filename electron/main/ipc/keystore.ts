import { app, safeStorage } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

const KEY_PATH = join(app.getPath('userData'), 'api_key.bin')

export async function readApiKey(): Promise<string> {
  try {
    const buf = await fs.readFile(KEY_PATH)
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buf)
      : buf.toString('utf-8')
  } catch {
    return ''
  }
}

export async function writeApiKey(key: string): Promise<void> {
  if (!key) {
    await fs.rm(KEY_PATH, { force: true }).catch(() => {})
    return
  }
  if (safeStorage.isEncryptionAvailable()) {
    await fs.writeFile(KEY_PATH, safeStorage.encryptString(key))
  } else {
    await fs.writeFile(KEY_PATH, key, 'utf-8')
  }
}
