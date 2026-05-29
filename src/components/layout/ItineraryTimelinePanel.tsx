import { useAppStore } from '@/store/useAppStore'
import { usePlannerData } from '@/hooks/usePlannerData'

const GREEN = '#3A6B4F'
const WARM  = '#B87333'

function fmtDate(iso: string): string {
  try { return new Date(iso + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) }
  catch { return iso }
}

export function ItineraryTimelinePanel() {
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const destName        = useAppStore((s) => s.destName)
  const originName      = useAppStore((s) => s.originName)
  const addedActivities = useAppStore((s) => s.addedActivities)
  const addedDining     = useAppStore((s) => s.addedDiningStops)
  const removeActivity  = useAppStore((s) => s.removeActivity)
  const removeDining    = useAppStore((s) => s.removeDiningStop)
  const d               = usePlannerData()

  if (!activeItinerary) return null

  const shortOrigin = originName.split(',')[0]
  const shortDest   = destName.split(',')[0].split('&')[0].trim()
  const totalKm     = Math.round(activeItinerary.total_km)
  const days        = activeItinerary.total_days

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>

      {/* ── Trip header ── */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Your trip</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#1C1B1F', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          {shortOrigin}
          <span style={{ color: '#9CA3AF', fontWeight: 400, margin: '0 5px' }}>→</span>
          {shortDest}
        </div>
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 5, display: 'flex', gap: 10 }}>
          <span>{days === 1 ? 'Day trip' : `${days} days`}</span>
          <span>·</span>
          <span>{totalKm} km</span>
          {d.fuelCost && <><span>·</span><span style={{ color: WARM, fontWeight: 600 }}>{d.fuelCost}</span></>}
        </div>
        {activeItinerary.start_date && (
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
            {fmtDate(activeItinerary.start_date)}
            {activeItinerary.end_date && ` – ${fmtDate(activeItinerary.end_date)}`}
          </div>
        )}
      </div>

      {/* ── Day summaries ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {activeItinerary.days.map((day) => {
          const depart = day.schedule.find((s) => s.type === 'depart')
          const arrive = day.schedule.find((s) => s.type === 'arrive' || s.type === 'camp')
          return (
            <div key={day.day_number} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Day {day.day_number}{day.date ? ` · ${fmtDate(day.date)}` : ''}
              </div>
              <div style={{ background: '#F8F7F4', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {depart && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', flexShrink: 0 }}>🚗</div>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: GREEN }}>{depart.title}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{depart.time}</div>
                    </div>
                  </div>
                )}
                <div style={{ width: 2, height: 10, background: 'var(--border)', marginLeft: 11 }} />
                {arrive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: WARM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', flexShrink: 0 }}>★</div>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: WARM }}>{arrive.title}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{arrive.time}</div>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: '#6B7280', marginTop: 2 }}>
                  {Math.round(day.drive_km)} km · ~{Math.round(day.drive_hours * 10) / 10}h drive
                </div>
              </div>
            </div>
          )
        })}

        {/* ── Your plan ── */}
        {(addedActivities.length > 0 || addedDining.length > 0) && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Your plan</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {addedActivities.map((act) => (
                <div key={act.actId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', borderRadius: 9, padding: '8px 10px', border: '1px solid rgba(58,107,79,0.2)' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{act.emoji}</span>
                  <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: '#1C1B1F', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.actName}</span>
                  <button onClick={() => removeActivity(act.actId)} style={{ fontSize: 10, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}>✕</button>
                </div>
              ))}
              {addedDining.map((stop) => (
                <div key={stop.foodId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF5EB', borderRadius: 9, padding: '8px 10px', border: '1px solid rgba(184,115,51,0.2)' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>🍽</span>
                  <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: '#1C1B1F', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stop.stopName}</span>
                  <button onClick={() => removeDining(stop.foodId)} style={{ fontSize: 10, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Start over ── */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <a href="/" style={{ display: 'block', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#6B7280', textDecoration: 'none', padding: '8px', borderRadius: 8, border: '1px solid var(--border)' }}>
          Plan a different trip ↺
        </a>
      </div>

    </div>
  )
}
