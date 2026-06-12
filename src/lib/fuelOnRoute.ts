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
  /** 0..1 — how far along the route the station sits */
  routeProgress: number
  /** Human label for where on the trip this stop is */
  legLabel: 'Near start' | 'Midway' | 'Near destination'
  /** True for the single cheapest station across the whole route */
  isCheapestOverall: boolean
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
  // Cumulative distance along the thinned line — for progress calculation
  const cum: number[] = [0]
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + distanceBetween(line[i - 1], line[i]))
  const totalKm = cum[cum.length - 1] || 1

  const withDist = [...found.values()].map(st => {
    // Nearest line vertex ≈ position along route (1km resolution is plenty)
    let best = 0, bestD = Infinity
    for (let i = 0; i < line.length; i++) {
      const d = distanceBetween({ lat: st.lat, lng: st.lng }, line[i])
      if (d < bestD) { bestD = d; best = i }
    }
    const routeProgress = cum[best] / totalKm
    return {
      ...st,
      kmFromRoute: Math.round(distanceToLine({ lat: st.lat, lng: st.lng }, line) * 10) / 10,
      routeProgress,
      legLabel: (routeProgress < 0.33 ? 'Near start' : routeProgress < 0.7 ? 'Midway' : 'Near destination') as RouteFuelStation['legLabel'],
      isCheapestOverall: false,
    }
  })

  let onRoute = withDist.filter(st => st.kmFromRoute <= ON_ROUTE_KM)
  if (onRoute.length < count) onRoute = withDist.filter(st => st.kmFromRoute <= RELAXED_KM)
  if (onRoute.length === 0) return []

  // Spread the picks along the trip instead of pure price ranking — cheapest
  // stations cluster in the metro end of a route (e.g. every pick in Thomastown
  // for Melbourne → Yarra Glen), which is useless for the drive home.
  // Take the cheapest within each leg (start / mid / destination), then flag
  // the overall cheapest.
  const byPrice = [...onRoute].sort((a, b) => a.priceCents - b.priceCents)
  const legs: RouteFuelStation['legLabel'][] = ['Near start', 'Midway', 'Near destination']
  const picks: RouteFuelStation[] = []
  for (const leg of legs) {
    const cheapestInLeg = byPrice.find(st => st.legLabel === leg && !picks.includes(st))
    if (cheapestInLeg) picks.push(cheapestInLeg)
  }
  // Short routes may have empty legs — top up with the next cheapest overall
  for (const st of byPrice) {
    if (picks.length >= count) break
    if (!picks.includes(st)) picks.push(st)
  }

  const cheapest = byPrice[0]
  for (const p of picks) p.isCheapestOverall = p.id === cheapest.id

  // Present in trip order: start → destination
  return picks.slice(0, count).sort((a, b) => a.routeProgress - b.routeProgress)
}
