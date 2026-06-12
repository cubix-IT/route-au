import type { Coordinate } from '@/types'

// Real driving route via OSRM (free public server, same one used for the
// drive-time matrix in osrmTable.ts). Replaces the straight-line × 1.3
// estimates from corridorRouter for distance/duration, and provides the
// polyline used to find fuel that's genuinely on the route.

const OSRM_ROUTE = 'https://router.project-osrm.org/route/v1/driving'

export interface DrivingRoute {
  geometry: Coordinate[]
  distanceKm: number
  durationHours: number
}

export function routeKeyFor(origin: Coordinate, dest: Coordinate): string {
  return `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}|${dest.lat.toFixed(4)},${dest.lng.toFixed(4)}`
}

export async function fetchDrivingRoute(origin: Coordinate, dest: Coordinate): Promise<DrivingRoute | null> {
  try {
    const url = `${OSRM_ROUTE}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=false&steps=false`
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const json = await res.json() as {
      code: string
      routes?: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }>
    }
    const route = json.routes?.[0]
    if (json.code !== 'Ok' || !route || route.geometry.coordinates.length < 2) return null
    return {
      geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceKm: Math.round(route.distance / 100) / 10,
      durationHours: Math.round((route.duration / 3600) * 10) / 10,
    }
  } catch {
    return null // offline / OSRM down — callers fall back to estimates
  }
}
