import { useAppStore } from '@/store/useAppStore'
import { usePlannerData } from '@/hooks/usePlannerData'

const GREEN = '#3A6B4F'
const WARM  = '#B87333'

function fmtDate(iso: string): string {
  try { return new Date(iso + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) }
  catch { return iso }
}

export function FloatingTimeline() {
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const destName        = useAppStore((s) => s.destName)
  const originName      = useAppStore((s) => s.originName)
  const clearItinerary  = useAppStore((s) => s.clearItinerary)
  const d               = usePlannerData()

  if (!activeItinerary) return null

  const shortOrigin = originName.split(',')[0]
  const shortDest   = destName.split(',')[0].split('&')[0].trim()
  const totalKm     = Math.round(activeItinerary.total_km)
  const days        = activeItinerary.total_days

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: 12,
      zIndex: 10,
      width: 220,
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(20px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
      borderRadius: 16,
      boxShadow: '0 4px 24px rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.6) inset',
      border: '1px solid rgba(255,255,255,0.6)',
      overflow: 'hidden',
    }}>

      {/* Trip header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Your trip</div>
        <div style={{ fontSize: 13.5, fontWeight: 900, color: '#1C1B1F', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          {shortOrigin}
          <span style={{ color: '#C8C4BD', fontWeight: 400, margin: '0 4px' }}>→</span>
          {shortDest}
        </div>
        <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>{days === 1 ? 'Day trip' : `${days} days`}</span>
          <span style={{ color: '#D1CFC9' }}>·</span>
          <span>{totalKm} km</span>
          {d.fuelCost && (
            <><span style={{ color: '#D1CFC9' }}>·</span><span style={{ color: WARM, fontWeight: 600 }}>{d.fuelCost}</span></>
          )}
        </div>
        {activeItinerary.start_date && (
          <div style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2 }}>
            {fmtDate(activeItinerary.start_date)}
            {activeItinerary.end_date && ` – ${fmtDate(activeItinerary.end_date)}`}
          </div>
        )}
      </div>

      {/* Day list */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
        {activeItinerary.days.map((day, idx) => {
          const depart = day.schedule.find((s) => s.type === 'depart')
          const arrive = day.schedule.find((s) => s.type === 'arrive' || s.type === 'camp')
          const isLast = idx === activeItinerary.days.length - 1
          return (
            <div key={day.day_number} style={{ position: 'relative' }}>
              {/* Connector line */}
              {!isLast && (
                <div style={{ position: 'absolute', left: 9, top: 22, width: 2, height: 'calc(100% + 4px)', background: 'rgba(0,0,0,0.08)' }} />
              )}
              <div style={{ fontSize: 8.5, fontWeight: 800, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Day {day.day_number}{day.date ? ` · ${fmtDate(day.date)}` : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {depart && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>🚗</div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: GREEN, lineHeight: 1.2 }}>{depart.title}</div>
                      <div style={{ fontSize: 9, color: '#9CA3AF' }}>{depart.time}</div>
                    </div>
                  </div>
                )}
                {arrive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 0 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: WARM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>★</div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: WARM, lineHeight: 1.2 }}>{arrive.title}</div>
                      <div style={{ fontSize: 9, color: '#9CA3AF' }}>{arrive.time}</div>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 9.5, color: '#9CA3AF', marginLeft: 27 }}>
                  {Math.round(day.drive_km)} km · ~{Math.round(day.drive_hours * 10) / 10}h
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Start over */}
      <div style={{ padding: '8px 14px 12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={clearItinerary}
          style={{ width: '100%', fontSize: 10.5, fontWeight: 700, color: '#6B7280', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '6px', cursor: 'pointer' }}
        >
          Plan a different trip ↺
        </button>
      </div>
    </div>
  )
}
