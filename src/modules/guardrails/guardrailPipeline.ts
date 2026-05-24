import type { DayWeather, GuardrailWarning, Itinerary, ScoredPOI, UserProfile, VehicleProfile } from '@/types'
import { checkWildlifeCrossing } from './wildlifeCrossingGuard'
import { checkStingerSeason } from './stingerSeasonGuard'
import { verifyResourceAvailability } from './fuelGapGuard'
import { checkWeatherWarnings } from './weatherGuard'

export function runGuardrailPipeline(
  itinerary: Itinerary,
  vehicleProfile: VehicleProfile,
  userProfile: UserProfile,
  pois: ScoredPOI[],
  weatherByDay?: Map<number, DayWeather>
): Itinerary {
  void userProfile // used by future guards (permit checks, accommodation matching)

  const allWarnings: GuardrailWarning[] = [
    ...checkWildlifeCrossing(itinerary, vehicleProfile),
    ...checkStingerSeason(itinerary, pois),
    ...verifyResourceAvailability(itinerary.route, vehicleProfile),
    ...(weatherByDay ? checkWeatherWarnings(itinerary, weatherByDay) : []),
  ]

  // Distribute warnings to days and inject mandatory waypoints
  const updatedDays = itinerary.days.map((day) => {
    const dayWarnings = allWarnings.filter(
      (w) => w.id.includes(`-${day.day_number}`) || w.id.includes('stinger-') || w.id.includes('fuel-gap-')
    )

    // Inject mandatory waypoints into this day's waypoint list
    const injectedWaypoints = allWarnings
      .filter((w) => w.injected_waypoint && w.severity === 'MANDATORY_STOP')
      .map((w) => w.injected_waypoint!)

    return {
      ...day,
      warnings: dayWarnings,
      waypoints: [...day.waypoints, ...injectedWaypoints],
    }
  })

  return {
    ...itinerary,
    all_warnings: allWarnings,
    days: updatedDays,
  }
}
