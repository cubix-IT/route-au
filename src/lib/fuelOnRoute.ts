import type { Coordinate } from '@/types'
import { distanceBetween, distanceToLine } from '@/utils/geo'

// Find the cheapest fuel stations that are genuinely ON the driving route:
// sample the route polyline at intervals, query /api/fuel near each sample,
// then keep only stations within a small corridor of the actual road.
// Replaces the old straight-line-midpoint approach which regularly surfaced
// stations nowhere near the roads the user would drive.

export interface RouteFuelStation {
  id: string
  name: string
  brand: string
  address: string
  lat: number
  lng: number
  priceCents: number
  pricePerLitre: number
  distanceKm: number      // from the API sample point — replaced below with km off-route
  kmFromRoute: number
}

const SAMPLE_EVERY_KM = 35
const MAX_SAMPLES = 8           // caps /api/fuel calls per trip
const ON_ROUTE_KM = 2.5         // strict corridor first…
const RELAXED_KM = 6            // …relaxed if too few results (country towns sit off the highway)

/** Thin a polyline to roughly one point per `everyKm` for fast distance checks. */
function thin(geometry: Coordinate[], everyKm: number): Coordinate[] {
  const out: Coordinate[] = [geometry[0]]
  let acc = 0
  for (let i = 1; i < geometry.length; i++) {
    acc += distanceBetween(geometry[i - 1], geometry[i])
    if (acc >= everyKm) { out.push(geometry[i]); acc = 0 }
  }
  if (out[out.length - 1] !== geometry[geometry.length - 1]) out.push(geometry[geometry.length - 1])
  return out
}

export async function findCheapestOnRoute(
  geometry: Coordinate[],
  fuelType: string,
  brand?: string | null,
  count = 3,
): Promise<RouteFuelStation[]> {
  if (geometry.length < 2 || fuelType === 'Electric') return []

  // Sample points along the route for the radius queries
  let samples = thin(geometry, SAMPLE_EVERY_KM)
  if (samples.length > MAX_SAMPLES) {
    const step = (samples.length - 1) / (MAX_SAMPLES - 1)
    samples = Array.from({ length: MAX_SAMPLES }, (_, i) => samples[Math.round(i * step)])
  }

  const brandQ = brand && brand !== 'Any' ? `&brand=${encodeURIComponent(brand)}` : ''
  const found = new Map<string, RouteFuelStation>()

  await Promise.all(samples.map(async (c) => {
    try {
      const r = await fetch(
        `/api/fuel?lat=${c.lat}&lng=${c.lng}&fuelType=${fuelType}&limit=10&radius=15${brandQ}`,
        { signal: AbortSignal.timeout(10_000) },
      )
      const data = await r.json() as { stations?: RouteFuelStation[] }
      for (const st of data.stations ?? []) if (!found.has(st.id)) found.set(st.id, st)
    } catch { /* one sample failing shouldn't sink the rest */ }
  }))

  if (found.size === 0) return []

  // Keep only stations close to the actual road (thinned line keeps turf fast)
  const line = thin(geometry, 1)
  const withDist = [...found.values()].map(st => ({
    ...st,
    kmFromRoute: Math.round(distanceToLine({ lat: st.lat, lng: st.lng }, line) * 10) / 10,
  }))

  let onRoute = withDist.filter(st => st.kmFromRoute <= ON_ROUTE_KM)
  if (onRoute.length < count) onRoute = withDist.filter(st => st.kmFromRoute <= RELAXED_KM)

  return onRoute
    .sort((a, b) => a.priceCents - b.priceCents)
    .slice(0, count)
}
