import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { ExportRequestBody, ExportResult, ExportMeta, PreviewFile, PreviewSyncRequest, GenerateReadmeRequest, GenerateTestFilesRequest } from '@/types'
import { detectDependencies, resolveDependencyVersions } from './deps'
import { buildGitignore, buildLicenseFile, detectNamespace, buildPackageJson, buildRspackConfig } from './npm-package'
import { generateReadme } from './readme'
import { getTestFilePaths, buildTestFiles } from './test'
import { buildDocsFiles, toSlug } from './website'

async function writeThumbnails(
  packageDir: string,
  examples: { name: string; thumbnailDataUrl?: string }[],
): Promise<void> {
  for (const ex of examples) {
    if (!ex.thumbnailDataUrl) continue
    const base64 = ex.thumbnailDataUrl.replace(/^data:image\/\w+;base64,/, '')
    const dest = join(packageDir, 'docs', 'static', toSlug(ex.name) + '.png')
    await fs.mkdir(join(dest, '..'), { recursive: true })
    await fs.writeFile(dest, Buffer.from(base64, 'base64'))
  }
}

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

ipcMain.handle('project:preview-sync', async (_e, body: PreviewSyncRequest): Promise<PreviewFile[]> => {
  const namespace = detectNamespace(body.examples, body.meta.name)
  const dependencies = await resolveDependencyVersions(detectDependencies(body.libraryCode))
  const hasTests = getTestFilePaths(body.examples).length > 0
  const hasDocs = body.examples.length > 0

  const files: PreviewFile[] = [
    { path: 'src/index.js', content: body.libraryCode },
    { path: 'package.json', content: JSON.stringify(buildPackageJson(body.meta, dependencies, hasTests, hasDocs), null, 2) },
    { path: 'rspack.config.js', content: buildRspackConfig(body.meta.name, namespace) },
    { path: '.gitignore', content: buildGitignore() },
    ...buildDocsFiles(body.meta, body.examples, namespace),
  ]

  const license = buildLicenseFile(body.meta)
  if (license) files.push({ path: 'LICENSE', content: license })

  return files
})

ipcMain.handle('project:generate-test-files', async (_e, body: GenerateTestFilesRequest): Promise<PreviewFile[]> => {
  return buildTestFiles(body.examples, body.packageName)
})

ipcMain.handle('project:generate-readme', async (_e, body: GenerateReadmeRequest): Promise<string> => {
  return generateReadme(body.meta, body.examples)
})

ipcMain.handle('project:export', async (_e, body: ExportRequestBody): Promise<ExportResult> => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Choose Export Location',
    buttonLabel: 'Export',
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
          .filter((e) => !['node_modules', 'dist', '.git', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(e))
          .map((e) => fs.rm(join(packageDir, e), { recursive: true, force: true }))
      )
    } else {
      await fs.mkdir(packageDir, { recursive: true })
    }
  } catch (err) {
    return { ok: false, error: String(err) }
  }

  try {
    if (body.previewFiles && body.previewFiles.length > 0) {
      // Reuse already-generated preview content — no redundant npm/AI calls
      for (const file of body.previewFiles) {
        const dest = join(packageDir, file.path)
        await fs.mkdir(join(dest, '..'), { recursive: true })
        await fs.writeFile(dest, file.content, 'utf-8')
      }
      await writeThumbnails(packageDir, body.examples)
    } else {
      const namespace = detectNamespace(body.examples, body.meta.name)
      const [dependencies, testFiles] = await Promise.all([
        resolveDependencyVersions(detectDependencies(body.libraryCode)),
        buildTestFiles(body.examples, body.meta.name),
      ])
      const hasTests = testFiles.length > 0
      const hasDocs = body.examples.length > 0

      const allFiles: PreviewFile[] = [
        { path: 'src/index.js', content: body.libraryCode },
        { path: 'package.json', content: JSON.stringify(buildPackageJson(body.meta, dependencies, hasTests, hasDocs), null, 2) },
        { path: 'rspack.config.js', content: buildRspackConfig(body.meta.name, namespace) },
        { path: '.gitignore', content: buildGitignore() },
        ...testFiles,
        ...buildDocsFiles(body.meta, body.examples, namespace),
      ]
      const licenseText = buildLicenseFile(body.meta)
      if (licenseText) allFiles.push({ path: 'LICENSE', content: licenseText })

      for (const file of allFiles) {
        const dest = join(packageDir, file.path)
        await fs.mkdir(join(dest, '..'), { recursive: true })
        await fs.writeFile(dest, file.content, 'utf-8')
      }
      await writeThumbnails(packageDir, body.examples)
    }

    const readme = body.readmeContent ?? await generateReadme(body.meta, body.examples)
    await fs.writeFile(join(packageDir, 'README.md'), readme, 'utf-8')

    return { ok: true, exportPath: packageDir }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('shell:open-path', async (_e, path: string): Promise<void> => {
  await shell.openPath(path)
})
