import { GREEN } from '@/lib/brand'
import { usePlannerData } from '@/hooks/usePlannerData'
import type { CrewType, VibeTag, AccommodationPreference } from '@/types/profiles'

function formatDriveTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

const CREW_LABEL: Record<CrewType, string> = {
  solo: 'Solo', couple: 'Couple', family: 'Family', group: 'Group',
}

const VIBE_LABEL: Partial<Record<VibeTag, string>> = {
  Hiking: 'Hiking', Wineries: 'Wineries', Wildlife: 'Wildlife', History: 'History',
  Beach: 'Beach', Markets: 'Markets', Lookouts: 'Lookouts', Photography: 'Photography',
  Stargazing: 'Stargazing', HotSprings: 'Hot Springs', Cycling: 'Cycling',
  CraftBeer: 'Craft Beer', FamilyAttractions: 'Family Fun', Chilling: 'Chill',
}

const ACCOM_LABEL: Partial<Record<AccommodationPreference, string>> = {
  Hotel: 'Hotel', Glamping: 'Glamping', CaravanPark: 'Caravan Park',
  FreeCamping: 'Free Camping',
}

function Chip({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: accent ? '#DCF0E4' : '#ECF0EB',
      color: accent ? GREEN : '#4B5563',
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export function TripSummaryPanel() {
  const d = usePlannerData()
  if (!d.activeItinerary) return null

  const p = d.userProfile
  const itin = d.activeItinerary

  const vibes = (p?.preferred_vibe ?? []).slice(0, 3).map(v => VIBE_LABEL[v]).filter(Boolean) as string[]
  const accomLabel = p?.accommodation_preference ? ACCOM_LABEL[p.accommodation_preference] : null
  const crewLabel = p?.crew_type ? CREW_LABEL[p.crew_type] : null

  return (
    <div style={{
      background: 'rgba(248,247,244,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.7)',
      padding: '14px 16px 10px',
      flexShrink: 0,
    }}>
      {/* Trip label + date */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          {d.dayLabel}
        </span>
        {itin.start_date && (
          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
            {formatDate(itin.start_date)}
          </span>
        )}
      </div>

      {/* Destination + origin */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#1C1B1F', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          {d.shortDest}
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>from {d.shortOrigin}</div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <StatInline label="Drive" value={formatDriveTime(d.driveHours)} />
        <div style={{ width: 1, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />
        <StatInline label="Distance" value={`${d.totalKm} km`} />
        {itin.total_days > 1 && (
          <>
            <div style={{ width: 1, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />
            <StatInline label="Nights" value={String(itin.total_days - 1)} />
          </>
        )}
      </div>

      {/* Context chips */}
      {(crewLabel || vibes.length > 0 || accomLabel) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {crewLabel && <Chip label={crewLabel} />}
          {vibes.map(v => <Chip key={v} label={v} accent />)}
          {accomLabel && itin.total_days > 1 && <Chip label={accomLabel} />}
        </div>
      )}
    </div>
  )
}

function StatInline({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, color: '#1C1B1F', letterSpacing: '-0.02em' }}>{value}</span>
    </div>
  )
}
