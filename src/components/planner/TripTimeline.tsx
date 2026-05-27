import { useAppStore } from '@/store/useAppStore'

const GREEN = '#3A6B4F'
const WARM = '#B87333'

function parseTimeToHours(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i)
  if (!match) return -1
  let h = parseInt(match[1])
  const m = parseInt(match[2])
  const meridiem = match[3].toLowerCase()
  if (meridiem === 'pm' && h !== 12) h += 12
  if (meridiem === 'am' && h === 12) h = 0
  return h + m / 60
}

function fmtHour(h: number): string {
  const hour = Math.floor(h)
  const min = Math.round((h - hour) * 60)
  const mer = hour >= 12 ? 'pm' : 'am'
  const d = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return min === 0 ? `${d}${mer}` : `${d}:${String(min).padStart(2, '0')}${mer}`
}

function haversinKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
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

  if (!activeItinerary) return null

  const day1 = activeItinerary.days[0]
  if (!day1) return null

  const totalDriveHours = Math.max(activeItinerary.route.estimated_drive_hours, 0.5)
  const arrivalHour = departureHour + totalDriveHours

  // Safe zone at 55% of drive time — where a rest break makes sense
  const safeHour = departureHour + totalDriveHours * 0.55
  const showSafe = totalDriveHours >= 2.5

  // Position on timeline: 0–100%
  const pos = (h: number) =>
    Math.max(0, Math.min(100, ((h - departureHour) / totalDriveHours) * 100))

  const safePos = pos(safeHour)

  // Schedule items to show as markers (exclude depart/drive/arrive)
  const scheduleMarkers = day1.schedule.filter(
    (item) => item.type !== 'depart' && item.type !== 'drive' && item.type !== 'arrive',
  )

  // Added dining stops → calculate their timeline position from distance ratio
  const originDist = haversinKm(originCoord, destCoord)
  const addedMarkers = addedDiningStops.map((stop) => {
    const stopCoord = { lat: stop.stopLat, lng: stop.stopLng }
    const ratio = originDist > 0
      ? Math.min(haversinKm(originCoord, stopCoord) / originDist, 0.9)
      : (stop.timeOfDay === 'morning' ? 0.25 : 0.60)
    return {
      ...stop,
      timeHour: departureHour + ratio * totalDriveHours,
    }
  })

  const shortOrigin = originName.split(',')[0]
  const shortDest = destName.split(',')[0].split('&')[0].trim()
  const totalKm = Math.round(activeItinerary.total_km)

  return (
    <div style={{
      flexShrink: 0,
      background: '#fff',
      borderTop: '2px solid var(--border)',
      padding: '10px 20px 12px',
      minHeight: 90,
      maxHeight: 110,
    }}>
      {/* Label row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Day {day1.day_number} Timeline
          {activeItinerary.total_days > 1 && ` (${activeItinerary.total_days}-day trip)`}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {totalKm}km · {Math.round(totalDriveHours * 10) / 10}h drive
        </div>
      </div>

      {/* Bar container */}
      <div style={{ position: 'relative', height: 52 }}>

        {/* Track: two colored segments */}
        <div style={{
          position: 'absolute',
          top: 24, left: 8, right: 8,
          height: 5,
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
        }}>
          <div style={{ width: `${safePos}%`, background: GREEN, opacity: 0.85 }} />
          <div style={{ flex: 1, background: WARM, opacity: 0.75 }} />
        </div>

        {/* Origin dot */}
        <TLMarker pos={0} color={GREEN} size={11} time={fmtHour(departureHour)} label={shortOrigin} />

        {/* Schedule item markers (coffee, lunch, etc.) */}
        {scheduleMarkers.map((item) => {
          const h = parseTimeToHours(item.time)
          if (h < 0) return null
          const p = pos(h)
          return (
            <div
              key={item.id}
              title={`${item.emoji} ${item.title} · ${item.time}`}
              style={{
                position: 'absolute',
                left: `calc(${p}% + 8px)`,
                top: 18,
                transform: 'translate(-50%, 0)',
                fontSize: 14,
                lineHeight: 1,
                userSelect: 'none',
              }}
            >
              {item.emoji}
            </div>
          )
        })}

        {/* Added dining stop markers */}
        {addedMarkers.map((stop) => {
          const p = pos(stop.timeHour)
          return (
            <div
              key={stop.foodId}
              title={`Added: ${stop.stopName}`}
              style={{
                position: 'absolute',
                left: `calc(${p}% + 8px)`,
                top: 12,
                transform: 'translate(-50%, 0)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}
            >
              <div style={{
                fontSize: 9, fontWeight: 700, color: GREEN,
                background: 'var(--green-light)',
                padding: '1px 4px', borderRadius: 4,
                whiteSpace: 'nowrap', maxWidth: 60,
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {stop.stopName.split(' ')[0]}
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: GREEN, border: '2px solid #fff',
              }} />
            </div>
          )
        })}

        {/* Safe zone divider */}
        {showSafe && (
          <div style={{
            position: 'absolute',
            left: `calc(${safePos}% + 8px)`,
            top: 14,
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          }}>
            <div style={{ fontSize: 8.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>rest</div>
            <div style={{ width: 1.5, height: 12, background: 'var(--border-strong)', borderRadius: 1 }} />
          </div>
        )}

        {/* Arrival dot */}
        <TLMarker pos={100} color={WARM} size={11} time={fmtHour(arrivalHour)} label={shortDest} right />
      </div>
    </div>
  )
}

function TLMarker({
  pos, color, size, time, label, right,
}: {
  pos: number
  color: string
  size: number
  time: string
  label: string
  right?: boolean
}) {
  const alignItems = right ? 'flex-end' : 'flex-start'
  const left = right ? undefined : `calc(${pos}% + 8px)`
  const rightCss = right ? `calc(${100 - pos}% - 8px + ${size / 2}px)` : undefined

  return (
    <div style={{
      position: 'absolute',
      left,
      right: rightCss,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems,
      gap: 2,
      transform: right ? 'none' : 'none',
    }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{time}</div>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color, border: '2.5px solid #fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      }} />
      <div style={{
        fontSize: 9.5, color: 'var(--text-secondary)', fontWeight: 600,
        whiteSpace: 'nowrap', maxWidth: 72,
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
    </div>
  )
}
