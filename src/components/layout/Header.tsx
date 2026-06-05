import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/store/useAppStore'
import { signOut } from '@/hooks/useAuth'
import { saveTrip, loadTrips, deleteTrip, FREE_TRIP_LIMIT } from '@/lib/tripsService'
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

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
      background: 'var(--green-light)', border: `2px solid rgba(58,107,79,0.25)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: GREEN, flexShrink: 0,
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} width={32} height={32} style={{ objectFit: 'cover' }} />
        : initials}
    </div>
  )
}

export function Header() {
  const {
    isOffline, setWizardOpen, clearItinerary, userProfile,
    authUser, activeItinerary,
    savedTrips, setSavedTrips,
  } = useAppStore()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [tripsOpen, setTripsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSaveTrip() {
    if (!activeItinerary) return
    setSaving(true)
    const result = await saveTrip(activeItinerary, authUser?.id ?? null)
    setSaving(false)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success(result.location === 'cloud' ? 'Trip saved to your account ✓' : 'Trip saved locally ✓')
    }
  }

  async function handleOpenTrips() {
    setTripsOpen(true)
    setDropdownOpen(false)
    const trips = await loadTrips(authUser?.id ?? null)
    setSavedTrips(trips)
  }

  async function handleDeleteTrip(tripId: string) {
    await deleteTrip(tripId, authUser?.id ?? null)
    const trips = await loadTrips(authUser?.id ?? null)
    setSavedTrips(trips)
  }

  const displayName = authUser?.user_metadata?.full_name
    ?? authUser?.user_metadata?.name
    ?? authUser?.email?.split('@')[0]
    ?? 'Traveller'
  const avatarUrl = authUser?.user_metadata?.avatar_url ?? authUser?.user_metadata?.picture ?? null

  return (
    <>
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
        {/* Logo — clicking goes home */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

          {/* Save trip button — only when logged in and trip is active */}
          {authUser && activeItinerary && (
            <button
              onClick={handleSaveTrip}
              disabled={saving}
              style={{
                padding: '7px 14px', borderRadius: 9,
                background: 'var(--bg-muted)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: saving ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              {saving ? '…' : '★'} Save trip
            </button>
          )}

          {/* Plan / Change trip */}
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

          {/* Auth: avatar dropdown OR sign-in button */}
          {authUser ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: '50%', display: 'flex' }}
                aria-label="Account menu"
              >
                <Avatar name={displayName} avatarUrl={avatarUrl} />
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 14, boxShadow: 'var(--shadow-lg)',
                  minWidth: 200, zIndex: 50, overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{authUser.email}</div>
                  </div>
                  <button
                    onClick={handleOpenTrips}
                    style={dropdownItemStyle}
                  >
                    🗺 My Trips
                    {savedTrips.length > 0 && (
                      <span style={{
                        marginLeft: 'auto', background: GREEN, color: '#fff',
                        borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                      }}>
                        {savedTrips.length}
                      </span>
                    )}
                  </button>
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <button
                    onClick={async () => { setDropdownOpen(false); await signOut() }}
                    style={{ ...dropdownItemStyle, color: '#DC2626' }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : null /* Sign in hidden until auth is fully enabled */}
        </div>
      </header>

      {/* My Trips drawer */}
      {tripsOpen && (
        <TripsDrawer
          trips={savedTrips}
          onClose={() => setTripsOpen(false)}
          onDelete={handleDeleteTrip}
          onLoad={(itin) => {
            useAppStore.getState().setActiveItinerary(itin)
            setTripsOpen(false)
          }}
        />
      )}
    </>
  )
}

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '11px 16px',
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
  textAlign: 'left', transition: 'background 0.1s',
}

function TripsDrawer({
  trips, onClose, onDelete, onLoad,
}: {
  trips: Itinerary[]
  onClose: () => void
  onDelete: (id: string) => void
  onLoad: (itin: Itinerary) => void
}) {
  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div
        className="wizard-card"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#1C1C1A', letterSpacing: '-0.02em' }}>
            My Trips
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {trips.length} / {FREE_TRIP_LIMIT} saved
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: 0 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '60vh' }}>
          {trips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              No saved trips yet. Plan a trip and hit ★ Save trip.
            </div>
          ) : trips.map((itin) => (
            <div key={itin.id} style={{
              padding: '14px 16px', borderRadius: 12,
              border: '1.5px solid var(--border)', background: 'var(--bg-muted)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {itin.name ?? 'Trip'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {itin.start_date} · {itin.total_km ? `${Math.round(itin.total_km)} km` : ''} · {itin.total_days === 1 ? 'Day trip' : `${itin.total_days} days`}
                </div>
              </div>
              <button
                onClick={() => onLoad(itin)}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: 'var(--green-light)', border: '1px solid rgba(58,107,79,0.25)',
                  color: GREEN, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                View
              </button>
              <button
                onClick={() => onDelete(itin.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: 'var(--text-muted)', padding: '0 4px', flexShrink: 0,
                }}
                aria-label="Delete trip"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Type import needed for TripsDrawer
import type { Itinerary } from '@/types'
