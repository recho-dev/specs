import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.5C7 1.5 7.5 4.5 9.5 6.5C11.5 8.5 13 8.5 13 8.5C13 8.5 11.5 8.5 9.5 10.5C7.5 12.5 7 13.5 7 13.5C7 13.5 6.5 12.5 4.5 10.5C2.5 8.5 1 8.5 1 8.5C1 8.5 2.5 8.5 4.5 6.5C6.5 4.5 7 1.5 7 1.5Z"
        fill="#5B47D0"
        stroke="#5B47D0"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  )
}

interface SpecQuestionModeProps {
  question: string
  onAnswer: (answer: string) => void
}

function SpecQuestionMode({ question, onAnswer }: SpecQuestionModeProps) {
  const [answer, setAnswer] = useState('')

  function handleSubmit() {
    const trimmed = answer.trim()
    if (!trimmed) return
    setAnswer('')
    onAnswer(trimmed)
  }

  return (
    <>
      <div
        className="text-[13px] leading-relaxed prose prose-sm max-w-none"
        style={{ color: '#3A3834' }}
      >
        <ReactMarkdown>{question}</ReactMarkdown>
      </div>
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="Your answer…"
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
          disabled={!answer.trim()}
          style={{
            height: 32,
            padding: '0 14px',
            borderRadius: 6,
            border: 'none',
            background: !answer.trim() ? '#8A7FD0' : '#5B47D0',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: !answer.trim() ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Answer
        </button>
      </div>
    </>
  )
}

interface MessageModeProps {
  message: string | null
  loading: boolean
}

function MessageMode({ message, loading }: MessageModeProps) {
  if (loading) {
    return (
      <p className="text-[13px]" style={{ color: '#ACA89F' }}>
        Summarizing what was built…
      </p>
    )
  }
  if (!message) return null
  return (
    <div
      className="text-[13px] leading-relaxed prose prose-sm max-w-none"
      style={{ color: '#3A3834' }}
    >
      <ReactMarkdown>{message}</ReactMarkdown>
    </div>
  )
}

export type AIPanelMode = 'api-key' | 'spec-question' | 'message' | null
export interface ApiKeyStatus { ok: boolean; text: string }

interface Props {
  mode: AIPanelMode
  specQuestion?: string | null
  aiMessage?: string | null
  aiMessageLoading?: boolean
  apiKeyStatus?: ApiKeyStatus | null
  onDismiss: () => void
  onAnswerSpec: (answer: string) => void
}

export default function AIPanel({
  mode,
  specQuestion,
  aiMessage,
  aiMessageLoading = false,
  apiKeyStatus,
  onDismiss,
  onAnswerSpec,
}: Props) {
  if (!mode) return null

  const title =
    mode === 'api-key' ? 'API Key Required' :
    mode === 'spec-question' ? 'Clarifying Question' :
    'What was built'

  const dismissible = mode === 'message'

  return (
    <div
      style={{
        borderTop: '1px solid #DDD9D2',
        background: '#FDFCFA',
        maxHeight: 280,
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <SparkleIcon />
            <span className="text-[12px] font-semibold" style={{ color: '#5B47D0', letterSpacing: '0.03em' }}>
              {title}
            </span>
          </div>
          {dismissible && (
            <button
              onClick={onDismiss}
              style={{
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'none',
                color: '#ACA89F',
                cursor: 'pointer',
                borderRadius: 3,
                padding: 0,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#3A3834' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ACA89F' }}
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {mode === 'api-key' && (
          <>
            <p className="text-[13px] leading-relaxed" style={{ color: '#6E6A62' }}>
              Forma uses Claude to generate and refine your library. Enter your{' '}
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
            {apiKeyStatus && (
              <p
                className="text-[12px] mt-2"
                style={{ color: apiKeyStatus.ok ? '#1E8847' : '#C0392B' }}
              >
                {apiKeyStatus.text}
              </p>
            )}
          </>
        )}
        {mode === 'spec-question' && specQuestion && (
          <SpecQuestionMode question={specQuestion} onAnswer={onAnswerSpec} />
        )}
        {mode === 'message' && (
          <MessageMode message={aiMessage ?? null} loading={aiMessageLoading} />
        )}
      </div>
    </div>
  )
}
