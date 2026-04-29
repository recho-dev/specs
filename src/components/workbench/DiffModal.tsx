import { X } from 'lucide-react'
import type { FileDiff } from '@/types'
import DiffPanel from './DiffPanel'

interface Props {
  diffs: FileDiff[]
  onClose: () => void
}

export default function DiffModal({ diffs, onClose }: Props) {
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

        <DiffPanel files={diffs} />
      </div>
    </div>
  )
}
