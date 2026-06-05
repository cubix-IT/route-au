import type { DayWeather, GuardrailWarning, Itinerary } from '@/types'
import { CORRIDORS } from '@/data/corridors.ts'

const DIRT_SURFACES = new Set(['Dirt', 'Gravel', '4WD_Only'])

export function checkWeatherWarnings(
  itinerary: Itinerary,
  weatherByDay: Map<number, DayWeather>
): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = []

  const hasDirtTrack = itinerary.route.corridor_ids.some((id) => {
    const c = CORRIDORS.find((seg) => seg.id === id)
    return c ? DIRT_SURFACES.has(c.road_surface) : false
  })

  for (const day of itinerary.days) {
    const weather = weatherByDay.get(day.day_number)
    if (!weather) continue

    if (weather.temp_max_c >= 42) {
      warnings.push({
        id: `heat-day-${day.day_number}`,
        type: 'EXTREME_HEAT',
        severity: 'WARNING',
        message:
          `[EXTREME HEAT — Day ${day.day_number}] Forecast maximum of ${Math.round(weather.temp_max_c)}°C. ` +
          `Drive before 9am where possible. Carry minimum 5L of drinking water per person. ` +
          `Do not leave pets or children in vehicles. Check engine coolant before departure.`,
      })
    }

    if (hasDirtTrack && weather.precipitation_probability >= 70) {
      warnings.push({
        id: `flood-day-${day.day_number}`,
        type: 'FLASH_FLOOD',
        severity: 'WARNING',
        message:
          `[FLASH FLOOD RISK — Day ${day.day_number}] ${Math.round(weather.precipitation_probability)}% chance of heavy rain on unsealed tracks. ` +
          `Dirt and gravel sections may become impassable. Check road conditions at 1300 130 595 (SA) or state traffic authority before departing. ` +
          `Never cross flooded roads — turn around, don't drown.`,
      })
    }
  }

  return warnings
}
