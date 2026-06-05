import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import {
  fetchLivePOIs, fetchWikipediaSummary,
  type LivePOI, type AccommodationPOI,
} from '@/lib/overpass'
import { fetchHazardsNear, type HazardAlert } from '@/lib/vicEmergency'
import { captureError } from '@/lib/bugLogger'
import { fetchDriveTimes } from '@/lib/osrmTable'
import type { FuelType } from '@/types'
import { getCurrentSeason, SEASON_META } from '@/utils/season'

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
  description: string | null
  lat: number
  lng: number
  address: string | null
  attributes: Record<string, unknown>
  source: string
  website: string | null
  phone: string | null
  opening_hours: string | null
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
  attributes: Record<string, unknown>
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
  website: string | null
  phone: string | null
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

  // Bounding box size:
  // - Urban Melbourne (within 0.5° of CBD): 0.08° ≈ 8km — prevents St Kilda showing MCG etc.
  // - Regional Victoria: 0.23° ≈ 25km — wide enough to catch nearby attractions
  const MELB_CBD_LAT = -37.814, MELB_CBD_LNG = 144.963
  const distFromCBD = Math.abs(cLat - MELB_CBD_LAT) + Math.abs(cLng - MELB_CBD_LNG)
  const DELTA = distFromCBD < 0.5 ? 0.08 : 0.23
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
    // Food: bounding box so bakeries/restaurants enriched under nearby sub_dests still show
    (cLat && cLng
      ? supabase
          .from('food_places')
          .select('food_place_id,slug,name,category,description,lat,lng,address,attributes,source,website,phone,opening_hours')
          .gte('lat', latMin).lte('lat', latMax)
          .gte('lng', lngMin).lte('lng', lngMax)
          .limit(200)
      : supabase
          .from('food_places')
          .select('food_place_id,slug,name,category,description,lat,lng,address,attributes,source,website,phone,opening_hours')
          .eq('sub_dest_id', id)
          .limit(200)
    ),
    // Nature spots: same bounding box approach
    (cLat && cLng
      ? supabase
          .from('nature_spots')
          .select('nature_spot_id,slug,name,type,description,lat,lng,source,attributes')
          .gte('lat', latMin).lte('lat', latMax)
          .gte('lng', lngMin).lte('lng', lngMax)
          .limit(200)
      : supabase
          .from('nature_spots')
          .select('nature_spot_id,slug,name,type,description,lat,lng,source,attributes')
          .eq('sub_dest_id', id)
          .limit(200)
    ),
    // Accommodation: bounding box consistent with activities/food
    (cLat && cLng
      ? supabase
          .from('accommodation')
          .select('accommodation_id,slug,name,type,description,lat,lng,address,website,phone')
          .gte('lat', latMin).lte('lat', latMax)
          .gte('lng', lngMin).lte('lng', lngMax)
          .limit(100)
      : supabase
          .from('accommodation')
          .select('accommodation_id,slug,name,type,description,lat,lng,address,website,phone')
          .eq('sub_dest_id', id)
          .limit(100)
    ),
    supabase
      .from('destination_summaries')
      .select('wiki_text,ai_summary')
      .eq('sub_dest_id', id)
      .single(),
  ])

  const byQuality = (a: { attributes: Record<string,unknown> }, b: { attributes: Record<string,unknown> }) =>
    (((b.attributes?.quality_score as number) ?? 0) - ((a.attributes?.quality_score as number) ?? 0))

  return {
    activities: ([...(activitiesRes.data ?? [])] as DbActivity[]).sort(byQuality),
    food: ([...(foodRes.data ?? [])] as DbFoodPlace[]).sort(byQuality),
    nature: ([...(natureRes.data ?? [])] as DbNatureSpot[]).sort(byQuality),
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

  // DB-sourced state (Supabase — primary)
  const [dbActivities, setDbActivities] = useState<DbActivity[]>([])
  const [dbNature, setDbNature] = useState<DbNatureSpot[]>([])
  const [dbFood, setDbFood] = useState<DbFoodPlace[]>([])
  const [dbAccommodation, setDbAccommodation] = useState<DbAccommodation[]>([])
  const [dbLoading, setDbLoading] = useState(false)

  // Drive times from destCoord to each POI (slug → minutes), populated async after main fetch
  const [driveMinutes, setDriveMinutes] = useState<Map<string, number>>(new Map())

  // Legacy live state (Overpass fallback + hazards)
  const [livePOIs, setLivePOIs] = useState<LivePOI[] | null>(null)
  const [wikiSummary, setWikiSummary] = useState<string | null>(null)
  const [hazards, setHazards] = useState<HazardAlert[]>([])

  useEffect(() => {
    if (!destId || !destCoord) return

    const ac = new AbortController()
    const { signal } = ac

    // Reset
    setDbActivities([])
    setDbNature([])
    setDbFood([])
    setDbAccommodation([])
    setDriveMinutes(new Map())
    setLivePOIs(null)
    setWikiSummary(null)
    setDbLoading(true)

    // Primary: fetch everything from Supabase DB (instant, no per-user API cost)
    fetchDestinationFromDB(destId, destCoord ?? undefined).then((result) => {
      if (signal.aborted) return
      if (result) {
        console.log('[usePlannerData] food:', result.food.length, 'accom:', result.accommodation.length, 'activities:', result.activities.length)
        setDbActivities(result.activities)
        setDbNature(result.nature)
        setDbFood(result.food)
        setDbAccommodation(result.accommodation)
        if (result.wikiSummary) setWikiSummary(result.wikiSummary)

        // Async: compute drive times from destCoord to all POIs (OSRM table — one request)
        // Used to filter far-away POIs (>45 min) and annotate cards with distance
        const allPois = [
          ...result.activities.filter(a => a.lat && a.lng).map(a => ({ slug: a.slug, lat: a.lat!, lng: a.lng! })),
          ...result.food.filter(f => f.lat && f.lng).map(f => ({ slug: f.slug, lat: f.lat!, lng: f.lng! })),
          ...result.nature.filter(n => n.lat && n.lng).map(n => ({ slug: n.slug, lat: n.lat!, lng: n.lng! })),
        ]
        if (allPois.length > 0 && destCoord) {
          fetchDriveTimes(destCoord, allPois).then((times) => {
            if (signal.aborted) return
            const map = new Map<string, number>()
            allPois.forEach((p, i) => { if (times[i] != null) map.set(p.slug, times[i]!) })
            setDriveMinutes(map)
          }).catch(() => {}) // non-critical — falls back to showing everything
        }
      } else {
        console.warn('[usePlannerData] fetchDestinationFromDB returned null for', destId)
      }
      setDbLoading(false)

      // Always fetch live POIs for drink venues (wineries/breweries) — not in Supabase enrichment
      fetchLivePOIs(destId, destCoord.lat, destCoord.lng).then((pois) => {
        if (!signal.aborted) setLivePOIs(pois)
      }).catch(() => { if (!signal.aborted) setLivePOIs([]) })

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

  // Legacy POI filters (Overpass fallback path)
  const activityPOIs = (livePOIs ?? []).filter((p) => p.type === 'attraction').slice(0, 12)
  const naturePOIs = (livePOIs ?? []).filter((p) =>
    p.type === 'hiking' || p.type === 'viewpoint'
  ).slice(0, 12)

  const shortDest = destName.split(',')[0].split('&')[0].trim()
  const shortOrigin = originName.split(',')[0]
  const totalKm = Math.round(activeItinerary?.total_km ?? 0)
  const driveHours = Math.round((activeItinerary?.route?.estimated_drive_hours ?? 0) * 10) / 10

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

  const dayLabel = (activeItinerary?.total_days ?? 1) > 1
    ? `${activeItinerary!.total_days}-Day Escape`
    : 'Day Escape'

  // Coordinate-only maps URL pattern — these are OSM nodes with no real place page
  const COORD_ONLY_URL = /query=-?\d+\.\d+,-?\d+\.\d+/

  // Generic low-value names from OSM / unrated Google Places
  const JUNK_ACT_PATTERN = /^(corni|unnamed|track\b|path\b|trail\b|road\b|street\b|lane\b|reserve\b|locality\b|area\b|\d+\s)/i

  // Descriptions masquerading as venue names (OSM tags, event blurbs, etc.)
  const JUNK_PHRASE_PATTERN = /\bat dusk\b|\bat dawn\b|\bat night\b|\bviewing area\b|\bwombats?\s+(at|near)\b/i

  const DRINK_ACTIVITY_CATS = new Set(['winery', 'brewery', 'distillery', 'pub', 'bar', 'wine', 'wine_cellar', 'drink', 'food', 'restaurant', 'cafe', 'bakery'])

  const openActivities = useMemo(() => {
    const byStatus = dbActivities.filter((a) => {
      const attr = (a as unknown as { attributes?: Record<string, unknown> }).attributes ?? {}
      if ((attr.business_status as string | undefined) && attr.business_status !== 'OPERATIONAL') return false
      if (a.maps_url && COORD_ONLY_URL.test(a.maps_url) && !a.maps_url.includes('place_id')) return false
      if (!a.name || a.name.trim().length < 3) return false
      if (JUNK_ACT_PATTERN.test(a.name.trim())) return false
      if (JUNK_PHRASE_PATTERN.test(a.name)) return false
      if (DRINK_ACTIVITY_CATS.has(a.category.toLowerCase())) return false  // food/drink lives in Food & Drinks tab
      return true
    })
    const seen = new Set<string>()
    return byStatus.map((a) => {
      // OSM place nodes named after the destination itself — relabel as "Town Centre"
      if (a.name.toLowerCase().trim() === destName.toLowerCase().trim() ||
          a.name.toLowerCase().trim() === destId.toLowerCase().trim()) {
        return { ...a, name: `${destName.split(',')[0].trim()} Town Centre` }
      }
      return a
    }).filter((a) => {
      const key = a.name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [dbActivities]) // eslint-disable-line react-hooks/exhaustive-deps

  // Nature spots: remove OSM junk and low-credibility entries
  const NATURE_JUNK = /^(road verge|road side|roadside|verge|track|path|footpath|cycleway|footway|bridleway|unnamed|way|lane|street|road|avenue|drive|court|close|place|highway|route|service road|access road|fire track|fire road|fire trail|dirt road|gravel road|unsealed road|walking track|walking path|shared path|nature strip|median strip|drain|channel|creek crossing|culvert|bridge|roundabout|intersection|junction|node|area|region|zone|locality|suburb|township|settlement|precinct|\d+)$/i
  const uniqueNature = useMemo(() => {
    const seen = new Set<string>()
    return dbNature.filter((n) => {
      const name = n.name.trim()
      if (name.length < 3) return false
      if (NATURE_JUNK.test(name)) return false
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [dbNature]) // eslint-disable-line react-hooks/exhaustive-deps

  const dbActivityCount = openActivities.length + uniqueNature.length
  const dbAccomCount = dbAccommodation.length

  // Map DbAccommodation → AccommodationPOI for components that expect the legacy type
  const VALID_ACCOM_TYPES = new Set(['hotel','motel','campsite','caravan_park','hostel','cabin','guest_house'])
  const accommodationPOIs: AccommodationPOI[] = useMemo(() =>
    dbAccommodation.map((a) => ({
      id: a.slug,
      type: (VALID_ACCOM_TYPES.has(a.type) ? a.type : 'hotel') as AccommodationPOI['type'],
      name: a.name,
      lat: a.lat ?? undefined,
      lng: a.lng ?? undefined,
      description: a.description || undefined,
      address: a.address || undefined,
      website: a.website || undefined,
    }))
  , [dbAccommodation]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // store state
    destId, destName, shortDest, shortOrigin,
    activeItinerary, vehicleProfile, userProfile, departureHour,
    addedDiningStops, removeDiningStop, addDiningStop,
    addedActivities, addActivity, removeActivity,
    // computed
    totalKm, driveHours, fuelCost, dayLabel,
    season, seasonMeta,
    // DB data (primary — fast, comprehensive, closed places filtered)
    dbActivities: openActivities, dbNature: uniqueNature, dbFood, dbAccommodation, accommodationPOIs,
    dbLoading, dbActivityCount, dbAccomCount,
    // Drive times from destination to each POI (slug → minutes). Empty map until OSRM responds.
    driveMinutes,
    // legacy Overpass (fallback)
    livePOIs, wikiSummary,
    activityPOIs, naturePOIs, hazards,
  }
}
