import { lazy, Suspense, useState } from 'react'

const MonacoDiffEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.DiffEditor }))
)

interface Props {
  exampleName: string
  snapshotHtml: string
  currentHtml: string
  onClose: () => void
  onFix: () => void
  onUpdateSnapshot: () => void
}

type View = 'visual' | 'diff'

function formatHtml(html: string): string {
  let result = ''
  let depth = 0
  const indent = '  '
  const VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i

  const normalized = html.replace(/>\s+</g, '><').trim()
  const parts = normalized.split(/(?=<)|(?<=>)/)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('</')) {
      depth = Math.max(0, depth - 1)
      result += indent.repeat(depth) + trimmed + '\n'
    } else if (trimmed.startsWith('<') && !trimmed.startsWith('<!--')) {
      result += indent.repeat(depth) + trimmed + '\n'
      const tagMatch = trimmed.match(/^<([a-zA-Z][a-zA-Z0-9]*)/)
      const tag = tagMatch?.[1] ?? ''
      const selfClosing = trimmed.endsWith('/>') || VOID.test(tag)
      if (!selfClosing) depth++
    } else {
      result += indent.repeat(depth) + trimmed + '\n'
    }
  }

  return result.trim()
}

function SegmentedControl({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div style={{
      display: 'flex',
      border: '1px solid #CCC8C0',
      borderRadius: 6,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {(['visual', 'diff'] as View[]).map((v, i) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            padding: '4px 11px',
            fontSize: 11.5,
            fontWeight: 600,
            border: 'none',
            borderLeft: i > 0 ? '1px solid #CCC8C0' : 'none',
            background: view === v ? '#5B47D0' : '#FAF9F7',
            color: view === v ? '#fff' : '#6E6A62',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.1s, color 0.1s',
          }}
        >
          {v === 'visual' ? 'Visual' : 'Diff'}
        </button>
      ))}
    </div>
  )
}

function HtmlPane({ label, html }: { label: string; html: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '5px 12px',
        fontSize: 11,
        fontWeight: 600,
        color: '#8A8780',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: '#F5F4F2',
        borderBottom: '1px solid #E8E5DF',
        flexShrink: 0,
      }}>
        {label}
      </div>
      <div
        style={{ flex: 1, overflow: 'auto', background: '#fff', padding: 16 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function ActionButton({ onClick, children }: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 28, padding: '0 14px', borderRadius: 6,
        border: '1px solid #CCC8C0',
        background: '#FAF9F7',
        color: '#3A3834',
        fontSize: 11.5, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#EBE8E2'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#FAF9F7'
      }}
    >
      {children}
    </button>
  )
}

export default function SnapshotModal({
  exampleName,
  snapshotHtml,
  currentHtml,
  onClose,
  onFix,
  onUpdateSnapshot,
}: Props) {
  const [view, setView] = useState<View>('visual')

  const formattedSnapshot = formatHtml(snapshotHtml)
  const formattedCurrent = formatHtml(currentHtml)

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
          width: '85vw', height: '80vh',
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
        {/* Header */}
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid #E8E5DF',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#3A3834',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Snapshot Diff
          </span>
          <span style={{ fontSize: 12, color: '#8A8780', flex: 1 }}>
            {exampleName}
          </span>
          <SegmentedControl view={view} onChange={setView} />
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

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          {view === 'visual' ? (
            <>
              <HtmlPane label="Baseline" html={snapshotHtml} />
              <div style={{ width: 1, background: '#E8E5DF', flexShrink: 0 }} />
              <HtmlPane label="Current" html={currentHtml} />
            </>
          ) : (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '5px 12px',
                fontSize: 11, fontWeight: 600, color: '#8A8780',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                background: '#F5F4F2', borderBottom: '1px solid #E8E5DF',
                flexShrink: 0,
              }}>
                HTML Diff
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <Suspense fallback={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ACA89F', fontSize: 13 }}>
                    Loading…
                  </div>
                }>
                  <MonacoDiffEditor
                    original={formattedSnapshot}
                    modified={formattedCurrent}
                    language="html"
                    theme="light"
                    options={{
                      renderSideBySide: true,
                      readOnly: true,
                      fontSize: 12,
                      lineHeight: 20,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      folding: false,
                      renderOverviewRuler: false,
                      overviewRulerLanes: 0,
                      hideCursorInOverviewRuler: true,
                      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                      padding: { top: 12, bottom: 12 },
                      fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
                    }}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid #E8E5DF',
          background: '#F5F4F2',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 8, flexShrink: 0,
        }}>
          <ActionButton onClick={onUpdateSnapshot}>Update Snapshot</ActionButton>
          <ActionButton onClick={onFix}>Fix</ActionButton>
        </div>
      </div>
    </div>
  )
}
