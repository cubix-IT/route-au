import { CORRIDORS } from '@/data/corridors'
import { FUEL_STOPS } from '@/data/fuelStops'
import type { Coordinate, Route, VehicleProfile, Waypoint } from '@/types'
import { distanceBetween } from '@/utils/geo'
import { validateRouteConstraints } from './routeConstraintValidator'

export function buildRoute(
  origin: Coordinate,
  destination: Coordinate,
  preferScenic: boolean,
  vehicleProfile: VehicleProfile
): Route {
  const sorted = preferScenic
    ? [...CORRIDORS].sort((a, b) => b.scenic_rating - a.scenic_rating)
    : CORRIDORS

  // Find corridors whose bounding polygon covers origin or destination
  const relevantCorridors = sorted.filter((c) => {
    const allCoords = c.path_coordinates
    if (allCoords.length === 0) return false

    // Check if origin or destination is within 200km of any path point
    return allCoords.some(
      (p) => distanceBetween(origin, p) < 200 || distanceBetween(destination, p) < 200
    )
  })

  const selected = relevantCorridors.length > 0 ? relevantCorridors.slice(0, 2) : sorted.slice(0, 1)

  const corridorIds = selected.map((c) => c.id)

  // Build waypoints from segment path coordinates
  const rawWaypoints: Waypoint[] = [
    { id: 'start', label: 'Start', coord: origin, is_fuel_stop: false, is_mandatory: true },
    ...selected.flatMap((seg, si) =>
      seg.path_coordinates.map((coord, i) => ({
        id: `${seg.id}-${i}`,
        label: i === 0 ? seg.name : seg.path_coordinates.length === i + 1 ? `${seg.name} end` : `${seg.name} via`,
        coord,
        is_fuel_stop: false,
        is_mandatory: si === 0 && i === 0,
      }))
    ),
    { id: 'end', label: 'Destination', coord: destination, is_fuel_stop: false, is_mandatory: true },
  ]

  const totalDistanceKm = selected.reduce((sum, c) => sum + c.approximate_length_km, 0)
  const consumption = vehicleProfile.is_towing
    ? vehicleProfile.fuel_consumption_litres_per_100km * 1.3
    : vehicleProfile.fuel_consumption_litres_per_100km

  const route: Route = {
    id: `route-${Date.now()}`,
    corridor_ids: corridorIds,
    waypoints: rawWaypoints,
    total_distance_km: totalDistanceKm,
    estimated_drive_hours: totalDistanceKm / 80,
  }

  // Attach fuel consumption note
  const safeRange = (vehicleProfile.fuel_capacity_liters / consumption) * 100 * 0.85
  void safeRange // used in guardrails — computed here for reference

  // Validate and annotate
  const violations = validateRouteConstraints(route, vehicleProfile)
  if (violations.length > 0) {
    route.waypoints = route.waypoints.map((w) => {
      const v = violations.find((viol) => w.id.startsWith(viol.segment_id))
      return v ? { ...w, note: `⚠ ${v.detail}` } : w
    })
  }

  return route
}

export function buildRouteFromCorridorId(
  corridorId: string,
  vehicleProfile: VehicleProfile
): Route {
  const corridor = CORRIDORS.find((c) => c.id === corridorId)
  if (!corridor) throw new Error(`Corridor ${corridorId} not found`)

  const first = corridor.path_coordinates[0]
  const last = corridor.path_coordinates[corridor.path_coordinates.length - 1]
  return buildRoute(first, last, true, vehicleProfile)
}

export { FUEL_STOPS }
