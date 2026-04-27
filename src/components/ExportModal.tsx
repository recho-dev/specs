import { useState } from 'react'
import type { ExportMeta } from '@/types'

interface Props {
  defaultName: string
  initialMeta: ExportMeta | null
  onClose: () => void
  onExport: (meta: ExportMeta) => Promise<{ ok: boolean; exportPath?: string; error?: string }>
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6E6A62', letterSpacing: '0.03em' }}>
        {label}
        {required && <span style={{ color: '#C0392B', marginLeft: 2 }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="outline-none"
        style={{
          height: 32,
          border: '1px solid #CCC8C0',
          borderRadius: 6,
          background: '#FAF9F7',
          padding: '0 10px',
          fontFamily: 'inherit',
          fontSize: '13px',
          color: '#3A3834',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#8B7FF0'
          e.currentTarget.style.boxShadow = '0 0 0 2.5px rgba(139,127,240,0.18)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#CCC8C0'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="22 10" />
    </svg>
  )
}

export default function ExportModal({ defaultName, initialMeta, onClose, onExport }: Props) {
  const [name, setName] = useState(initialMeta?.name ?? defaultName)
  const [version, setVersion] = useState(initialMeta?.version ?? '1.0.0')
  const [description, setDescription] = useState(initialMeta?.description ?? '')
  const [author, setAuthor] = useState(initialMeta?.author ?? '')
  const [github, setGithub] = useState(initialMeta?.github ?? '')
  const [license, setLicense] = useState(initialMeta?.license ?? 'MIT')

  const [status, setStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle')
  const [exportPath, setExportPath] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const canExport = name.trim().length > 0

  async function handleExport() {
    if (!canExport || status === 'exporting') return
    const meta: ExportMeta = {
      name: name.trim(),
      version: version.trim() || '1.0.0',
      description: description.trim() || undefined,
      author: author.trim() || undefined,
      github: github.trim() || undefined,
      license: license.trim() || 'MIT',
    }
    setStatus('exporting')
    const result = await onExport(meta)
    if (result.ok && result.exportPath) {
      setExportPath(result.exportPath)
      setStatus('done')
    } else {
      setErrorMsg(result.error ?? 'Export failed')
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 480,
          maxWidth: 'calc(100% - 24px)',
          background: '#FDFCFA',
          borderRadius: 12,
          border: '1px solid #DDD9D2',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #DDD9D2' }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: '#3A3834' }}>Export Package</span>
          <button
            onClick={onClose}
            style={{
              width: 20, height: 20, display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: 'none', background: 'none',
              color: '#ACA89F', cursor: 'pointer', borderRadius: 3, padding: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#3A3834' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ACA89F' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>

        {status === 'done' ? (
          <div className="px-5 py-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#E2F5EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1E8847" strokeWidth="2">
                  <path d="M2 7l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#3A3834', marginBottom: 4 }}>
                  Package exported successfully
                </p>
                <p
                  className="font-mono"
                  style={{ fontSize: 11, color: '#6E6A62', wordBreak: 'break-all', lineHeight: 1.5 }}
                >
                  {exportPath}
                </p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#8A8780' }}>
              Run <code style={{ background: '#ECEAE6', padding: '1px 5px', borderRadius: 3 }}>npm install</code> then{' '}
              <code style={{ background: '#ECEAE6', padding: '1px 5px', borderRadius: 3 }}>npm run build</code> inside the folder to bundle.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 6,
                  border: '1px solid #CCC8C0', background: '#FAF9F7',
                  color: '#3A3834', fontSize: 13, cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Form */}
            <div className="px-5 py-5 flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <Field label="Package name" required value={name} onChange={setName} placeholder="my-library" />
                </div>
                <div style={{ width: 96 }}>
                  <Field label="Version" value={version} onChange={setVersion} placeholder="1.0.0" />
                </div>
              </div>
              <Field label="Description" value={description} onChange={setDescription} placeholder="A JavaScript library." />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Author" value={author} onChange={setAuthor} placeholder="Your Name" />
                <Field label="License" value={license} onChange={setLicense} placeholder="MIT" />
              </div>
              <Field label="GitHub URL" value={github} onChange={setGithub} placeholder="https://github.com/user/repo" />
            </div>

            {status === 'error' && (
              <p className="px-5 pb-2" style={{ fontSize: 12, color: '#C0392B' }}>{errorMsg}</p>
            )}

            {/* Footer */}
            <div
              className="flex items-center justify-end px-5 py-4"
              style={{ borderTop: '1px solid #DDD9D2', background: '#F5F4F2' }}
            >
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  style={{
                    height: 32, padding: '0 14px', borderRadius: 6,
                    border: '1px solid #CCC8C0', background: '#FAF9F7',
                    color: '#3A3834', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={!canExport || status === 'exporting'}
                  style={{
                    height: 32, padding: '0 16px', borderRadius: 6, border: 'none',
                    background: (!canExport || status === 'exporting') ? '#8A7FD0' : '#5B47D0',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: (!canExport || status === 'exporting') ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {status === 'exporting' && <SpinnerIcon />}
                  {status === 'exporting' ? 'Exporting…' : 'Next'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
