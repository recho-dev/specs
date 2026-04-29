import { useState } from 'react'
import { useWorkbenchStore } from '@/store/useWorkbenchStore'
import type { FileDiff, Version } from '@/types'
import DiffPanel from './DiffPanel'

function formatAge(timestamp: number): string {
  const s = Math.floor((Date.now() - timestamp) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const displayName = (name: string) => /\.\w+$/.test(name) ? name : `${name}.js`

function versionToFileDiffs(selected: Version, prev: Version | null): FileDiff[] {
  const files: FileDiff[] = []

  if (!prev || prev.libraryCode !== selected.libraryCode) {
    files.push({
      name: 'library.js',
      kind: prev ? 'modified' : 'added',
      before: prev?.libraryCode ?? '',
      after: selected.libraryCode,
    })
  }

  const selMap = new Map(selected.examples.map((e) => [e.id, e]))
  const prevMap = prev ? new Map(prev.examples.map((e) => [e.id, e])) : new Map()

  for (const sel of selected.examples) {
    const prv = prevMap.get(sel.id)
    if (!prv) {
      files.push({ name: displayName(sel.name), kind: 'added', before: '', after: sel.code })
    } else if (prv.code !== sel.code || prv.name !== sel.name) {
      files.push({ name: displayName(sel.name), kind: 'modified', before: prv.code, after: sel.code })
    }
  }

  if (prev) {
    for (const prv of prev.examples) {
      if (!selMap.has(prv.id)) {
        files.push({ name: displayName(prv.name), kind: 'removed', before: prv.code, after: '' })
      }
    }
  }

  return files
}

export default function VersionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const versions = useWorkbenchStore((s) => s.versions)
  const activeVersionId = useWorkbenchStore((s) => s.activeVersionId)
  const restoreVersion = useWorkbenchStore((s) => s.restoreVersion)
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!open) return null

  const effectiveId = selectedId ?? versions[0]?.id ?? null
  const selected = versions.find((v) => v.id === effectiveId) ?? null
  const selectedIndex = selected ? versions.indexOf(selected) : -1
  // versions are newest-first; predecessor is one index higher
  const prev = selectedIndex >= 0 && selectedIndex < versions.length - 1 ? versions[selectedIndex + 1] : null

  const files = selected ? versionToFileDiffs(selected, prev) : []
  const isCurrent = selected?.id === activeVersionId

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(30,28,26,0.45)',
        backdropFilter: 'blur(2px)',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div
        style={{
          width: '80vw', height: '75vh',
          maxWidth: 'calc(100% - 24px)',
          background: '#FDFCFA',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          overflow: 'hidden',
          animation: 'slideUp 0.18s cubic-bezier(.22,.68,0,1.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid #E8E5DF',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#3A3834',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Version History
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11.5, color: '#8A8780' }}>{versions.length} versions</span>
            <button
              onClick={onClose}
              style={{
                width: 22, height: 22, border: 'none', background: 'none',
                cursor: 'pointer', color: '#ACA89F', borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, fontSize: 16, lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#EBE8E2'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#3A3834'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#ACA89F'
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left sidebar */}
          <div style={{
            width: 240, flexShrink: 0,
            borderRight: '1px solid #E8E5DF',
            overflowY: 'auto',
          }}>
            {versions.map((v) => {
              const isActive = v.id === activeVersionId
              const isSelected = v.id === effectiveId
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 16px',
                    borderBottom: '1px solid #E8E5DF',
                    background: isSelected ? '#ECEAF9' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'block',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#F5F4F2'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'none'
                  }}
                >
                  <p style={{
                    fontSize: 13,
                    fontWeight: isSelected ? 500 : 400,
                    color: isSelected ? '#3D2FA8' : '#1A1816',
                    margin: 0, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {v.description || 'Summarizing…'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, color: '#8A8780' }}>{formatAge(v.timestamp)}</span>
                    {isActive && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: '#5B47D0',
                        background: '#ECEAF9', borderRadius: 3, padding: '1px 5px',
                      }}>
                        current
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right panel */}
          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              {/* Version header */}
              <div style={{
                padding: '12px 18px',
                borderBottom: '1px solid #E8E5DF',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                flexShrink: 0,
              }}>
                <p style={{ fontSize: 13, color: '#1A1816', lineHeight: 1.5, margin: 0, flex: 1 }}>
                  {selected.description || 'Summarizing…'}
                </p>
                {isCurrent ? (
                  <span style={{
                    flexShrink: 0,
                    height: 28, padding: '0 12px', borderRadius: 6,
                    border: '1px solid #CCC8C0',
                    background: '#ECEAF9',
                    color: '#5B47D0',
                    fontSize: 11.5, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center',
                  }}>
                    Current
                  </span>
                ) : (
                  <button
                    onClick={() => { restoreVersion(selected.id); onClose() }}
                    disabled={isGenerating}
                    style={{
                      flexShrink: 0,
                      height: 28, padding: '0 12px', borderRadius: 6,
                      border: '1px solid #CCC8C0',
                      background: isGenerating ? '#F0EEE9' : '#FAF9F7',
                      color: isGenerating ? '#C0BAB0' : '#3A3834',
                      fontSize: 11.5, fontWeight: 500,
                      cursor: isGenerating ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      if (!isGenerating) (e.currentTarget as HTMLButtonElement).style.background = '#EBE8E2'
                    }}
                    onMouseLeave={(e) => {
                      if (!isGenerating) (e.currentTarget as HTMLButtonElement).style.background = '#FAF9F7'
                    }}
                  >
                    Restore
                  </button>
                )}
              </div>

              {/* Diff panel — key resets tab state when version changes */}
              <DiffPanel key={effectiveId ?? ''} files={files} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#ACA89F', fontSize: 13 }}>
              No versions yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
