import { useEffect, useState } from 'react'
import { GREEN } from '@/lib/brand'

const MESSAGES = [
  'Finding the best spots nearby…',
  'Checking drive times…',
  'Curating local experiences…',
  'Almost there…',
]

export function LoadingScreen({ destName, heroImageUrl }: { destName: string; heroImageUrl?: string }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setMsgIdx((i) => (i + 1) % MESSAGES.length); setFade(true) }, 220)
    }, 2800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', flexDirection: 'column',
      background: '#F8F7F4',
      overflow: 'hidden',
    }}>
      {/* M3 linear indeterminate progress — top of screen */}
      <div style={{ position: 'relative', height: 3, background: `${GREEN}22`, flexShrink: 0, overflow: 'hidden' }}>
        <div className="m3-bar m3-bar-1" style={{ position: 'absolute', top: 0, bottom: 0, background: GREEN, borderRadius: 2 }} />
        <div className="m3-bar m3-bar-2" style={{ position: 'absolute', top: 0, bottom: 0, background: GREEN, borderRadius: 2 }} />
      </div>

      {/* Hero image */}
      {heroImageUrl && (
        <div style={{
          height: 220, flexShrink: 0,
          backgroundImage: `url(${heroImageUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.52) 100%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 20, left: 20, right: 20,
            color: '#fff', fontSize: 24, fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.1,
            textShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}>
            {destName}
          </div>
        </div>
      )}

      {/* No hero — show destination name as text */}
      {!heroImageUrl && (
        <div style={{ padding: '40px 32px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1C1B1F', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {destName}
          </div>
        </div>
      )}

      {/* Status area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 24, padding: '32px 40px',
      }}>
        {/* Dot cluster — M3 activity indicator feel */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`m3-dot m3-dot-${i}`} style={{
              width: 8, height: 8, borderRadius: '50%', background: GREEN, opacity: 0.3,
            }} />
          ))}
        </div>

        {/* Rotating message */}
        <div style={{
          fontSize: 14, color: '#6B7280', fontWeight: 500,
          textAlign: 'center', lineHeight: 1.5,
          opacity: fade ? 1 : 0,
          transition: 'opacity 0.22s ease',
          minHeight: 22,
        }}>
          {MESSAGES[msgIdx]}
        </div>
      </div>

      <style>{`
        /* M3 indeterminate linear progress — two-bar animation */
        @keyframes m3-bar1 {
          0%   { left: -35%;  right: 100% }
          40%  { left: 0%;    right: 30%  }
          66%  { left: 60%;   right: 0%   }
          100% { left: 120%;  right: -10% }
        }
        @keyframes m3-bar2 {
          0%   { left: -200%; right: 100% }
          40%  { left: -15%;  right: 70%  }
          80%  { left: 100%;  right: -5%  }
          100% { left: 120%;  right: -10% }
        }
        .m3-bar-1 { animation: m3-bar1 2s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite; }
        .m3-bar-2 { animation: m3-bar2 2s cubic-bezier(0.165, 0.84, 0.44, 1) infinite; animation-delay: 0.75s; }

        /* Dot pulse */
        @keyframes m3-dot-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        .m3-dot-0 { animation: m3-dot-pulse 1.4s ease-in-out infinite; animation-delay: 0s; }
        .m3-dot-1 { animation: m3-dot-pulse 1.4s ease-in-out infinite; animation-delay: 0.2s; }
        .m3-dot-2 { animation: m3-dot-pulse 1.4s ease-in-out infinite; animation-delay: 0.4s; }
      `}</style>
    </div>
  )
}
