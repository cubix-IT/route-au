import { useAppStore } from '@/store/useAppStore'

// ── Logo mark ─────────────────────────────────────────────────────
// A winding path from an origin dot (green) to a destination
// point (copper) — reads as a spontaneous, unplanned journey.

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
      {/* Origin — city you're leaving */}
      <circle cx="6" cy="29" r="3.5" fill="var(--green)" />
      {/* Winding road — the unplanned route */}
      <path
        d="M 6 29 C 8 20 16 22 18 14 C 20 6 28 8 30 7"
        stroke="var(--green)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Destination — somewhere new */}
      <circle cx="30" cy="7" r="3" fill="var(--warm)" />
      <circle cx="30" cy="7" r="1.2" fill="white" />
    </svg>
  )
}

export function Header() {
  const { isOffline, setWizardOpen, activeItinerary, clearItinerary, userProfile } = useAppStore()

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      zIndex: 10, flexShrink: 0,
    }}>
      {/* Logo + wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoMark size={36} />
        <div>
          <div style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 17, fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.1, letterSpacing: '-0.01em',
          }}>
            Unplanned<span style={{ color: 'var(--green)' }}> Escapes</span>
          </div>
          <div style={{
            fontSize: 10, color: 'var(--text-muted)',
            lineHeight: 1, marginTop: 2,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Victorian weekend getaways
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Online / offline pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 20,
          background: isOffline ? 'var(--red-light)' : 'var(--green-light)',
          border: `1px solid ${isOffline ? 'rgba(220,38,38,0.2)' : 'rgba(58,107,79,0.2)'}`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isOffline ? 'var(--red)' : 'var(--green)',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: isOffline ? 'var(--red)' : 'var(--green)',
          }}>
            {isOffline ? 'Offline' : 'Online'}
          </span>
        </div>

        {/* Start Over — only shown when an itinerary exists */}
        {activeItinerary && (
          <button
            onClick={() => clearItinerary()}
            style={{
              padding: '7px 14px', borderRadius: 9,
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-subtle)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-muted)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            ← Start Over
          </button>
        )}

        {/* Edit / plan button */}
        <button
          onClick={() => setWizardOpen(true)}
          style={{
            padding: '8px 16px', borderRadius: 10,
            background: userProfile ? 'var(--green-light)' : 'var(--green)',
            border: userProfile ? '1px solid var(--border-active)' : 'none',
            color: userProfile ? 'var(--green)' : '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {userProfile ? 'Change Trip' : 'Plan an Escape →'}
        </button>
      </div>
    </header>
  )
}
