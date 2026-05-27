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
    Math.max(0, Math.min(100, ((h - departureHour) / totalDriveHours) * 100))

  const scheduleMarkers = day1.schedule.filter(
    (item) => item.type !== 'depart' && item.type !== 'drive' && item.type !== 'arrive',
  )

  const originDist = haversinKm(originCoord, destCoord)
  const addedMarkers = addedDiningStops.map((stop) => {
    const stopCoord = { lat: stop.stopLat, lng: stop.stopLng }
    const ratio = originDist > 0
      ? Math.min(haversinKm(originCoord, stopCoord) / originDist, 0.9)
      : (stop.timeOfDay === 'morning' ? 0.25 : 0.60)
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
      padding: '10px 24px 14px',
    }}>
      {/* Label row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Day {day1.day_number} route
            {activeItinerary.total_days > 1 && ` · ${activeItinerary.total_days}-day trip`}
          </div>
          {addedDiningStops.length > 0 && (
            <div style={{
              fontSize: 9.5, fontWeight: 700, color: GREEN,
              background: 'var(--green-light)', padding: '2px 7px', borderRadius: 5,
            }}>
              {addedDiningStops.length} stop{addedDiningStops.length > 1 ? 's' : ''} added
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {totalKm}km · ~{Math.round(totalDriveHours * 10) / 10}h drive
        </div>
      </div>

      {/* Timeline bar container */}
      <div style={{ position: 'relative', height: 64, userSelect: 'none' }}>

        {/* Coloured track */}
        <div style={{
          position: 'absolute',
          top: 30, left: 12, right: 12,
          height: 6, borderRadius: 3,
          display: 'flex', overflow: 'hidden',
        }}>
          <div style={{ width: `${safePos}%`, background: GREEN, opacity: 0.8 }} />
          <div style={{ flex: 1, background: WARM, opacity: 0.7 }} />
        </div>

        {/* Origin */}
        <EndpointMarker
          label={shortOrigin}
          time={fmtHour(departureHour)}
          color={GREEN}
          align="left"
        />

        {/* Schedule markers */}
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
                left: `calc(${p}% + 12px - (${p}% / 100) * 24px)`,
                top: 20,
                fontSize: 15, lineHeight: 1, zIndex: 2,
                transform: 'translateX(-50%)',
                cursor: 'default',
              }}
            >
              {item.emoji}
            </div>
          )
        })}

        {/* Added dining stop markers */}
        {addedMarkers.map((stop) => (
          <div
            key={stop.foodId}
            style={{
              position: 'absolute',
              left: `calc(${stop.timePos}% + 12px - (${stop.timePos}% / 100) * 24px)`,
              top: 8,
              transform: 'translateX(-50%)',
              zIndex: 3,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}
          >
            {/* Removable label */}
            <div
              onClick={() => removeDiningStop(stop.foodId)}
              title={`Remove ${stop.stopName}`}
              style={{
                fontSize: 9, fontWeight: 700, color: '#fff',
                background: GREEN,
                padding: '2px 5px', borderRadius: 4,
                whiteSpace: 'nowrap', maxWidth: 64,
                overflow: 'hidden', textOverflow: 'ellipsis',
                cursor: 'pointer',
              }}
            >
              ✕ {stop.stopName.split(' ')[0]}
            </div>
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: GREEN, border: '2px solid #fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        ))}

        {/* Safe zone divider */}
        {showSafe && (
          <div style={{
            position: 'absolute',
            left: `calc(${safePos}% + 12px - (${safePos}% / 100) * 24px)`,
            top: 20,
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginBottom: 1 }}>rest</div>
            <div style={{ width: 1.5, height: 14, background: 'var(--border-strong)', borderRadius: 1 }} />
          </div>
        )}

        {/* Destination */}
        <EndpointMarker
          label={shortDest}
          time={fmtHour(arrivalHour)}
          color={WARM}
          align="right"
        />
      </div>
    </div>
  )
}

function EndpointMarker({
  label, time, color, align,
}: {
  label: string
  time: string
  color: string
  align: 'left' | 'right'
}) {
  const left = align === 'left' ? 12 : undefined
  const right = align === 'right' ? 12 : undefined

  return (
    <div style={{
      position: 'absolute',
      left, right, top: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: align === 'left' ? 'flex-start' : 'flex-end',
      gap: 2, zIndex: 4,
    }}>
      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 500 }}>{time}</div>
      <div style={{
        width: 12, height: 12, borderRadius: '50%',
        background: color, border: '2.5px solid #fff',
        boxShadow: `0 1px 5px ${color}55`,
      }} />
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
        whiteSpace: 'nowrap', maxWidth: 80,
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
    </div>
  )
}
