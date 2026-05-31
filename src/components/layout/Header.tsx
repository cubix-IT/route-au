import { useAppStore } from '@/store/useAppStore'
import logoSrc from '@/assets/logo.png'

const GREEN = '#3A6B4F'

export function LogoMark({ size = 56 }: { size?: number }) {
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
  const { isOffline, setWizardOpen, clearItinerary, userProfile } = useAppStore()

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      height: 64,
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(24px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      zIndex: 10, flexShrink: 0,
    }}>
      {/* Logo + wordmark — clicking goes home */}
      <button
        onClick={clearItinerary}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        title="Back to home"
      >
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: '#1C1C1A', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          Unplanned<span style={{ color: GREEN }}> Escapes</span>
          <span style={{ color: '#8C8A87', fontWeight: 400, fontSize: 13 }}> Victoria</span>
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
