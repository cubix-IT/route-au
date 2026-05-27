import { useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { buildRoute } from '@/modules/routing'
import { detectNearbyPOIs } from '@/modules/poi'
import { runGuardrailPipeline } from '@/modules/guardrails'
import { validateRouteConstraints } from '@/modules/routing'
import { saveItinerary, savePOIsCache } from '@/store/db'
import type { Itinerary, ItineraryDay, DiningPref } from '@/types'
import { buildDaySchedule } from '@/utils/scheduleBuilder'

export function useItineraryBuilder() {
  const setActiveItinerary = useAppStore((s) => s.setActiveItinerary)
  const setNearbyPOIs = useAppStore((s) => s.setNearbyPOIs)
  const setConstraintViolations = useAppStore((s) => s.setConstraintViolations)

  const buildItinerary = useCallback(
    (startDate: string, endDate?: string, tripName?: string, diningPrefs?: DiningPref[]) => {
      // Always read fresh state — avoids stale closure when called right after setUserProfile
      const {
        userProfile, vehicleProfile,
        originCoord, destCoord,
        tripType,
        originName: storeOriginName, destName: storeDestName,
        destId: storeDestId,
        diningPrefs: storeDiningPrefs,
        departureHour: storeDepartureHour,
      } = useAppStore.getState()

      if (!userProfile || !vehicleProfile) {
        console.warn('[RouteAU] buildItinerary called before profiles were set')
        return
      }

      const prefs = diningPrefs ?? storeDiningPrefs
      const route = buildRoute(originCoord, destCoord, true, vehicleProfile)

      // Fix waypoint labels to use real place names instead of generic Start/End
      const destLabel = storeDestName || 'Destination'
      const originLabel = storeOriginName || 'Origin'
      if (route.waypoints.length >= 1) route.waypoints[0].label = originLabel
      if (route.waypoints.length >= 2) route.waypoints[route.waypoints.length - 1].label = destLabel

      const violations = validateRouteConstraints(route, vehicleProfile)
      setConstraintViolations(violations)

      const maxHoursPerDay = userProfile.max_daily_drive_time / 60

      let daysCount: number
      if (tripType === 'day') {
        daysCount = 1
      } else if (endDate && endDate > startDate) {
        const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
        daysCount = Math.max(1, Math.round(diffMs / 86400000) + 1)
      } else {
        daysCount = Math.max(1, Math.ceil(route.estimated_drive_hours / maxHoursPerDay))
      }
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
          route.corridor_ids[0] ?? '',
          storeDestId,
          dayOriginLabel,
          dayPOIs,
          prefs,
          storeDepartureHour ?? (userProfile.has_kids ? 8 : 7),
          i === daysCount - 1,
          userProfile.has_kids,
          tripType === 'day',
        )

        return { ...partialDay, schedule }
      })

      const baseItinerary: Itinerary = {
        id: `itin-${Date.now()}`,
        name: tripName ?? 'Weekend Escape',
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
    [setActiveItinerary, setNearbyPOIs, setConstraintViolations]
  )

  return { buildItinerary }
}
