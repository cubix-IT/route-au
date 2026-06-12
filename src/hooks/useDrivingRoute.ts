import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { fetchDrivingRoute, routeKeyFor } from '@/lib/osrmRoute'
import type { Coordinate } from '@/types'

/**
 * Real driving route for the current origin/dest pair. Fetched from OSRM once
 * and cached in the store — wizard summary, map and fuel search all share it.
 * Returns null while loading or if OSRM is unreachable (callers keep their
 * straight-line fallbacks).
 */
export function useDrivingRoute(origin: Coordinate | null | undefined, dest: Coordinate | null | undefined) {
  const routeData = useAppStore((s) => s.routeData)
  const key = origin && dest ? routeKeyFor(origin, dest) : null

  useEffect(() => {
    if (!key || !origin || !dest) return
    if (useAppStore.getState().routeData?.key === key) return
    let cancelled = false
    fetchDrivingRoute(origin, dest).then((r) => {
      if (r && !cancelled) useAppStore.getState().setRouteData({ key, ...r })
    })
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return routeData?.key === key ? routeData : null
}
