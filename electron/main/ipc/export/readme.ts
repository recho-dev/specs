import Anthropic from '@anthropic-ai/sdk'
import type { ExportMeta } from '@/types'
import { readApiKey } from '../keystore'

export function buildFallbackReadme(meta: ExportMeta): string {
  return `# ${meta.name}

${meta.description ?? 'A JavaScript library.'}

## Installation

\`\`\`bash
npm install ${meta.name}
\`\`\`

## Usage

\`\`\`js
import * as lib from '${meta.name}'
\`\`\`

## License

${meta.license || 'MIT'}
`
}

export async function generateReadme(
  meta: ExportMeta,
  examples: { name: string; code: string }[]
): Promise<string> {
  const apiKey = await readApiKey()
  if (!apiKey) return buildFallbackReadme(meta)

  const client = new Anthropic({ apiKey })

  const examplesText = examples
    .map((e) => `### ${e.name}\n\`\`\`js\n${e.code}\n\`\`\``)
    .join('\n\n')

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        'You write concise, developer-friendly README.md files for npm packages. Use proper Markdown. Be brief and practical. No fluff.',
      messages: [
        {
          role: 'user',
          content: `Write a README.md for this npm package:

Name: ${meta.name}${meta.description ? `\nDescription: ${meta.description}` : ''}${meta.author ? `\nAuthor: ${meta.author}` : ''}
License: ${meta.license || 'MIT'}

Usage examples:

${examplesText}

Requirements:
- Start with "# ${meta.name}" as the H1 title
- 1–2 sentence description
- Installation section showing \`npm install ${meta.name}\`
- Show the usage examples above as code blocks with brief context
- Keep it concise. No API reference section.`,
        },
      ],
    })

    return response.content[0]?.type === 'text'
      ? response.content[0].text
      : buildFallbackReadme(meta)
  } catch {
    return buildFallbackReadme(meta)
  }
}
