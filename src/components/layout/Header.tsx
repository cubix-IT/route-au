import { useAppStore } from '@/store/useAppStore'
import logoSrc from '@/assets/logo.png'

const GREEN = '#3A6B4F'

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <img
      src={logoSrc}
      alt="Unplanned Escapes"
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  )
}

export function Header() {
  const { isOffline, setWizardOpen, activeItinerary, clearItinerary, userProfile } = useAppStore()

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      height: 56,
      background: '#fff',
      borderBottom: '1px solid var(--border)',
      zIndex: 10, flexShrink: 0,
    }}>
      {/* Logo + wordmark — clicking goes home */}
      <button
        onClick={clearItinerary}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        title="Back to home"
      >
        <LogoMark size={38} />
        <div>
          <div style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 16, fontWeight: 700,
            color: '#1C1C1A',
            lineHeight: 1.15, letterSpacing: '-0.02em',
          }}>
            Unplanned<span style={{ color: GREEN }}> Escapes</span>
          </div>
          <div style={{
            fontSize: 9.5, color: '#8C8A87',
            lineHeight: 1, marginTop: 2,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            fontWeight: 500,
          }}>
            Victoria
          </div>
        </div>
      </button>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Offline dot — only show when offline */}
        {isOffline && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20,
            background: 'rgba(220,38,38,0.07)',
            border: '1px solid rgba(220,38,38,0.18)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626' }}>Offline</span>
          </div>
        )}

        {/* Start Over */}
        {activeItinerary && (
          <button
            onClick={() => clearItinerary()}
            style={{
              padding: '6px 13px', borderRadius: 8,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: '#8C8A87',
              fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#C8C4BD'
              e.currentTarget.style.color = '#4A4948'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = '#8C8A87'
            }}
          >
            Start over
          </button>
        )}

        {/* Primary CTA */}
        <button
          onClick={() => setWizardOpen(true)}
          style={{
            padding: '7px 16px', borderRadius: 9,
            background: userProfile ? 'var(--green-light)' : GREEN,
            border: userProfile ? `1px solid rgba(58,107,79,0.3)` : 'none',
            color: userProfile ? GREEN : '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
            letterSpacing: '-0.01em',
          }}
        >
          {userProfile ? 'Change trip' : 'Plan a trip'}
        </button>
      </div>
    </header>
  )
}
