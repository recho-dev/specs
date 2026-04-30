import { useState } from 'react'
import { Sparkles } from 'lucide-react'

export type AIPanelMode = 'api-key' | null
export interface ApiKeyStatus { ok: boolean; text: string }

interface Props {
  mode: AIPanelMode
  apiKeyStatus?: ApiKeyStatus | null
  isSaving?: boolean
  onSaveApiKey: (key: string) => void
}

export default function AIPanel({ mode, apiKeyStatus, isSaving = false, onSaveApiKey }: Props) {
  const [key, setKey] = useState('')

  if (mode !== 'api-key') return null

  function handleSubmit() {
    const trimmed = key.trim()
    if (!trimmed || isSaving) return
    onSaveApiKey(trimmed)
  }

  return (
    <div
      style={{
        borderTop: '1px solid #DDD9D2',
        background: '#FDFCFA',
        flexShrink: 0,
      }}
    >
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={16} color="#5B47D0" />
          <span className="text-[12px] font-semibold" style={{ color: '#5B47D0', letterSpacing: '0.03em' }}>
            API Key Required
          </span>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: '#6E6A62' }}>
          Recho Form uses Claude to generate and refine your library. Enter your{' '}
          <a
            href="https://platform.claude.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#5B47D0', textDecoration: 'underline' }}
          >
            Anthropic API key
          </a>{' '}
          below to get started. It will be stored safely in your system keychain.
        </p>
        <div className="flex gap-2 mt-3">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="sk-ant-…"
            autoFocus
            className="flex-1 min-w-0 outline-none"
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
          <button
            onClick={handleSubmit}
            disabled={!key.trim() || isSaving}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 6,
              border: 'none',
              background: (!key.trim() || isSaving) ? '#8A7FD0' : '#5B47D0',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: (!key.trim() || isSaving) ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {isSaving ? 'Validating…' : 'Save'}
          </button>
        </div>
        {apiKeyStatus && !apiKeyStatus.ok && (
          <p className="text-[12px] mt-2" style={{ color: '#C0392B' }}>
            {apiKeyStatus.text}
          </p>
        )}
      </div>
    </div>
  )
}
