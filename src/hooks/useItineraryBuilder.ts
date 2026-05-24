import { useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { buildRouteFromCorridorId } from '@/modules/routing'
import { detectNearbyPOIs } from '@/modules/poi'
import { runGuardrailPipeline } from '@/modules/guardrails'
import { validateRouteConstraints } from '@/modules/routing'
import { saveItinerary, savePOIsCache } from '@/store/db'
import type { Itinerary, ItineraryDay, DiningPref } from '@/types'
import { CORRIDORS } from '@/data/corridors'
import { buildDaySchedule } from '@/utils/scheduleBuilder'

export function useItineraryBuilder() {
  const { userProfile, vehicleProfile, selectedCorridorId, originName: storeOriginName } = useAppStore()
  const storeDiningPrefs = useAppStore((s) => s.diningPrefs)
  const setActiveItinerary = useAppStore((s) => s.setActiveItinerary)
  const setNearbyPOIs = useAppStore((s) => s.setNearbyPOIs)
  const setConstraintViolations = useAppStore((s) => s.setConstraintViolations)

  const buildItinerary = useCallback(
    (startDate: string, endDate?: string, tripName?: string, diningPrefs?: DiningPref[]) => {
      if (!userProfile || !vehicleProfile) return

      const prefs = diningPrefs ?? storeDiningPrefs
      const route = buildRouteFromCorridorId(selectedCorridorId, vehicleProfile)
      const violations = validateRouteConstraints(route, vehicleProfile)
      setConstraintViolations(violations)

      const corridor = CORRIDORS.find((c) => c.id === selectedCorridorId)
      const maxHoursPerDay = userProfile.max_daily_drive_time / 60

      let daysCount: number
      if (endDate && endDate > startDate) {
        const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
        daysCount = Math.max(1, Math.round(diffMs / 86400000) + 1)
      } else {
        daysCount = Math.max(1, Math.ceil(route.estimated_drive_hours / maxHoursPerDay))
      }

      const originLabel = storeOriginName || 'Origin'

      const allPOIs = detectNearbyPOIs(route, userProfile)
      setNearbyPOIs(allPOIs)

      const poisPerDay = Math.max(1, Math.ceil(allPOIs.length / daysCount))
      const waypointsPerDay = Math.ceil(route.waypoints.length / daysCount)
      const driveKm = route.total_distance_km / daysCount
      const driveHours = route.estimated_drive_hours / daysCount

      const days: ItineraryDay[] = Array.from({ length: daysCount }, (_, i) => {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)

        const dayWaypoints = route.waypoints.filter((_, wi) =>
          wi >= i * waypointsPerDay && wi < (i + 1) * waypointsPerDay
        )
        const dayPOIs = allPOIs.slice(i * poisPerDay, (i + 1) * poisPerDay)
        const dayOriginLabel = i === 0 ? originLabel : dayWaypoints[0]?.label ?? originLabel

        const partialDay = {
          day_number: i + 1,
          date: date.toISOString().split('T')[0],
          waypoints: dayWaypoints,
          pois: dayPOIs,
          drive_km: driveKm,
          drive_hours: driveHours,
          warnings: [],
          schedule: [],
        }

        const schedule = buildDaySchedule(
          partialDay,
          selectedCorridorId,
          dayOriginLabel,
          dayPOIs,
          prefs,
          7,
          i === daysCount - 1,
        )

        return { ...partialDay, schedule }
      })

      const baseItinerary: Itinerary = {
        id: `itin-${Date.now()}`,
        name: tripName ?? corridor?.name ?? 'Road Trip',
        start_date: startDate,
        end_date: endDate ?? undefined,
        total_km: route.total_distance_km,
        total_days: daysCount,
        route,
        days,
        all_warnings: [],
      }

      const itinerary = runGuardrailPipeline(baseItinerary, vehicleProfile, userProfile, allPOIs)
      setActiveItinerary(itinerary)

      saveItinerary(itinerary).catch(console.error)
      savePOIsCache(itinerary.id, allPOIs).catch(console.error)

      return itinerary
    },
    [userProfile, vehicleProfile, selectedCorridorId, storeOriginName, storeDiningPrefs,
     setActiveItinerary, setNearbyPOIs, setConstraintViolations]
  )

  return { buildItinerary }
}
