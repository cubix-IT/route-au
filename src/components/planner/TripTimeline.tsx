import { useAppStore } from '@/store/useAppStore'

const GREEN = '#3A6B4F'
const WARM = '#B87333'

function parseTimeToHours(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i)
  if (!match) return -1
  let h = parseInt(match[1])
  const m = parseInt(match[2])
  const mer = match[3].toLowerCase()
  if (mer === 'pm' && h !== 12) h += 12
  if (mer === 'am' && h === 12) h = 0
  return h + m / 60
}

function fmtHour(h: number): string {
  const hour = Math.floor(h)
  const min = Math.round((h - hour) * 60)
  const mer = hour >= 12 ? 'pm' : 'am'
  const d = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return min === 0 ? `${d}${mer}` : `${d}:${String(min).padStart(2, '0')}${mer}`
}

function haversinKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export function TripTimeline() {
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const departureHour = useAppStore((s) => s.departureHour)
  const originName = useAppStore((s) => s.originName)
  const destName = useAppStore((s) => s.destName)
  const originCoord = useAppStore((s) => s.originCoord)
  const destCoord = useAppStore((s) => s.destCoord)
  const addedDiningStops = useAppStore((s) => s.addedDiningStops)
  const removeDiningStop = useAppStore((s) => s.removeDiningStop)

  if (!activeItinerary) return null
  const day1 = activeItinerary.days[0]
  if (!day1) return null

  const totalDriveHours = Math.max(activeItinerary.route.estimated_drive_hours, 0.5)
  const arrivalHour = departureHour + totalDriveHours
  const safeHour = departureHour + totalDriveHours * 0.55
  const showSafe = totalDriveHours >= 2.5
  const safePos = ((safeHour - departureHour) / totalDriveHours) * 100

  const pos = (h: number) =>
    Math.max(2, Math.min(98, ((h - departureHour) / totalDriveHours) * 100))

  const scheduleMarkers = day1.schedule.filter(
    (item) => item.type !== 'depart' && item.type !== 'drive' && item.type !== 'arrive',
  )

  const originDist = haversinKm(originCoord, destCoord)
  const addedMarkers = addedDiningStops.map((stop) => {
    const stopCoord = { lat: stop.stopLat, lng: stop.stopLng }
    const ratio = originDist > 0
      ? Math.min(haversinKm(originCoord, stopCoord) / originDist, 0.92)
      : (stop.timeOfDay === 'morning' ? 0.28 : 0.62)
    return { ...stop, timeHour: departureHour + ratio * totalDriveHours, timePos: ratio * 100 }
  })

  const totalKm = Math.round(activeItinerary.total_km)
  const shortOrigin = originName.split(',')[0]
  const shortDest = destName.split(',')[0].split('&')[0].trim()

  return (
    <div style={{
      flexShrink: 0,
      background: '#fff',
      borderTop: '1.5px solid var(--border)',
      padding: '10px 20px 12px',
    }}>

      {/* Label row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Route timeline
            {activeItinerary.total_days > 1 && ` · ${activeItinerary.total_days} days`}
          </span>
          {addedDiningStops.length > 0 && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, color: GREEN,
              background: 'var(--green-light)', padding: '2px 7px', borderRadius: 5,
            }}>
              {addedDiningStops.length} stop{addedDiningStops.length > 1 ? 's' : ''} added
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {totalKm} km · ~{Math.round(totalDriveHours * 10) / 10}h
        </span>
      </div>

      {/* Timeline container */}
      <div style={{ position: 'relative', height: 68, userSelect: 'none' }}>

        {/* Track — two-colour gradient */}
        <div style={{
          position: 'absolute', top: 32, left: 14, right: 14,
          height: 5, borderRadius: 3,
          display: 'flex', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ width: `${safePos}%`, background: `linear-gradient(90deg, ${GREEN}CC, ${GREEN}99)` }} />
          <div style={{ flex: 1, background: `linear-gradient(90deg, ${WARM}99, ${WARM}CC)` }} />
        </div>

        {/* Origin endpoint */}
        <Endpoint label={shortOrigin} time={fmtHour(departureHour)} color={GREEN} align="left" />

        {/* Schedule markers (from itinerary) */}
        {scheduleMarkers.map((item) => {
          const h = parseTimeToHours(item.time)
          if (h < 0) return null
          const p = pos(h)
          return (
            <div
              key={item.id}
              title={`${item.title} · ${item.time}`}
              style={{
                position: 'absolute',
                left: `calc(${p}% + 14px - (${p / 100}) * 28px)`,
                top: 20, fontSize: 14, lineHeight: 1,
                transform: 'translateX(-50%)',
                zIndex: 2, cursor: 'default',
              }}
            >
              {item.emoji}
            </div>
          )
        })}

        {/* Added stop markers */}
        {addedMarkers.map((stop) => (
          <div
            key={stop.foodId}
            style={{
              position: 'absolute',
              left: `calc(${stop.timePos}% + 14px - (${stop.timePos / 100}) * 28px)`,
              top: 6, transform: 'translateX(-50%)',
              zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}
          >
            <button
              onClick={() => removeDiningStop(stop.foodId)}
              title={`Remove ${stop.stopName}`}
              style={{
                fontSize: 9, fontWeight: 700, color: '#fff',
                background: GREEN, padding: '2px 5px', borderRadius: 4,
                whiteSpace: 'nowrap', maxWidth: 68,
                overflow: 'hidden', textOverflow: 'ellipsis',
                cursor: 'pointer', border: 'none',
              }}
            >
              ✕ {stop.stopName.split(' ')[0]}
            </button>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: GREEN, border: '2px solid #fff',
              boxShadow: `0 1px 4px ${GREEN}66`,
            }} />
          </div>
        ))}

        {/* Safe-zone divider */}
        {showSafe && (
          <div style={{
            position: 'absolute',
            left: `calc(${safePos}% + 14px - (${safePos / 100}) * 28px)`,
            top: 22, transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ fontSize: 7.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginBottom: 1, letterSpacing: '-0.01em' }}>rest</div>
            <div style={{ width: 1, height: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 1 }} />
          </div>
        )}

        {/* Destination endpoint */}
        <Endpoint label={shortDest} time={fmtHour(arrivalHour)} color={WARM} align="right" />
      </div>
    </div>
  )
}

function Endpoint({
  label, time, color, align,
}: {
  label: string; time: string; color: string; align: 'left' | 'right'
}) {
  return (
    <div style={{
      position: 'absolute',
      left: align === 'left' ? 14 : undefined,
      right: align === 'right' ? 14 : undefined,
      top: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: align === 'left' ? 'flex-start' : 'flex-end',
      gap: 2, zIndex: 4,
    }}>
      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>{time}</div>
      <div style={{
        width: 11, height: 11, borderRadius: '50%',
        background: color, border: '2.5px solid #fff',
        boxShadow: `0 1px 6px ${color}66`,
      }} />
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
        whiteSpace: 'nowrap', maxWidth: 84,
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
    </div>
  )
}
