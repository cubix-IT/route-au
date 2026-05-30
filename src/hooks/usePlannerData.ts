import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useActivities } from '@/hooks/useActivities'
import { supabase } from '@/lib/supabase'
import {
  fetchLivePOIs, fetchWikipediaSummary, fetchRouteFoodStops,
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

// ── Supabase row types ────────────────────────────────────────────────────────

export interface DbActivity {
  activity_id: number
  slug: string
  name: string
  category: string
  emoji: string
  description: string
  duration: string
  cost: string
  kids_ok: boolean
  is_hidden_gem: boolean
  maps_url: string
  tags: string[]
  source: string
}

export interface DbFoodPlace {
  food_place_id: number
  slug: string
  name: string
  category: string
  description: string
  lat: number
  lng: number
  address: string | null
  attributes: Record<string, unknown>
  source: string
}

export interface DbNatureSpot {
  nature_spot_id: number
  slug: string
  name: string
  type: string
  description: string
  lat: number | null
  lng: number | null
  source: string
}

export interface DbAccommodation {
  accommodation_id: number
  slug: string
  name: string
  type: string
  description: string
  lat: number | null
  lng: number | null
  address: string | null
}

// Fetch all content for a sub-destination from Supabase by slug
async function fetchDestinationFromDB(destSlug: string): Promise<{
  activities: DbActivity[]
  food: DbFoodPlace[]
  nature: DbNatureSpot[]
  accommodation: DbAccommodation[]
  wikiSummary: string | null
} | null> {
  if (!supabase) return null

  // Resolve slug → integer sub_dest_id
  const { data: subDest, error: sdErr } = await supabase
    .from('sub_destinations')
    .select('sub_dest_id')
    .eq('slug', destSlug)
    .single()

  if (sdErr || !subDest) return null
  const id = subDest.sub_dest_id

  const [activitiesRes, foodRes, natureRes, accomRes, summaryRes] = await Promise.all([
    supabase
      .from('activities')
      .select('activity_id,slug,name,category,emoji,description,duration,cost,kids_ok,is_hidden_gem,maps_url,tags,source')
      .eq('sub_dest_id', id)
      .limit(200),
    supabase
      .from('food_places')
      .select('food_place_id,slug,name,category,description,lat,lng,address,attributes,source')
      .eq('sub_dest_id', id)
      .limit(200),
    supabase
      .from('nature_spots')
      .select('nature_spot_id,slug,name,type,description,lat,lng,source')
      .eq('sub_dest_id', id)
      .limit(200),
    supabase
      .from('accommodation')
      .select('accommodation_id,slug,name,type,description,lat,lng,address')
      .eq('sub_dest_id', id)
      .limit(100),
    supabase
      .from('destination_summaries')
      .select('wiki_text,ai_summary')
      .eq('sub_dest_id', id)
      .single(),
  ])

  return {
    activities: (activitiesRes.data ?? []) as DbActivity[],
    food: (foodRes.data ?? []) as DbFoodPlace[],
    nature: (natureRes.data ?? []) as DbNatureSpot[],
    accommodation: (accomRes.data ?? []) as DbAccommodation[],
    wikiSummary: summaryRes.data?.wiki_text ?? null,
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

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

  // DB-sourced state (Supabase — primary)
  const [dbActivities, setDbActivities] = useState<DbActivity[]>([])
  const [dbFood, setDbFood] = useState<DbFoodPlace[]>([])
  const [dbNature, setDbNature] = useState<DbNatureSpot[]>([])
  const [dbAccommodation, setDbAccommodation] = useState<DbAccommodation[]>([])
  const [dbLoading, setDbLoading] = useState(false)

  // Legacy live state (Overpass fallback + route food + hazards)
  const [livePOIs, setLivePOIs] = useState<LivePOI[] | null>(null)
  const [wikiSummary, setWikiSummary] = useState<string | null>(null)
  const [routeFood, setRouteFood] = useState<RouteFoodStop[] | null>(null)
  const [hazards, setHazards] = useState<HazardAlert[]>([])

  useEffect(() => {
    if (!destId || !destCoord) return

    const ac = new AbortController()
    const { signal } = ac

    // Reset
    setDbActivities([])
    setDbFood([])
    setDbNature([])
    setDbAccommodation([])
    setLivePOIs(null)
    setWikiSummary(null)
    setDbLoading(true)

    // Primary: fetch everything from Supabase DB (instant, no per-user API cost)
    fetchDestinationFromDB(destId).then((result) => {
      if (signal.aborted) return
      if (result) {
        setDbActivities(result.activities)
        setDbFood(result.food)
        setDbNature(result.nature)
        setDbAccommodation(result.accommodation)
        if (result.wikiSummary) setWikiSummary(result.wikiSummary)
      }
      setDbLoading(false)

      // Fallback: if DB returned nothing (new destination not yet enriched), hit Overpass
      if (!result || result.activities.length === 0) {
        fetchLivePOIs(destId, destCoord.lat, destCoord.lng).then((pois) => {
          if (!signal.aborted) setLivePOIs(pois)
        }).catch(() => { if (!signal.aborted) setLivePOIs([]) })
      }

      // Wiki summary fallback if not in DB
      if (!result?.wikiSummary) {
        fetchWikipediaSummary(destId, destName).then((wiki) => {
          if (!signal.aborted) setWikiSummary(wiki)
        }).catch(() => {})
      }
    }).catch(() => {
      if (signal.aborted) return
      setDbLoading(false)
      // Full fallback to Overpass
      Promise.all([
        fetchLivePOIs(destId, destCoord.lat, destCoord.lng),
        fetchWikipediaSummary(destId, destName),
      ]).then(([pois, wiki]) => {
        if (signal.aborted) return
        setLivePOIs(pois)
        setWikiSummary(wiki)
      }).catch((err) => captureError('usePlannerData', 'fallback', err))
    })

    // Hazards always live (VicEmergency — real-time safety data)
    fetchHazardsNear(destCoord.lat, destCoord.lng)
      .then((alerts) => { if (!signal.aborted) setHazards(alerts) })
      .catch(() => {})

    return () => ac.abort()
  }, [destId, destCoord?.lat, destCoord?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Route food stops (along the drive — still from Overpass, route-based not destination-based)
  useEffect(() => {
    if (!activeItinerary || routeFood !== null) return
    fetchRouteFoodStops(originCoord, destCoord, diningPrefs as DiningPref[])
      .then(setRouteFood)
      .catch((err) => {
        setRouteFood([])
        captureError('usePlannerData', 'fetchRouteFoodStops', err)
      })
  }, [activeItinerary?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Legacy POI filters (Overpass fallback path)
  const foodPOIs = (livePOIs ?? []).filter((p) =>
    ['cafe', 'restaurant', 'pub', 'winery', 'bakery', 'fast_food'].includes(p.type)
  ).slice(0, 20)
  const activityPOIs = (livePOIs ?? []).filter((p) => p.type === 'attraction').slice(0, 12)
  const naturePOIs = (livePOIs ?? []).filter((p) =>
    p.type === 'hiking' || p.type === 'viewpoint'
  ).slice(0, 12)

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

  // Derived counts from DB (used by UI for "X places to eat" etc.)
  // Filter out closed places (business_status stored in attributes.business_status)
  const openFood = dbFood.filter((f) => {
    const status = (f as unknown as { attributes?: { business_status?: string } }).attributes?.business_status
    return !status || status === 'OPERATIONAL'
  })
  const openActivities = dbActivities.filter((a) => {
    const attr = (a as unknown as { attributes?: { business_status?: string } }).attributes
    const status = attr?.business_status
    return !status || status === 'OPERATIONAL'
  })

  const dbFoodCount = openFood.length
  const dbActivityCount = openActivities.length + dbNature.length
  const dbAccomCount = dbAccommodation.length

  // Map DbAccommodation → AccommodationPOI for components that expect the legacy type
  const VALID_ACCOM_TYPES = new Set(['hotel','motel','campsite','caravan_park','hostel','cabin','guest_house'])
  const accommodationPOIs: AccommodationPOI[] = dbAccommodation.map((a) => ({
    id: a.slug,
    type: (VALID_ACCOM_TYPES.has(a.type) ? a.type : 'hotel') as AccommodationPOI['type'],
    name: a.name,
    lat: a.lat ?? undefined,
    lng: a.lng ?? undefined,
    description: a.description || undefined,
  }))

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
    // DB data (primary — fast, comprehensive, closed places filtered)
    dbActivities: openActivities, dbFood: openFood, dbNature, dbAccommodation, accommodationPOIs,
    dbLoading, dbFoodCount, dbActivityCount, dbAccomCount,
    // legacy Overpass (fallback + route food)
    activities, livePOIs, wikiSummary, routeFood,
    foodPOIs, activityPOIs, naturePOIs, hazards,
  }
}
