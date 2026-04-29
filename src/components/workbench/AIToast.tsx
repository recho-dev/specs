import type { ToastState } from '@/store/useWorkbenchStore'

interface Props {
  toastState: ToastState | null
  hasDiff?: boolean
  onDismiss: () => void
  onShowDiff?: () => void
}

export default function AIToast({ toastState, hasDiff, onDismiss, onShowDiff }: Props) {
  if (!toastState) return null

  const { kind, message, step } = toastState

  return (
    <div
      style={{
        flexShrink: 0,
        background: '#FAF9F7',
        borderTop: '1px solid #DDD9D2',
        animation: 'panel-slide-up 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 14px',
          maxHeight: 200,
          overflowY: 'auto',
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            width: 3,
            borderRadius: 2,
            flexShrink: 0,
            alignSelf: 'stretch',
            minHeight: 16,
            background: kind === 'done'
              ? '#28B84A'
              : 'linear-gradient(180deg, #8B7FF0, #C0B8FF)',
            animation: kind === 'thinking' ? 'accent-pulse 1.2s ease-in-out infinite' : 'none',
          }}
        />

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#3A3834', lineHeight: 1.5 }}>
            {message}
          </div>
          {kind === 'done' && hasDiff && (
            <button
              onClick={onShowDiff}
              style={{
                marginTop: 4,
                padding: 0,
                border: 'none',
                background: 'none',
                fontSize: 11.5,
                color: '#5B47D0',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              Show changes
            </button>
          )}
          {kind === 'thinking' && step && (
            <div
              style={{
                fontSize: 11,
                color: '#ACA89F',
                marginTop: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  border: '1.5px solid #8B7FF0',
                  borderTopColor: 'transparent',
                  flexShrink: 0,
                  animation: 'spinner-spin 0.8s linear infinite',
                }}
              />
              {step}
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          style={{
            width: 16,
            height: 16,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#C0BAB0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 3,
            flexShrink: 0,
            padding: 0,
            marginTop: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#8A8780' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#C0BAB0' }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 1l7 7M8 1l-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
