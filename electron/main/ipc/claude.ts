import { ipcMain } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, buildGenerationMessages, SPEC_SYSTEM_PROMPT, buildSpecMessages } from '@/lib/prompts'
import type { GenerateRequestBody, SpecRequestBody, SpecResponse, SummarizeRequestBody, VersionedExample } from '@/types'
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

ipcMain.handle('claude:spec', async (_e, body: SpecRequestBody): Promise<SpecResponse> => {
  const apiKey = await readApiKey()
  if (!apiKey) {
    return { type: 'passthrough' }
  }

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SPEC_SYSTEM_PROMPT,
    messages: buildSpecMessages(body),
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
  try {
    return JSON.parse(text) as SpecResponse
  } catch {
    return { type: 'update', examples: body.examples }
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
      'You summarize what was accomplished in a code generation step. Respond with two parts separated by "|||": first, a short version label (under 8 words, no punctuation at end, e.g. "Initial bar chart generation"); second, 2-3 sentences describing what was built or changed and why it matters, written directly to the developer. Be specific and concrete.',
    messages: [{ role: 'user', content: context }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
  const [label, message] = text.split('|||').map((s) => s.trim())
  return {
    description: label || body.refinementPrompt || 'Generated',
    aiMessage: message || '',
  }
})
