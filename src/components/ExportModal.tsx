import { useState } from 'react'
import type { ExportMeta } from '@/types'
import { ArrowRight, Check, Download, Loader2, X } from 'lucide-react'

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
  mono,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <label style={{
        fontSize: 11, fontWeight: 600, color: '#6E6A62',
        letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        {label}
        {required && <span style={{ color: '#C0392B', marginLeft: 2, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="outline-none"
        style={{
          height: 30,
          border: '1px solid #CCC8C0',
          borderRadius: 6,
          background: '#FAF9F7',
          padding: '0 10px',
          fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
          fontSize: mono ? 11.5 : 12,
          color: '#3A3834',
          width: '100%',
          transition: 'border-color 0.15s, box-shadow 0.15s',
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

function SpinnerIcon() { return <Loader2 size={14} className="animate-spin" /> }

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

  const packagePreviewLines = [
    `  "name": "${name || 'my-library'}",`,
    `  "version": "${version || '1.0.0'}",`,
    description ? `  "description": "${description}",` : null,
    author ? `  "author": "${author}",` : null,
    github ? `  "repository": "${github}",` : null,
    `  "license": "${license || 'MIT'}"`,
  ].filter(Boolean)
  const packagePreview = `{\n${packagePreviewLines.join('\n')}\n}`

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
          width: 560,
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
          padding: '16px 18px 12px',
          borderBottom: '1px solid #E8E5DF',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, background: '#EBE9FF', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: '#5B47D0',
          }}>
            <Download size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1A1816', lineHeight: 1.3 }}>Export Package</div>
            <div style={{ fontSize: 11.5, color: '#8A8780', marginTop: 2 }}>Publish your library as an npm package</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 22, height: 22, border: 'none', background: 'none',
              cursor: 'pointer', color: '#ACA89F', borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.1s, color 0.1s', padding: 0,
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

        {status === 'done' ? (
          <>
            <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#E2F5EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: '#1E8847',
              }}>
                <Check size={18} strokeWidth={2.5} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1816', marginBottom: 8 }}>
                  Package exported successfully
                </p>
                <code style={{
                  display: 'inline-block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11.5, color: '#3A3834',
                  background: '#ECEAE6', borderRadius: 5,
                  padding: '4px 8px', wordBreak: 'break-all', lineHeight: 1.5,
                }}>
                  {exportPath}
                </code>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #E8E5DF', margin: '0 18px' }} />
            <div style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 12.5, color: '#6E6A62', margin: 0 }}>
                Run <code style={{ background: '#ECEAE6', padding: '2px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>npm install</code> then{' '}
                <code style={{ background: '#ECEAE6', padding: '2px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>npm run build</code> inside the folder to bundle.
              </p>
            </div>
            <div style={{
              padding: '12px 18px', borderTop: '1px solid #E8E5DF', background: '#F5F4F2',
              display: 'flex', justifyContent: 'flex-end',
            }}>
              <button
                onClick={onClose}
                style={{
                  height: 30, padding: '0 14px', borderRadius: 6,
                  border: '1px solid #CCC8C0', background: '#FAF9F7',
                  color: '#3A3834', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EBE8E2' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FAF9F7' }}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Body */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 2 }}>
                  <Field label="Package name" required mono value={name} onChange={setName} placeholder="my-library" />
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Version" mono value={version} onChange={setVersion} placeholder="1.0.0" />
                </div>
              </div>
              <Field label="Description" value={description} onChange={setDescription} placeholder="A JavaScript library." />
              <div style={{ display: 'flex', gap: 10 }}>
                <Field label="Author" value={author} onChange={setAuthor} placeholder="Your Name" />
                <Field label="License" mono value={license} onChange={setLicense} placeholder="MIT" />
              </div>
              <Field label="GitHub URL" mono value={github} onChange={setGithub} placeholder="https://github.com/user/repo" />

              {/* Live package.json preview */}
              <div style={{
                background: '#F0EEF8', border: '1px solid #DDD9F5',
                borderRadius: 7, padding: '8px 12px',
              }}>
                <div style={{
                  fontSize: 10, color: '#8B7FF0', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5,
                }}>
                  package.json preview
                </div>
                <pre style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10.5, color: '#3A3834', lineHeight: 1.7,
                  margin: 0, whiteSpace: 'pre-wrap',
                }}>{packagePreview}</pre>
              </div>

              {status === 'error' && (
                <p style={{ fontSize: 12, color: '#C0392B', margin: 0 }}>{errorMsg}</p>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid #E8E5DF',
              background: '#F5F4F2',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
            }}>
              <button
                onClick={onClose}
                style={{
                  height: 30, padding: '0 14px', borderRadius: 6,
                  border: '1px solid #CCC8C0', background: '#FAF9F7',
                  color: '#3A3834', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EBE8E2' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FAF9F7' }}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!canExport || status === 'exporting'}
                style={{
                  height: 30, padding: '0 16px', borderRadius: 6, border: 'none',
                  background: (!canExport || status === 'exporting') ? '#8A7FD0' : '#5B47D0',
                  color: '#fff', fontSize: 11.5, fontWeight: 600,
                  cursor: (!canExport || status === 'exporting') ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (canExport && status !== 'exporting')
                    (e.currentTarget as HTMLButtonElement).style.background = '#4C3AB8'
                }}
                onMouseLeave={(e) => {
                  if (canExport && status !== 'exporting')
                    (e.currentTarget as HTMLButtonElement).style.background = '#5B47D0'
                }}
              >
                {status === 'exporting' ? (
                  <><SpinnerIcon /> Exporting…</>
                ) : (
                  <>
                    Next
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
