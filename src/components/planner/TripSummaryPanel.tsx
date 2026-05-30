import { usePlannerData } from '@/hooks/usePlannerData'

const GREEN = '#3A6B4F'

const ACCOM_EMOJI: Record<string, string> = {
  Hotel: '🏨', Motel: '🏩', Glamping: '🛖', 'Caravan Park': '🚐',
  Camping: '⛺', 'Don\'t mind': '🏡',
}

export function TripSummaryPanel() {
  const d = usePlannerData()
  if (!d.activeItinerary) return null

  const accom = d.userProfile?.accommodation_preference

  return (
    <div style={{
      padding: '14px 16px',
      background: '#fff',
      borderTop: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Destination name + trip type */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
          {d.dayLabel}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#1C1B1F', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {d.shortDest}
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>from {d.shortOrigin}</span>
          {accom && accom !== 'Any' && d.activeItinerary.total_days > 1 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: GREEN, background: '#E8F5EE', padding: '2px 7px', borderRadius: 5 }}>
              {ACCOM_EMOJI[accom] ?? '🏡'} {accom}
            </span>
          )}
        </div>
      </div>

      {/* Wiki snippet — compact, 2 lines max */}
      {d.dbLoading && !d.wikiSummary ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
          <span className="ai-sparkle" style={{ fontSize: 11 }}>✨</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: GREEN }}>Curating local insights…</span>
        </div>
      ) : d.wikiSummary ? (
        <p style={{
          margin: '6px 0 0', fontSize: 11.5, color: '#49454F', lineHeight: 1.6,
          borderLeft: `2px solid ${GREEN}`, paddingLeft: 8,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {d.wikiSummary}
        </p>
      ) : null}
    </div>
  )
}
