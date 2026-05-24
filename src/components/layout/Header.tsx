import { useAppStore } from '@/store/useAppStore'

function RouteAULogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="8" r="5" fill="#f59e0b" />
      <path
        d="M8 46 L24 8 L40 46"
        stroke="#f59e0b" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity="0.9"
      />
      <path
        d="M24 8 L24 46"
        stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 4"
      />
      <line x1="11" y1="38" x2="37" y2="38" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <line x1="14" y1="28" x2="34" y2="28" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      <line x1="18" y1="18" x2="30" y2="18" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
    </svg>
  )
}

export function Header() {
  const { isOffline, setWizardOpen, userProfile } = useAppStore()

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      zIndex: 10, flexShrink: 0,
    }}>
      {/* Logo + wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <RouteAULogo size={36} />
        <div>
          <div style={{
            fontSize: 18, fontWeight: 800, color: 'var(--text-primary)',
            lineHeight: 1, letterSpacing: '-0.02em',
          }}>
            RouteAU
          </div>
          <div style={{ fontSize: 10, color: 'var(--amber-dim)', lineHeight: 1, marginTop: 2, letterSpacing: '0.04em' }}>
            AUSTRALIA'S ROAD TRIP PLANNER
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Online / offline pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 20,
          background: isOffline ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${isOffline ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.2)'}`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isOffline ? 'var(--red)' : 'var(--green)',
            ...(isOffline ? {} : { animation: 'none' }),
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: isOffline ? 'var(--red)' : 'var(--green)',
          }}>
            {isOffline ? 'Offline' : 'Online'}
          </span>
        </div>

        {/* Edit / start button */}
        <button
          onClick={() => setWizardOpen(true)}
          style={{
            padding: '8px 16px', borderRadius: 10,
            background: userProfile ? 'rgba(245,158,11,0.15)' : 'var(--amber)',
            border: userProfile ? '1px solid var(--amber-dim)' : 'none',
            color: userProfile ? 'var(--amber)' : '#000',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {userProfile ? '⚙ Edit Trip' : 'Plan a Trip →'}
        </button>
      </div>
    </header>
  )
}
