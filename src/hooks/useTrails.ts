import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Trail {
  id: string
  slug: string
  name: string
  type: 'walk' | 'cycle' | 'mtb'
  distance_km: number
  region: string
  kml_url: string
  waypoints: { name: string; description: string; lat: number; lng: number }[]
  route_coords: [number, number][]
}

// Returns trails near a destination coord, filtered by type based on user vibes
export function useTrails(
  destCoord: { lat: number; lng: number } | null,
  vibes: string[],
) {
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(false)

  const wantsHiking  = vibes.includes('Hiking')
  const wantsCycling = vibes.includes('Cycling')

  useEffect(() => {
    if (!destCoord || !supabase) { setTrails([]); return }

    // Compute types inside effect to avoid stale closure
    const types = (wantsHiking || wantsCycling)
      ? [
          ...(wantsHiking  ? ['walk'] : []),
          ...(wantsCycling ? ['cycle', 'mtb'] : []),
        ]
      : ['walk', 'cycle', 'mtb']

    setLoading(true)

    supabase
      .from('trails')
      .select('id, slug, name, type, distance_km, region, kml_url, waypoints, route_coords')
      .in('type', types)
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return }

        // Score by proximity — find the trail's nearest waypoint to the destination
        const scored = data.map((t) => {
          const wps = (t.waypoints as Trail['waypoints']) ?? []
          let minDist = Infinity
          for (const wp of wps) {
            const d = Math.sqrt((wp.lat - destCoord.lat) ** 2 + (wp.lng - destCoord.lng) ** 2)
            if (d < minDist) minDist = d
          }
          // Also check route coords for a rough bbox match
          const rc = (t.route_coords as [number, number][]) ?? []
          const step = Math.max(1, Math.floor(rc.length / 50))
          for (let ri = 0; ri < rc.length; ri += step) {
            const [lng, lat] = rc[ri]
            const d = Math.sqrt((lat - destCoord.lat) ** 2 + (lng - destCoord.lng) ** 2)
            if (d < minDist) minDist = d
          }
          return { trail: t as Trail, minDist }
        })

        // Keep trails within ~0.5 degrees (~55km) and sort by proximity
        const nearby = scored
          .filter(({ minDist }) => minDist < 0.5)
          .sort((a, b) => a.minDist - b.minDist)
          .slice(0, 5)
          .map(({ trail }) => trail)

        setTrails(nearby)
        setLoading(false)
      })
  }, [destCoord?.lat, destCoord?.lng, wantsHiking, wantsCycling]) // eslint-disable-line react-hooks/exhaustive-deps

  return { trails, loading }
}
