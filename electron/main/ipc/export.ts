import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import type { ExportRequestBody, ExportResult, ExportMeta } from '@/types'
import { readApiKey } from './keystore'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

// Detect UMD namespace from example imports, fall back to camelCase of name
function detectNamespace(examples: { name: string; code: string }[], packageName: string): string {
  for (const ex of examples) {
    const ns = ex.code.match(/import\s*\*\s*as\s+(\w+)\s+from/)
    if (ns) return ns[1]
    const def = ex.code.match(/import\s+(\w+)\s+from/)
    if (def) return def[1]
  }
  return packageName.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
}

function buildPackageJson(meta: ExportMeta): object {
  const pkg: Record<string, unknown> = {
    name: meta.name,
    version: '1.0.0',
    description: meta.description ?? '',
    main: `dist/${meta.name}.umd.js`,
    module: `dist/${meta.name}.esm.js`,
    exports: {
      '.': {
        import: `./dist/${meta.name}.esm.js`,
        require: `./dist/${meta.name}.umd.js`,
      },
    },
    files: ['dist', 'src'],
    scripts: {
      build: 'rspack build',
      prepublishOnly: 'npm run build',
    },
    license: meta.license || 'MIT',
    devDependencies: {
      '@rspack/cli': '^1.3.0',
      '@rspack/core': '^1.3.0',
    },
  }
  if (meta.author) pkg.author = meta.author
  if (meta.github) {
    pkg.repository = { type: 'git', url: `git+${meta.github}.git` }
    pkg.bugs = { url: `${meta.github}/issues` }
    pkg.homepage = `${meta.github}#readme`
  }
  return pkg
}

function buildRspackConfig(name: string, namespace: string): string {
  return `const path = require('path')

module.exports = [
  {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '${name}.umd.js',
      library: { name: '${namespace}', type: 'umd' },
      globalObject: 'this',
    },
    mode: 'production',
  },
  {
    entry: './src/index.js',
    experiments: { outputModule: true },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '${name}.esm.js',
      library: { type: 'module' },
    },
    mode: 'production',
  },
]
`
}

function buildFallbackReadme(meta: ExportMeta): string {
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

async function generateReadme(
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

ipcMain.handle('project:export', async (_e, body: ExportRequestBody): Promise<ExportResult> => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Choose Export Location',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || !result.filePaths[0]) return { ok: false, error: 'Cancelled' }

  const packageDir = join(result.filePaths[0], body.meta.name)

  try {
    const exists = await fs.stat(packageDir).then(() => true).catch(() => false)
    if (exists) {
      const entries = await fs.readdir(packageDir)
      await Promise.all(
        entries
          .filter((e) => e !== '.git')
          .map((e) => fs.rm(join(packageDir, e), { recursive: true, force: true }))
      )
    } else {
      await fs.mkdir(packageDir, { recursive: true })
    }
  } catch (err) {
    return { ok: false, error: String(err) }
  }

  try {
    const namespace = detectNamespace(body.examples, body.meta.name)

    await fs.mkdir(join(packageDir, 'src'), { recursive: true })
    await fs.writeFile(join(packageDir, 'src', 'index.js'), body.libraryCode, 'utf-8')

    await fs.writeFile(
      join(packageDir, 'package.json'),
      JSON.stringify(buildPackageJson(body.meta), null, 2),
      'utf-8'
    )

    await fs.writeFile(
      join(packageDir, 'rspack.config.js'),
      buildRspackConfig(body.meta.name, namespace),
      'utf-8'
    )

    const readme = await generateReadme(body.meta, body.examples)
    await fs.writeFile(join(packageDir, 'README.md'), readme, 'utf-8')

    return { ok: true, exportPath: packageDir }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('shell:open-path', async (_e, path: string): Promise<void> => {
  await shell.openPath(path)
})
