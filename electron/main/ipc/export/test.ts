import Anthropic from '@anthropic-ai/sdk'
import type { PreviewFile } from '@/types'
import { readApiKey } from '../keystore'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function toSlug(name: string): string {
  const slug = name
    .replace(/\.js$/, '')
    .replace(/([A-Z])/g, (m) => '-' + m.toLowerCase())
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'example'
}

function toCamel(slug: string): string {
  return slug.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
}

// Returns the paths that buildTestFiles will produce, without doing any AI work.
// Used by preview-sync to decide whether to include vitest in package.json.
export function getTestFilePaths(examples: { name: string; snapshotHtml?: string }[]): string[] {
  const eligible = examples.filter((e) => !!e.snapshotHtml)
  if (eligible.length === 0) return []

  const slugs = eligible.map((e) => toSlug(e.name))
  return [
    ...slugs.map((s) => `test/examples/${s}.js`),
    'test/examples/index.js',
    ...slugs.map((s) => `test/output/${s}.html`),
    'test/snapshot.spec.js',
    'vitest.config.js',
  ]
}

function transformExampleFallback(code: string, packageName: string, funcName: string): string {
  let transformed = code

  transformed = transformed.replace(
    new RegExp(`from\\s+(['"])${escapeRegex(packageName)}\\1`, 'g'),
    "from '../../src/index.js'",
  )

  transformed = transformed.replace(/['"]#container['"]/g, 'container')
  transformed = transformed.replace(
    /^\s*(?:const|let|var)\s+\w+\s*=\s*document\.querySelector\s*\(\s*['"]#container['"]\s*\)\s*;?\s*$/gm,
    '',
  )
  transformed = transformed.replace(
    /^\s*(?:const|let|var)\s+\w+\s*=\s*document\.getElementById\s*\(\s*['"]container['"]\s*\)\s*;?\s*$/gm,
    '',
  )
  transformed = transformed.replace(/document\.querySelector\s*\(\s*['"]#container['"]\s*\)/g, 'container')
  transformed = transformed.replace(/document\.getElementById\s*\(\s*['"]container['"]\s*\)/g, 'container')

  const lines = transformed.split('\n')
  const importLines: string[] = []
  const bodyLines: string[] = []
  for (const line of lines) {
    if (/^import\s/.test(line.trim())) importLines.push(line)
    else bodyLines.push(line)
  }

  const body = bodyLines.join('\n').trim()
  const indentedBody = body.split('\n').map((l) => (l ? `  ${l}` : '')).join('\n')

  return [
    ...importLines,
    '',
    `export function ${funcName}() {`,
    `  const container = document.createElement('div')`,
    ...(body ? [indentedBody] : []),
    `  return container`,
    `}`,
    '',
  ].join('\n')
}

async function rewriteExample(
  client: Anthropic,
  code: string,
  packageName: string,
  funcName: string,
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        'You rewrite JavaScript example code into exportable functions. Return only the rewritten code — no explanation, no markdown fences.',
      messages: [
        {
          role: 'user',
          content: `Rewrite this example as an exported function named \`${funcName}\` that returns a DOM node.

Rules:
- Create \`const container = document.createElement('div')\` at the top of the function body
- Replace every reference to the container element — whether a DOM query like \`document.querySelector('#container')\`, a selector string like \`'#container'\`, or a variable already holding it — so the code uses the local \`container\` variable instead
- Change any import from '${packageName}' to import from '../../src/index.js'
- Return \`container\` at the end
- Keep all other logic exactly as-is
- Export the function: \`export function ${funcName}() { ... }\`

Example code:
\`\`\`js
${code}
\`\`\``,
        },
      ],
    })

    if (response.content[0]?.type !== 'text') {
      return transformExampleFallback(code, packageName, funcName)
    }
    const text = response.content[0].text
    const fenced = text.match(/^```(?:\w+)?\n([\s\S]*?)\n?```\s*$/)
    return fenced ? fenced[1] : text
  } catch {
    return transformExampleFallback(code, packageName, funcName)
  }
}

interface TestExample {
  name: string
  code: string
  snapshotHtml: string
}

export async function buildTestFiles(
  examples: { name: string; code: string; snapshotHtml?: string }[],
  packageName: string,
): Promise<PreviewFile[]> {
  const eligible = examples.filter((e): e is TestExample => !!e.snapshotHtml)
  if (eligible.length === 0) return []

  const entries = eligible.map((e) => {
    const slug = toSlug(e.name)
    return { slug, funcName: toCamel(slug), example: e }
  })

  const apiKey = await readApiKey()
  const client = apiKey ? new Anthropic({ apiKey }) : null

  const rewritten = await Promise.all(
    entries.map(({ funcName, example }) =>
      client
        ? rewriteExample(client, example.code, packageName, funcName)
        : Promise.resolve(transformExampleFallback(example.code, packageName, funcName)),
    ),
  )

  const files: PreviewFile[] = []

  entries.forEach(({ slug }, i) => {
    files.push({ path: `test/examples/${slug}.js`, content: rewritten[i] })
  })

  // test/examples/index.js — re-exports all functions so the spec can import * as examples
  const reExports = entries
    .map(({ slug, funcName }) => `export { ${funcName} } from './${slug}.js'`)
    .join('\n')
  files.push({ path: 'test/examples/index.js', content: reExports + '\n' })

  entries.forEach(({ slug, example }) => {
    files.push({ path: `test/output/${slug}.html`, content: example.snapshotHtml })
  })

  files.push({
    path: 'test/snapshot.spec.js',
    content: [
      `import { readFileSync } from 'fs'`,
      `import { join } from 'path'`,
      `import { fileURLToPath } from 'url'`,
      `import { describe, it, expect } from 'vitest'`,
      `import * as examples from './examples/index.js'`,
      ``,
      `const __dirname = join(fileURLToPath(import.meta.url), '..')`,
      ``,
      `function toSlug(name) {`,
      `  return name`,
      `    .replace(/([A-Z])/g, (m) => '-' + m.toLowerCase())`,
      `    .replace(/[^a-z0-9-]/g, '-')`,
      `    .replace(/-+/g, '-')`,
      `    .replace(/^-+|-+$/, '')`,
      `}`,
      ``,
      `// Normalize floating-point numbers to 10 decimal places so tests are stable`,
      `// across Node.js versions that differ in float-to-string serialization.`,
      `function normalizeFloats(html) {`,
      `  return html.replace(/(\\d+\\.\\d+)/g, (_, n) =>`,
      `    parseFloat(n).toFixed(10).replace(/\\.?0+$/, '')`,
      `  )`,
      `}`,
      ``,
      `describe('snapshots', () => {`,
      `  for (const [name, fn] of Object.entries(examples)) {`,
      `    it(name, () => {`,
      `      const node = fn()`,
      `      const expected = readFileSync(join(__dirname, \`output/\${toSlug(name)}.html\`), 'utf-8')`,
      `      expect(normalizeFloats(node.innerHTML)).toBe(normalizeFloats(expected))`,
      `    })`,
      `  }`,
      `})`,
      ``,
    ].join('\n'),
  })

  files.push({
    path: 'vitest.config.js',
    content: [
      `import { defineConfig } from 'vitest/config'`,
      ``,
      `export default defineConfig({`,
      `  test: {`,
      `    environment: 'jsdom',`,
      `  },`,
      `})`,
      ``,
    ].join('\n'),
  })

  return files
}
