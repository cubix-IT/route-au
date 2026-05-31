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
  Unleaded91: 1.82,
  E10: 1.85,
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
  attributes: Record<string, unknown>
  lat: number | null
  lng: number | null
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

// Fetch all content for a sub-destination from Supabase
// Activities + nature queried by lat/lng bounding box (not sub_dest_id) so nearby
// attractions show regardless of which destination's enrichment created the record.
async function fetchDestinationFromDB(
  destSlug: string,
  destCoord?: { lat: number; lng: number },
): Promise<{
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
    .select('sub_dest_id,lat,lng')
    .eq('slug', destSlug)
    .single()

  if (sdErr || !subDest) return null
  const id = subDest.sub_dest_id

  // Use destCoord if provided, otherwise fall back to sub_dest lat/lng
  const cLat = destCoord?.lat ?? (subDest as any).lat
  const cLng = destCoord?.lng ?? (subDest as any).lng

  // ~15km bounding box in degrees
  const DELTA = 0.14
  const latMin = cLat - DELTA, latMax = cLat + DELTA
  const lngMin = cLng - DELTA, lngMax = cLng + DELTA

  const [activitiesRes, foodRes, natureRes, accomRes, summaryRes] = await Promise.all([
    // Activities: query by bounding box when lat/lng available, else fall back to sub_dest_id
    (cLat && cLng
      ? supabase
          .from('activities')
          .select('activity_id,slug,name,category,emoji,description,duration,cost,kids_ok,is_hidden_gem,maps_url,tags,source,attributes,lat,lng')
          .gte('lat', latMin).lte('lat', latMax)
          .gte('lng', lngMin).lte('lng', lngMax)
          .limit(200)
      : supabase
          .from('activities')
          .select('activity_id,slug,name,category,emoji,description,duration,cost,kids_ok,is_hidden_gem,maps_url,tags,source,attributes,lat,lng')
          .eq('sub_dest_id', id)
          .limit(200)
    ),
    supabase
      .from('food_places')
      .select('food_place_id,slug,name,category,description,lat,lng,address,attributes,source')
      .eq('sub_dest_id', id)
      .limit(200),
    // Nature spots: same bounding box approach
    (cLat && cLng
      ? supabase
          .from('nature_spots')
          .select('nature_spot_id,slug,name,type,description,lat,lng,source')
          .gte('lat', latMin).lte('lat', latMax)
          .gte('lng', lngMin).lte('lng', lngMax)
          .limit(200)
      : supabase
          .from('nature_spots')
          .select('nature_spot_id,slug,name,type,description,lat,lng,source')
          .eq('sub_dest_id', id)
          .limit(200)
    ),
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
    fetchDestinationFromDB(destId, destCoord ?? undefined).then((result) => {
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

  // Categories that are experiences, not food venues — excluded from Eat & Drink
  const NON_FOOD_CATS = new Set([
    'spa', 'wellness', 'beauty_salon', 'beauty', 'gym', 'fitness',
    'market', 'markets', 'farmers_market', 'flea_market', 'night_market',
    'shopping_mall', 'department_store', 'supermarket',
  ])

  // Filter closed places, deduplicate by name (keep highest-rated), sort rated first
  const openFood = (() => {
    const byStatus = dbFood.filter((f) => {
      const status = (f as unknown as { attributes?: { business_status?: string } }).attributes?.business_status
      if (status && status !== 'OPERATIONAL') return false
      if (NON_FOOD_CATS.has(f.category.toLowerCase())) return false
      // Catch markets by name regardless of category (e.g. "Daylesford Sunday Market")
      if (/\bmarkets?\b/i.test(f.name)) return false
      if (/\b(spa|wellness|bathhouse|hot\s*spring|retreat|ryokan|onsen)\b/i.test(f.name)) return false
      return true
    })
    // Deduplicate: keep highest-rated entry per name
    const seen = new Map<string, typeof byStatus[0]>()
    for (const f of byStatus) {
      const key = f.name.toLowerCase().trim()
      const prev = seen.get(key)
      if (!prev) { seen.set(key, f); continue }
      const prevRating = ((prev.attributes as Record<string, unknown>)?.rating as number | undefined) ?? 0
      const fRating = ((f.attributes as Record<string, unknown>)?.rating as number | undefined) ?? 0
      if (fRating > prevRating) seen.set(key, f)
    }
    const deduped = [...seen.values()]
    // Sort: rated (with reviews) first, descending by rating; unrated sink to bottom
    deduped.sort((a, b) => {
      const aAttr = (a.attributes as Record<string, unknown>) ?? {}
      const bAttr = (b.attributes as Record<string, unknown>) ?? {}
      const aR = (aAttr.rating as number | undefined) ?? 0
      const bR = (bAttr.rating as number | undefined) ?? 0
      const aCount = (aAttr.review_count as number | undefined) ?? 0
      const bCount = (bAttr.review_count as number | undefined) ?? 0
      // Treat as rated only if has reviews
      const aRated = aR > 0 && aCount > 0 ? 1 : 0
      const bRated = bR > 0 && bCount > 0 ? 1 : 0
      if (aRated !== bRated) return bRated - aRated
      return bR - aR
    })
    return deduped
  })()
  // Coordinate-only maps URL pattern — these are OSM nodes with no real place page
  const COORD_ONLY_URL = /query=-?\d+\.\d+,-?\d+\.\d+/

  // Generic low-value names from OSM / unrated Google Places
  const JUNK_ACT_PATTERN = /^(corni|unnamed|track\b|path\b|trail\b|road\b|street\b|lane\b|reserve\b|locality\b|area\b|\d+\s)/i

  const openActivities = (() => {
    const byStatus = dbActivities.filter((a) => {
      const attr = (a as unknown as { attributes?: Record<string, unknown> }).attributes ?? {}
      if ((attr.business_status as string | undefined) && attr.business_status !== 'OPERATIONAL') return false
      // Drop coordinate-only maps links
      if (a.maps_url && COORD_ONLY_URL.test(a.maps_url) && !a.maps_url.includes('place_id')) return false
      // Drop junk names
      if (!a.name || a.name.trim().length < 3) return false
      if (JUNK_ACT_PATTERN.test(a.name.trim())) return false
      // If activity has rating stored in attributes, enforce minimum quality
      const rating = attr.rating as number | undefined
      const reviewCount = attr.review_count as number | undefined
      if (rating !== undefined && reviewCount !== undefined) {
        if (rating < 4.0 || reviewCount < 50) return false
      }
      return true
    })
    const seen = new Set<string>()
    return byStatus.filter((a) => {
      const key = a.name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  // Nature spots: remove OSM junk and low-credibility entries
  const NATURE_JUNK = /^(road verge|road side|roadside|verge|track|path|footpath|cycleway|footway|bridleway|unnamed|way|lane|street|road|avenue|drive|court|close|place|highway|route|service road|access road|fire track|fire road|fire trail|dirt road|gravel road|unsealed road|walking track|walking path|shared path|nature strip|median strip|drain|channel|creek crossing|culvert|bridge|roundabout|intersection|junction|node|area|region|zone|locality|suburb|township|settlement|precinct|\d+)$/i
  const uniqueNature = (() => {
    const seen = new Set<string>()
    return dbNature.filter((n) => {
      const name = n.name.trim()
      // Must have a real name (not just a number, single word generic, or < 3 chars)
      if (name.length < 3) return false
      if (NATURE_JUNK.test(name)) return false
      // Must have a meaningful description or at least a proper noun-ish name
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  const dbFoodCount = openFood.length
  const dbActivityCount = openActivities.length + uniqueNature.length
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
    dbActivities: openActivities, dbFood: openFood, dbNature: uniqueNature, dbAccommodation, accommodationPOIs,
    dbLoading, dbFoodCount, dbActivityCount, dbAccomCount,
    // legacy Overpass (fallback + route food)
    activities, livePOIs, wikiSummary, routeFood,
    foodPOIs, activityPOIs, naturePOIs, hazards,
  }
}
