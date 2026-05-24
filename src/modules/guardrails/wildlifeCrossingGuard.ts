import type { GuardrailWarning, Itinerary, VehicleProfile } from '@/types'
import { getSunTimes, minutesFromSunEvent } from '@/utils/sunTimes'

const OUTBACK_CORRIDOR_IDS = ['explorers-way', 'savannah-way', 'oodnadatta-track', 'gibb-river-road']
const DUSK_WINDOW_MINUTES = 60

export function checkWildlifeCrossing(
  itinerary: Itinerary,
  _vehicleProfile: VehicleProfile
): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = []
  const isOutbackRoute = itinerary.route.corridor_ids.some((id) =>
    OUTBACK_CORRIDOR_IDS.includes(id)
  )

  if (!isOutbackRoute) return []

  for (const day of itinerary.days) {
    const date = new Date(day.date)

    // Use midpoint of route for sun time calculation
    const midWaypoint = day.waypoints[Math.floor(day.waypoints.length / 2)]
    if (!midWaypoint) continue

    const { sunrise, sunset } = getSunTimes(date, midWaypoint.coord.lat, midWaypoint.coord.lng)

    // Estimate departure at 7am and check if journey end is within dusk window
    const departureTime = new Date(date)
    departureTime.setHours(7, 0, 0, 0)
    const arrivalTime = new Date(departureTime.getTime() + day.drive_hours * 3600000)

    const minsFromSunset = minutesFromSunEvent(arrivalTime, sunset)
    const minsFromSunrise = minutesFromSunEvent(departureTime, sunrise)

    if (minsFromSunset <= DUSK_WINDOW_MINUTES || minsFromSunrise <= DUSK_WINDOW_MINUTES) {
      warnings.push({
        id: `wildlife-${day.day_number}`,
        type: 'WILDLIFE_CROSSING',
        severity: 'WARNING',
        message:
          `[WARNING: Day ${day.day_number}] High-density kangaroo/emu/wombat crossing zone detected during dawn or dusk travel. ` +
          `Reduce speed to 80 km/h, use high-beam headlights, and consider terminating your day's drive before sunset ` +
          `(${sunset.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}).`,
        affected_segment_id: itinerary.route.corridor_ids.find((id) => OUTBACK_CORRIDOR_IDS.includes(id)),
      })
    }
  }

  return warnings
}
