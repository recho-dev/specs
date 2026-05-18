import { ipcMain } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, buildGenerationMessages, CHAT_SYSTEM_PROMPT, buildChatMessages } from '@/lib/prompts'
import type { GenerateRequestBody, ChatRequestBody, ChatPlan, SummarizeRequestBody, VersionedExample } from '@/types'
import { readApiKey } from './keystore'

function buildDiffSummary(body: SummarizeRequestBody): string {
  const parts: string[] = []
  if (body.refinementPrompt) parts.push(`User instruction: "${body.refinementPrompt}"`)

  const prevExMap = new Map(body.previousExamples.map((e) => [e.id, e]))
  const currExMap = new Map(body.currentExamples.map((e) => [e.id, e]))

  const added = body.currentExamples.filter((e) => !prevExMap.has(e.id))
  const removed = body.previousExamples.filter((e) => !currExMap.has(e.id))
  const changed = body.currentExamples.filter((e) => {
    const prev = prevExMap.get(e.id)
    return prev && prev.code !== e.code
  })

  if (added.length) parts.push(`Added examples: ${added.map((e) => e.name).join(', ')}`)
  if (removed.length) parts.push(`Removed examples: ${removed.map((e) => e.name).join(', ')}`)
  if (changed.length) parts.push(`Modified examples: ${changed.map((e) => e.name).join(', ')}`)

  const libChanged = body.previousLibraryCode !== body.currentLibraryCode
  if (libChanged && !body.previousLibraryCode) {
    parts.push('Initial library generation')
  } else if (libChanged) {
    parts.push('Library code updated')
  }

  return parts.join('\n')
}

ipcMain.handle('claude:generate', async (event, body: GenerateRequestBody) => {
  const apiKey = await readApiKey()
  if (!apiKey) {
    event.sender.send('claude:generate:error', 'API key not configured. Go to Settings > API Key to add your Anthropic key.')
    return
  }

  const client = new Anthropic({ apiKey })
  const messages = buildGenerationMessages(body)

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages,
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        event.sender.send('claude:generate:chunk', chunk.delta.text)
      }
    }
    event.sender.send('claude:generate:done')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed'
    event.sender.send('claude:generate:error', msg)
  }
})

function extractFirstJSON(text: string): string {
  const start = text.indexOf('{')
  if (start === -1) return text.trim()
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  return text.trim()
}

ipcMain.handle('claude:chat', async (_e, body: ChatRequestBody): Promise<ChatPlan> => {
  const apiKey = await readApiKey()
  if (!apiKey) {
    return { type: 'answer', text: 'API key not configured. Please add your Anthropic API key in Settings.' }
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: CHAT_SYSTEM_PROMPT,
      messages: buildChatMessages(body),
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const jsonStr = extractFirstJSON(text)
    return JSON.parse(jsonStr) as ChatPlan
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { type: 'answer', text: `Something went wrong: ${msg}` }
  }
})

ipcMain.handle('claude:summarize', async (_e, body: SummarizeRequestBody): Promise<{ description: string; aiMessage: string }> => {
  const apiKey = await readApiKey()
  if (!apiKey) return { description: body.refinementPrompt || 'Generated', aiMessage: '' }

  const client = new Anthropic({ apiKey })
  const context = buildDiffSummary(body)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system:
      'You summarize what changed in a Recho Specs session. Respond with two parts separated by "|||": first, a short version label (under 8 words, no punctuation at end, e.g. "Added animation example, updated library"); second, 2-3 sentences describing what changed — mention both library updates AND example additions, removals, or fixes if applicable, written directly to the developer. Be specific and concrete.',
    messages: [{ role: 'user', content: context }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
  const [label, message] = text.split('|||').map((s) => s.trim())
  return {
    description: label || body.refinementPrompt || 'Generated',
    aiMessage: message || '',
  }
})
