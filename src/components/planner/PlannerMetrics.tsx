import { GREEN, WARM, SECONDARY } from '@/lib/brand'
import { usePlannerData } from '@/hooks/usePlannerData'

const BLUE  = '#1D4ED8'

function formatDriveTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export function PlannerMetrics() {
  const d = usePlannerData()
  if (!d.activeItinerary) return null

  const cols = d.fuelCost ? 3 : 2

  return (
    <div style={{
      background: 'rgba(248,247,244,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255,255,255,0.6)',
      padding: '14px 16px',
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 10,
      flexShrink: 0,
    }}>
      <MetricTile
        emoji="🚗"
        label="Drive Time"
        value={formatDriveTime(d.driveHours)}
        accent={GREEN}
        bg="rgba(232,245,238,0.75)"
        border="rgba(58,107,79,0.18)"
        sub="estimated"
      />
      <MetricTile
        emoji="📍"
        label="Distance"
        value={`${d.totalKm} km`}
        accent={BLUE}
        bg="rgba(239,246,255,0.75)"
        border="rgba(29,78,216,0.18)"
        sub="total route"
      />
      {d.fuelCost && (
        <MetricTile
          emoji="⛽"
          label="Est. Fuel"
          value={d.fuelCost}
          accent={WARM}
          bg="rgba(254,243,199,0.75)"
          border="rgba(184,115,51,0.18)"
          sub="return trip"
        />
      )}
    </div>
  )
}

function MetricTile({ emoji, label, value, accent, bg, border, sub }: {
  emoji: string; label: string; value: string; accent: string; bg: string; border: string; sub: string
}) {
  return (
    <div style={{
      background: bg,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: 16,
      padding: '13px 14px',
      border: `1px solid ${border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: accent, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: `${accent}99`, fontWeight: 500 }}>{sub}</div>
    </div>
  )
}
