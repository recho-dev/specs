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

// Scan library code for third-party import/require specifiers
function detectDependencies(code: string): Record<string, string> {
  const deps: Record<string, string> = {}

  function addSpecifier(specifier: string) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) return
    let pkg: string
    if (specifier.startsWith('@')) {
      const parts = specifier.split('/')
      if (parts.length < 2) return
      pkg = `${parts[0]}/${parts[1]}`
    } else {
      pkg = specifier.split('/')[0]
    }
    if (!deps[pkg]) deps[pkg] = '*'
  }

  const esm = /\bimport\b[^'"]*['"]([^'"]+)['"]/g
  const cjs = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  let m
  while ((m = esm.exec(code)) !== null) addSpecifier(m[1])
  while ((m = cjs.exec(code)) !== null) addSpecifier(m[1])
  return deps
}

function buildGitignore(): string {
  return `node_modules/\ndist/\n`
}

function buildLicenseFile(meta: ExportMeta): string | null {
  const normalized = (meta.license || '').trim().toUpperCase()
  if (!normalized || normalized === 'UNLICENSED') return null

  const year = new Date().getFullYear()
  const author = meta.author ?? ''
  const copyright = `Copyright (c) ${year}${author ? ` ${author}` : ''}`

  if (normalized === 'MIT') {
    return `MIT License\n\n${copyright}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`
  }

  if (normalized === 'ISC') {
    return `ISC License\n\n${copyright}\n\nPermission to use, copy, modify, and/or distribute this software for any\npurpose with or without fee is hereby granted, provided that the above\ncopyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH\nREGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY\nAND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,\nINDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM\nLOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR\nOTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR\nPERFORMANCE OF THIS SOFTWARE.\n`
  }

  if (normalized === 'APACHE-2.0' || normalized === 'APACHE 2.0') {
    return `Apache License 2.0\n\n${copyright}\n\nLicensed under the Apache License, Version 2.0 (the "License");\nyou may not use this file except in compliance with the License.\nYou may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software\ndistributed under the License is distributed on an "AS IS" BASIS,\nWITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\nSee the License for the specific language governing permissions and\nlimitations under the License.\n`
  }

  if (normalized === 'BSD-2-CLAUSE') {
    return `BSD 2-Clause License\n\n${copyright}\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n1. Redistributions of source code must retain the above copyright notice, this\n   list of conditions and the following disclaimer.\n\n2. Redistributions in binary form must reproduce the above copyright notice,\n   this list of conditions and the following disclaimer in the documentation\n   and/or other materials provided with the distribution.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"\nAND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\nIMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\nDISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE\nFOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\nDAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\nSERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\nCAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\nOR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n`
  }

  // Generic fallback for unrecognized SPDX identifiers
  return `${meta.license} License\n\n${copyright}\n`
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

function buildPackageJson(meta: ExportMeta, dependencies: Record<string, string>): object {
  const pkg: Record<string, unknown> = {
    name: meta.name,
    version: meta.version || '1.0.0',
    description: meta.description ?? '',
    main: 'src/index.js',
    module: 'src/index.js',
    jsdelivr: `dist/${meta.name}.umd.min.js`,
    unpkg: `dist/${meta.name}.umd.min.js`,
    files: ['src', 'dist'],
    scripts: {
      build: 'rm -rf dist && rspack build',
      prepublishOnly: 'npm run build',
    },
    license: meta.license || 'MIT',
    devDependencies: {
      '@rspack/cli': '^1.3.0',
      '@rspack/core': '^1.3.0',
    },
  }
  if (Object.keys(dependencies).length > 0) pkg.dependencies = dependencies
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

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '${name}.umd.min.js',
    library: { name: '${namespace}', type: 'umd' },
    globalObject: 'this',
  },
  mode: 'production',
}
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
    const dependencies = detectDependencies(body.libraryCode)

    await fs.mkdir(join(packageDir, 'src'), { recursive: true })
    await fs.writeFile(join(packageDir, 'src', 'index.js'), body.libraryCode, 'utf-8')

    await fs.writeFile(
      join(packageDir, 'package.json'),
      JSON.stringify(buildPackageJson(body.meta, dependencies), null, 2),
      'utf-8'
    )

    await fs.writeFile(
      join(packageDir, 'rspack.config.js'),
      buildRspackConfig(body.meta.name, namespace),
      'utf-8'
    )

    await fs.writeFile(join(packageDir, '.gitignore'), buildGitignore(), 'utf-8')

    const licenseText = buildLicenseFile(body.meta)
    if (licenseText) await fs.writeFile(join(packageDir, 'LICENSE'), licenseText, 'utf-8')

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
