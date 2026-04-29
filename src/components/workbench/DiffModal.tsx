import { useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { X } from 'lucide-react'
import type { FileDiff } from '@/types'

interface Props {
  diffs: FileDiff[]
  onClose: () => void
}

export default function DiffModal({ diffs, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = diffs[activeIndex]

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
          width: 860,
          maxWidth: 'calc(100% - 24px)',
          height: '80vh',
          background: '#FDFCFA',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.18s cubic-bezier(.22,.68,0,1.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid #E8E5DF',
          display: 'flex', alignItems: 'flex-start', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1A1816', lineHeight: 1.3 }}>
              Changes
            </div>
            <div style={{ fontSize: 11.5, color: '#8A8780', marginTop: 2 }}>
              {diffs.length} {diffs.length === 1 ? 'file' : 'files'} changed
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 22, height: 22, border: 'none', background: 'none',
              cursor: 'pointer', color: '#ACA89F', borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: 0,
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
            <X size={13} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid #E8E5DF',
          background: '#F5F4F2',
          overflowX: 'auto',
          flexShrink: 0,
        }}>
          {diffs.map((diff, i) => {
            const badge = diff.kind === 'added'
              ? { label: 'A', color: '#1E8847', bg: '#E2F5EB' }
              : diff.kind === 'removed'
              ? { label: 'D', color: '#C0392B', bg: '#FDECEA' }
              : { label: 'M', color: '#7C5C00', bg: '#FFF8E1' }
            return (
              <button
                key={diff.name + i}
                onClick={() => setActiveIndex(i)}
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: i === activeIndex ? 600 : 400,
                  color: i === activeIndex ? '#5B47D0' : '#6E6A62',
                  background: 'none',
                  border: 'none',
                  borderBottom: i === activeIndex ? '2px solid #5B47D0' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.12s',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  if (i !== activeIndex)
                    (e.currentTarget as HTMLButtonElement).style.color = '#3A3834'
                }}
                onMouseLeave={(e) => {
                  if (i !== activeIndex)
                    (e.currentTarget as HTMLButtonElement).style.color = '#6E6A62'
                }}
              >
                {diff.name}
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: badge.color,
                  background: badge.bg,
                  borderRadius: 3,
                  padding: '1px 4px',
                  lineHeight: 1.4,
                  letterSpacing: '0.02em',
                }}>
                  {badge.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Diff editor */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <DiffEditor
            key={activeIndex}
            original={active.before}
            modified={active.after}
            language="javascript"
            theme="light"
            options={{
              renderSideBySide: false,
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
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid #E8E5DF',
          background: '#F5F4F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
          flexShrink: 0,
        }}>
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            style={{
              height: 28, padding: '0 12px', borderRadius: 6,
              border: '1px solid #CCC8C0',
              background: activeIndex === 0 ? '#F0EEE9' : '#FAF9F7',
              color: activeIndex === 0 ? '#C0BAB0' : '#3A3834',
              fontSize: 11.5, fontWeight: 500,
              cursor: activeIndex === 0 ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (activeIndex !== 0)
                (e.currentTarget as HTMLButtonElement).style.background = '#EBE8E2'
            }}
            onMouseLeave={(e) => {
              if (activeIndex !== 0)
                (e.currentTarget as HTMLButtonElement).style.background = '#FAF9F7'
            }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setActiveIndex((i) => Math.min(diffs.length - 1, i + 1))}
            disabled={activeIndex === diffs.length - 1}
            style={{
              height: 28, padding: '0 12px', borderRadius: 6,
              border: '1px solid #CCC8C0',
              background: activeIndex === diffs.length - 1 ? '#F0EEE9' : '#FAF9F7',
              color: activeIndex === diffs.length - 1 ? '#C0BAB0' : '#3A3834',
              fontSize: 11.5, fontWeight: 500,
              cursor: activeIndex === diffs.length - 1 ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (activeIndex !== diffs.length - 1)
                (e.currentTarget as HTMLButtonElement).style.background = '#EBE8E2'
            }}
            onMouseLeave={(e) => {
              if (activeIndex !== diffs.length - 1)
                (e.currentTarget as HTMLButtonElement).style.background = '#FAF9F7'
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
