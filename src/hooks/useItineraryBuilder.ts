import { useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { buildRouteFromCorridorId } from '@/modules/routing'
import { detectNearbyPOIs } from '@/modules/poi'
import { runGuardrailPipeline } from '@/modules/guardrails'
import { validateRouteConstraints } from '@/modules/routing'
import { saveItinerary, savePOIsCache } from '@/store/db'
import type { Itinerary } from '@/types'
import { CORRIDORS } from '@/data/corridors'

export function useItineraryBuilder() {
  const { userProfile, vehicleProfile, selectedCorridorId } = useAppStore()
  const setActiveItinerary = useAppStore((s) => s.setActiveItinerary)
  const setNearbyPOIs = useAppStore((s) => s.setNearbyPOIs)
  const setConstraintViolations = useAppStore((s) => s.setConstraintViolations)

  const buildItinerary = useCallback(
    (startDate: string, tripName?: string) => {
      if (!userProfile || !vehicleProfile) return

      const route = buildRouteFromCorridorId(selectedCorridorId, vehicleProfile)
      const violations = validateRouteConstraints(route, vehicleProfile)
      setConstraintViolations(violations)

      const corridor = CORRIDORS.find((c) => c.id === selectedCorridorId)
      const daysCount = Math.ceil(route.estimated_drive_hours / (userProfile.max_daily_drive_time / 60))

      const days = Array.from({ length: daysCount }, (_, i) => {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const dayWaypoints = route.waypoints.filter((_, wi) => {
          const waypointsPerDay = Math.ceil(route.waypoints.length / daysCount)
          return wi >= i * waypointsPerDay && wi < (i + 1) * waypointsPerDay
        })
        return {
          day_number: i + 1,
          date: date.toISOString().split('T')[0],
          waypoints: dayWaypoints,
          pois: [],
          drive_km: route.total_distance_km / daysCount,
          drive_hours: route.estimated_drive_hours / daysCount,
          warnings: [],
        }
      })

      const baseItinerary: Itinerary = {
        id: `itin-${Date.now()}`,
        name: tripName ?? corridor?.name ?? 'Road Trip',
        start_date: startDate,
        route,
        days,
        all_warnings: [],
      }

      const pois = detectNearbyPOIs(route, userProfile)
      setNearbyPOIs(pois)

      const itinerary = runGuardrailPipeline(baseItinerary, vehicleProfile, userProfile, pois)
      setActiveItinerary(itinerary)

      // Persist to IndexedDB
      saveItinerary(itinerary).catch(console.error)
      savePOIsCache(itinerary.id, pois).catch(console.error)

      return itinerary
    },
    [userProfile, vehicleProfile, selectedCorridorId, setActiveItinerary, setNearbyPOIs, setConstraintViolations]
  )

  return { buildItinerary }
}
