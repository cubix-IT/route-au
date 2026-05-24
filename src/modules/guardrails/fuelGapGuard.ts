import { FUEL_STOPS } from '@/data/fuelStops'
import type { GuardrailWarning, Route, VehicleProfile, Waypoint } from '@/types'
import { distanceBetween } from '@/utils/geo'

export function verifyResourceAvailability(
  route: Route,
  vehicleProfile: VehicleProfile
): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = []

  const consumption = vehicleProfile.is_towing
    ? vehicleProfile.fuel_consumption_litres_per_100km * 1.3
    : vehicleProfile.fuel_consumption_litres_per_100km

  const safeRangeKm = (vehicleProfile.fuel_capacity_liters / consumption) * 100 * 0.85

  // Find fuel stops near the route (within 5km of any waypoint)
  const routeCoords = route.waypoints.map((w) => w.coord)
  const nearbyFuelStops = FUEL_STOPS.filter((fs) =>
    routeCoords.some((coord) => distanceBetween(coord, fs.coord) < 5)
  )

  // Build ordered list of waypoints + nearby fuel stops by approximate distance from start
  const startCoord = route.waypoints[0]?.coord
  if (!startCoord) return []

  const fuelPoints: (Waypoint & { dist_from_start: number })[] = [
    ...nearbyFuelStops.map((fs) => ({
      ...fs,
      dist_from_start: distanceBetween(startCoord, fs.coord),
    })),
  ].sort((a, b) => a.dist_from_start - b.dist_from_start)

  // Walk the route checking gaps
  let lastFuelDist = 0

  for (const stop of fuelPoints) {
    const gapKm = stop.dist_from_start - lastFuelDist

    if (gapKm > safeRangeKm) {
      // Look for an intermediate stop to inject
      const midDist = lastFuelDist + safeRangeKm * 0.7
      const closest = FUEL_STOPS.reduce<(Waypoint & { approxDist: number }) | null>((best, fs) => {
        const d = distanceBetween(startCoord, fs.coord)
        if (Math.abs(d - midDist) < (best ? Math.abs(best.approxDist - midDist) : Infinity)) {
          return { ...fs, approxDist: d }
        }
        return best
      }, null)

      const injectedWaypoint: Waypoint | undefined = closest
        ? {
            id: `injected-fuel-${closest.id}`,
            label: `⛽ MANDATORY STOP — ${closest.label}`,
            coord: closest.coord,
            is_fuel_stop: true,
            is_mandatory: true,
            note: `Fuel gap of ${Math.round(gapKm)}km detected. Safe range: ${Math.round(safeRangeKm)}km. Refuel here.`,
          }
        : undefined

      warnings.push({
        id: `fuel-gap-${lastFuelDist}`,
        type: 'FUEL_GAP',
        severity: injectedWaypoint ? 'MANDATORY_STOP' : 'WARNING',
        message: injectedWaypoint
          ? `[MANDATORY STOP] Fuel gap of ${Math.round(gapKm)}km detected — exceeds your safe range of ${Math.round(safeRangeKm)}km. Mandatory refuel injected at ${closest?.label}.`
          : `[FUEL WARNING] ${Math.round(gapKm)}km gap between fuel stops exceeds safe range of ${Math.round(safeRangeKm)}km. No intermediate stop found — carry jerry cans.`,
        injected_waypoint: injectedWaypoint,
      })
    }

    lastFuelDist = stop.dist_from_start
  }

  return warnings
}
