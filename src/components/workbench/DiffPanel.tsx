import { lazy, Suspense, useState } from 'react'
import type { FileDiff } from '@/types'

const MonacoDiffEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.DiffEditor }))
)

const BADGE: Record<FileDiff['kind'], { label: string; color: string; bg: string }> = {
  added:    { label: 'A', color: '#1E8847', bg: '#E2F5EB' },
  removed:  { label: 'D', color: '#C0392B', bg: '#FDECEA' },
  modified: { label: 'M', color: '#7C5C00', bg: '#FFF8E1' },
}

function NavButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 28, padding: '0 12px', borderRadius: 6,
        border: '1px solid #CCC8C0',
        background: disabled ? '#F0EEE9' : '#FAF9F7',
        color: disabled ? '#C0BAB0' : '#3A3834',
        fontSize: 11.5, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#EBE8E2'
      }}
      onMouseLeave={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#FAF9F7'
      }}
    >
      {label}
    </button>
  )
}

interface Props {
  files: FileDiff[]
}

export default function DiffPanel({ files }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const idx = Math.min(activeIndex, Math.max(0, files.length - 1))
  const active = files[idx]

  if (files.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#ACA89F', fontSize: 13 }}>
        No changes
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #E8E5DF',
        background: '#F5F4F2',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {files.map((f, i) => {
          const badge = BADGE[f.kind]
          const isActive = i === idx
          return (
            <button
              key={f.name + i}
              onClick={() => setActiveIndex(i)}
              style={{
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#5B47D0' : '#6E6A62',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #5B47D0' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.12s',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#3A3834'
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#6E6A62'
              }}
            >
              {f.name}
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: badge.color, background: badge.bg,
                borderRadius: 3, padding: '1px 4px',
                lineHeight: 1.4, letterSpacing: '0.02em',
              }}>
                {badge.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Diff editor */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ACA89F', fontSize: 13 }}>
            Loading…
          </div>
        }>
          <MonacoDiffEditor
            key={idx}
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
        </Suspense>
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
        <NavButton
          label="← Prev"
          disabled={idx === 0}
          onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
        />
        <NavButton
          label="Next →"
          disabled={idx === files.length - 1}
          onClick={() => setActiveIndex((i) => Math.min(files.length - 1, i + 1))}
        />
      </div>
    </div>
  )
}
