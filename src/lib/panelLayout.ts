export interface SavedPanelLayout {
  sourceCollapsed?: boolean
  sourceSize?: number      // % when expanded
  examplesSize?: number    // %
  previewSize?: number     // %
  consoleOpen?: boolean
  consoleSize?: number     // % of preview-area height
}

function storageKey(projectPath: string) {
  return `recho-specs:panel-layout:${projectPath}`
}

export function readPanelLayout(projectPath: string): SavedPanelLayout {
  try {
    const raw = localStorage.getItem(storageKey(projectPath))
    return raw ? (JSON.parse(raw) as SavedPanelLayout) : {}
  } catch {
    return {}
  }
}

export function savePanelLayout(projectPath: string, update: SavedPanelLayout) {
  try {
    const existing = readPanelLayout(projectPath)
    localStorage.setItem(storageKey(projectPath), JSON.stringify({ ...existing, ...update }))
  } catch {}
}
