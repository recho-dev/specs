import type { ExportMeta } from '@/types'

export function buildGitignore(): string {
  return `node_modules/\ndist/\n`
}

export function buildLicenseFile(meta: ExportMeta): string | null {
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

  return `${meta.license} License\n\n${copyright}\n`
}

export function detectNamespace(examples: { name: string; code: string }[], packageName: string): string {
  for (const ex of examples) {
    const ns = ex.code.match(/import\s*\*\s*as\s+(\w+)\s+from/)
    if (ns) return ns[1]
    const def = ex.code.match(/import\s+(\w+)\s+from/)
    if (def) return def[1]
  }
  return packageName.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
}

export function buildPackageJson(
  meta: ExportMeta,
  dependencies: Record<string, string>,
  hasTests = false,
): object {
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
      ...(hasTests ? { test: 'vitest run' } : {}),
      prepublishOnly: hasTests ? 'npm test && npm run build' : 'npm run build',
    },
    license: meta.license || 'MIT',
    devDependencies: {
      '@rspack/cli': '^1.3.0',
      '@rspack/core': '^1.3.0',
      ...(hasTests ? { vitest: '^3.0.0', jsdom: '^26.0.0' } : {}),
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

export function buildRspackConfig(name: string, namespace: string): string {
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
