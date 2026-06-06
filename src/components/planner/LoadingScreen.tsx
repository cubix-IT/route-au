import { useEffect, useState } from 'react'

const MESSAGES = [
  'Finding the best spots nearby…',
  'Checking drive times…',
  'Curating local experiences…',
  'Almost there…',
]

export function LoadingScreen({ destName, heroImageUrl }: { destName: string; heroImageUrl?: string }) {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', flexDirection: 'column',
      background: '#FAFAF9',
      overflow: 'hidden',
    }}>
      {/* Hero image */}
      {heroImageUrl && (
        <div style={{
          height: 220, flexShrink: 0, position: 'relative',
          backgroundImage: `url(${heroImageUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 20, left: 20,
            color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}>{destName}</div>
        </div>
      )}

      {/* Spinner + message */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32,
      }}>
        {/* Material-style linear progress */}
        <div style={{ width: '100%', maxWidth: 280, height: 3, background: 'rgba(58,107,79,0.15)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: '#3A6B4F', borderRadius: 2,
            animation: 'progress-indeterminate 1.6s ease-in-out infinite',
          }} />
        </div>

        <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, textAlign: 'center', minHeight: 20, transition: 'opacity 0.3s' }}>
          {MESSAGES[msgIdx]}
        </div>
      </div>

      <style>{`
        @keyframes progress-indeterminate {
          0%   { width: 0%;   margin-left: 0% }
          50%  { width: 60%;  margin-left: 20% }
          100% { width: 0%;   margin-left: 100% }
        }
      `}</style>
    </div>
  )
}
