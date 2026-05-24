import { POIS } from '@/data/pois'
import type { Route, ScoredPOI, UserProfile } from '@/types'
import { buildRouteBoundingBox, distanceToLine, isPointInPolygon } from '@/utils/geo'
import { scorePoiVibe } from './vibeScorer'

export function detectNearbyPOIs(
  route: Route,
  userProfile: UserProfile,
  radiusKm = 30
): ScoredPOI[] {
  const allCoords = route.waypoints.map((w) => w.coord)
  if (allCoords.length < 2) return []

  const buffer = buildRouteBoundingBox(allCoords, radiusKm)
  if (!buffer) return []

  const nearby: ScoredPOI[] = []

  for (const poi of POIS) {
    if (!isPointInPolygon(poi.coord, buffer)) continue

    const distance_from_route_km = distanceToLine(poi.coord, allCoords)
    const vibe_score = scorePoiVibe(poi, userProfile)
    const detour_km = distance_from_route_km * 2

    nearby.push({
      ...poi,
      vibe_score,
      distance_from_route_km,
      detour_km,
    })
  }

  return nearby
    .sort((a, b) => b.vibe_score - a.vibe_score || a.distance_from_route_km - b.distance_from_route_km)
    .slice(0, 20)
}
