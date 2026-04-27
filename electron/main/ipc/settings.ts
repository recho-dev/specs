import { ipcMain } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import { readApiKey, writeApiKey } from './keystore'

ipcMain.handle('settings:has-api-key', async () => {
  const key = await readApiKey()
  return !!key
})

ipcMain.handle('settings:get-api-key', async () => {
  return readApiKey()
})

ipcMain.handle('settings:set-api-key', async (_e, key: string) => {
  await writeApiKey(key)
})

ipcMain.handle('settings:validate-api-key', async (_e, key: string): Promise<{ valid: true } | { valid: false; reason: string }> => {
  try {
    const client = new Anthropic({ apiKey: key })
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    return { valid: true }
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401 || err.status === 403) {
        return { valid: false, reason: 'Invalid API key.' }
      }
      if (err.status === 402 || (err.status === 429 && /credit|balance/i.test(err.message))) {
        return { valid: false, reason: 'Insufficient credits on this key.' }
      }
      return { valid: false, reason: err.message }
    }
    return { valid: false, reason: 'Could not reach the Anthropic API.' }
  }
})
