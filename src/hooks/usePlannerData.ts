import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useActivities } from '@/hooks/useActivities'
import {
  fetchLivePOIs, fetchWikipediaSummary, fetchRouteFoodStops, fetchAccommodationNear,
  type LivePOI, type RouteFoodStop, type AccommodationPOI,
} from '@/lib/overpass'
import { fetchHazardsNear, type HazardAlert } from '@/lib/vicEmergency'
import { captureError } from '@/lib/bugLogger'
import type { DiningPref, FuelType } from '@/types'
import { getCurrentSeason, SEASON_META } from '@/utils/season'
import { FOOD_DRINK, type FoodDrinkPOI } from '@/data/foodDrink'
import { distanceBetween } from '@/utils/geo'

const FUEL_PRICE_PER_L: Record<FuelType, number> = {
  Unleaded95: 1.98,
  Unleaded98: 2.12,
  Diesel: 1.88,
  Electric: 0,
}
const EV_COST_PER_KWH = 0.30

export function calcFuelCost(
  totalKm: number,
  fuelType: FuelType,
  consumptionL100: number,
  evWhPerKm: number | undefined,
  isTowing: boolean,
): string {
  const adjKm = totalKm * (isTowing ? 1.3 : 1)
  if (fuelType === 'Electric') {
    const cost = (adjKm * (evWhPerKm ?? 200) / 1000) * EV_COST_PER_KWH
    return `~$${Math.round(cost)} charge`
  }
  const litres = (adjKm / 100) * consumptionL100
  const cost = litres * (FUEL_PRICE_PER_L[fuelType] ?? 1.98)
  return `~$${Math.round(cost)} fuel`
}

export function usePlannerData() {
  const destId = useAppStore((s) => s.destId)
  const destName = useAppStore((s) => s.destName)
  const destCoord = useAppStore((s) => s.destCoord)
  const originName = useAppStore((s) => s.originName)
  const originCoord = useAppStore((s) => s.originCoord)
  const diningPrefs = useAppStore((s) => s.diningPrefs)
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const vehicleProfile = useAppStore((s) => s.vehicleProfile)
  const userProfile = useAppStore((s) => s.userProfile)
  const departureHour = useAppStore((s) => s.departureHour)
  const addedDiningStops = useAppStore((s) => s.addedDiningStops)
  const removeDiningStop = useAppStore((s) => s.removeDiningStop)
  const addDiningStop = useAppStore((s) => s.addDiningStop)
  const addedActivities = useAppStore((s) => s.addedActivities)
  const addActivity = useAppStore((s) => s.addActivity)
  const removeActivity = useAppStore((s) => s.removeActivity)

  const { activities } = useActivities(destId)
  const [livePOIs, setLivePOIs] = useState<LivePOI[] | null>(null)
  const [wikiSummary, setWikiSummary] = useState<string | null>(null)
  const [routeFood, setRouteFood] = useState<RouteFoodStop[] | null>(null)
  const [hazards, setHazards] = useState<HazardAlert[]>([])
  const [accommodationPOIs, setAccommodationPOIs] = useState<AccommodationPOI[] | null>(null)

  useEffect(() => {
    if (!destCoord) return

    // AbortController guards against stale promise callbacks when destId changes
    const ac = new AbortController()
    const { signal } = ac

    setLivePOIs(null)
    setWikiSummary(null)
    setAccommodationPOIs(null)

    Promise.all([
      fetchLivePOIs(destId, destCoord.lat, destCoord.lng),
      fetchWikipediaSummary(destId, destName),
      fetchHazardsNear(destCoord.lat, destCoord.lng),
    ]).then(([pois, wiki, alerts]) => {
      if (signal.aborted) return
      setLivePOIs(pois)
      setWikiSummary(wiki)
      setHazards(alerts)
    }).catch((err) => {
      if (signal.aborted) return
      setLivePOIs([])
      captureError('usePlannerData', 'fetchLivePOIs+wiki+hazards', err)
    })

    // Accommodation loads independently — has its own stale-check
    fetchAccommodationNear(destId, destCoord.lat, destCoord.lng)
      .then((pois) => { if (!signal.aborted) setAccommodationPOIs(pois) })
      .catch((err) => {
        if (signal.aborted) return
        setAccommodationPOIs([])
        captureError('usePlannerData', 'fetchAccommodationNear', err)
      })

    return () => ac.abort()
  }, [destId, destCoord?.lat, destCoord?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeItinerary || routeFood !== null) return
    fetchRouteFoodStops(originCoord, destCoord, diningPrefs as DiningPref[])
      .then(setRouteFood)
      .catch((err) => {
        setRouteFood([])
        captureError('usePlannerData', 'fetchRouteFoodStops', err)
      })
  }, [activeItinerary?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const shortDest = destName.split(',')[0].split('&')[0].trim()
  const shortOrigin = originName.split(',')[0]
  const totalKm = Math.round(activeItinerary?.total_km ?? 0)
  const driveHours = Math.round((activeItinerary?.route.estimated_drive_hours ?? 0) * 10) / 10

  const fuelCost = vehicleProfile && activeItinerary
    ? calcFuelCost(
        totalKm,
        vehicleProfile.fuel_type,
        vehicleProfile.fuel_consumption_litres_per_100km,
        vehicleProfile.ev_consumption_wh_per_km,
        vehicleProfile.is_towing,
      )
    : null

  const season = getCurrentSeason()
  const seasonMeta = SEASON_META[season]

  const foodPOIs = (livePOIs ?? []).filter((p) =>
    ['cafe', 'restaurant', 'pub', 'winery', 'bakery', 'fast_food'].includes(p.type)
  ).slice(0, 20)

  // Activities = human-made attractions (museums, parks, farms, zoos…)
  const activityPOIs = (livePOIs ?? []).filter((p) => p.type === 'attraction').slice(0, 12)

  // Nature = outdoor/natural experiences (hikes, viewpoints, beaches, national parks…)
  const naturePOIs = (livePOIs ?? []).filter((p) =>
    p.type === 'hiking' || p.type === 'viewpoint'
  ).slice(0, 12)

  const curatedDining = useMemo((): FoodDrinkPOI[] => {
    if (!destCoord) return []
    return FOOD_DRINK
      .map((f) => ({ f, km: distanceBetween(destCoord, f.coord) }))
      .filter(({ km }) => km <= 25)
      .sort((a, b) => a.km - b.km)
      .slice(0, 5)
      .map(({ f }) => f)
  }, [destCoord?.lat, destCoord?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const dayLabel = (activeItinerary?.total_days ?? 1) > 1
    ? `${activeItinerary!.total_days}-Day Escape`
    : 'Day Escape'

  return {
    // store state
    destId, destName, shortDest, shortOrigin,
    activeItinerary, vehicleProfile, userProfile, departureHour,
    addedDiningStops, removeDiningStop, addDiningStop,
    addedActivities, addActivity, removeActivity,
    curatedDining,
    // computed
    totalKm, driveHours, fuelCost, dayLabel,
    season, seasonMeta,
    // fetched
    activities, livePOIs, wikiSummary, routeFood,
    foodPOIs, activityPOIs, naturePOIs, hazards, accommodationPOIs,
  }
}
