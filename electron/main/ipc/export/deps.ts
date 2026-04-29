import { net } from 'electron'

export function detectDependencies(code: string): string[] {
  const pkgs = new Set<string>()

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
    pkgs.add(pkg)
  }

  const esm = /\bimport\b[^'"]*['"]([^'"]+)['"]/g
  const cjs = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  let m
  while ((m = esm.exec(code)) !== null) addSpecifier(m[1])
  while ((m = cjs.exec(code)) !== null) addSpecifier(m[1])
  return [...pkgs]
}

export async function resolveDependencyVersions(packages: string[]): Promise<Record<string, string>> {
  if (packages.length === 0) return {}
  const entries = await Promise.all(
    packages.map(async (pkg): Promise<[string, string]> => {
      try {
        const res = await net.fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`)
        if (res.ok) {
          const data = await res.json() as { version?: string }
          if (data.version) return [pkg, `^${data.version}`]
        }
      } catch {}
      return [pkg, '*']
    })
  )
  return Object.fromEntries(entries)
}
