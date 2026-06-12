import { useEffect, useReducer } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { fetchDrivingRoute, routeKeyFor } from '@/lib/osrmRoute'
import type { Coordinate } from '@/types'

// Keys whose OSRM fetch failed this session — lets consumers distinguish
// "still loading" (wait, don't render a fallback) from "failed" (fall back).
const failedKeys = new Set<string>()

export interface DrivingRouteState {
  /** The route, once loaded (null while loading or after failure) */
  route: { key: string; geometry: Coordinate[]; distanceKm: number; durationHours: number } | null
  /** True while the OSRM fetch is in flight — consumers should wait, not fall back */
  loading: boolean
  /** True when OSRM was unreachable for this trip — fallbacks are appropriate */
  failed: boolean
}

/**
 * Real driving route for the current origin/dest pair. Fetched from OSRM once
 * and cached in the store — wizard summary, map and fuel search all share it.
 */
export function useDrivingRoute(origin: Coordinate | null | undefined, dest: Coordinate | null | undefined): DrivingRouteState {
  const routeData = useAppStore((s) => s.routeData)
  const [, bump] = useReducer((x: number) => x + 1, 0)
  const key = origin && dest ? routeKeyFor(origin, dest) : null

  useEffect(() => {
    if (!key || !origin || !dest) return
    if (useAppStore.getState().routeData?.key === key || failedKeys.has(key)) return
    let cancelled = false
    fetchDrivingRoute(origin, dest).then((r) => {
      if (cancelled) return
      if (r) {
        useAppStore.getState().setRouteData({ key, ...r })
      } else {
        failedKeys.add(key)
        bump() // re-render consumers so they can react to the failure
      }
    })
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const route = key && routeData?.key === key ? routeData : null
  const failed = !!key && failedKeys.has(key)
  return { route, failed, loading: !!key && !route && !failed }
}
