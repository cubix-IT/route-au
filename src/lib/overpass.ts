import { getPlacesCache, setPlacesCache, isPlacesBudgetExhausted, incrementPlacesRequestCount } from '@/store/db'
import { useAppStore } from '@/store/useAppStore'

export interface LivePOI {
  id: string
  type: 'cafe' | 'restaurant' | 'pub' | 'fast_food' | 'bakery' | 'winery' | 'viewpoint' | 'attraction' | 'hiking'
  name: string
  lat?: number
  lng?: number
  openingHours?: string
  website?: string
  cuisine?: string
  description?: string
  routeLength?: string
  rating?: number        // Google Places rating (1–5)
  totalRatings?: number  // number of reviews
  source?: 'google' | 'osm'
}

const OVERPASS = 'https://overpass-api.de/api/interpreter'

// Module-level cache keyed by sub-destination ID
const poiCache = new Map<string, LivePOI[]>()
const wikiCache = new Map<string, string | null>()

// ── Google Places fallback (supplements sparse Overpass results) ───

const GP_LIVE_TYPE: Record<string, LivePOI['type']> = {
  // Food & Drink
  cafe: 'cafe', coffee_shop: 'cafe', dessert_shop: 'cafe', brunch_restaurant: 'cafe',
  restaurant: 'restaurant', australian_restaurant: 'restaurant',
  hamburger_restaurant: 'restaurant', pizza_restaurant: 'restaurant',
  seafood_restaurant: 'restaurant', steak_house: 'restaurant',
  fine_dining_restaurant: 'restaurant', asian_restaurant: 'restaurant',
  italian_restaurant: 'restaurant', mexican_restaurant: 'restaurant',
  french_restaurant: 'restaurant', greek_restaurant: 'restaurant',
  chinese_restaurant: 'restaurant', japanese_restaurant: 'restaurant',
  indian_restaurant: 'restaurant', thai_restaurant: 'restaurant',
  mediterranean_restaurant: 'restaurant', spanish_restaurant: 'restaurant',
  family_restaurant: 'restaurant', bistro: 'restaurant',
  bar: 'pub', pub: 'pub', night_club: 'pub',
  brewery: 'pub', distillery: 'pub', brewpub: 'pub',
  bar_and_grill: 'pub', cocktail_bar: 'pub', wine_bar: 'winery',
  // Gin distilleries and craft producers show up as "manufacturer" in Yarra Valley
  manufacturer: 'pub',
  fast_food_restaurant: 'fast_food', meal_takeaway: 'fast_food', sandwich_shop: 'fast_food',
  fish_and_chips_restaurant: 'fast_food',
  bakery: 'bakery',
  winery: 'winery', vineyard: 'winery',
  // Attractions (human-made, curated experiences)
  tourist_attraction: 'attraction', museum: 'attraction',
  park: 'attraction', amusement_park: 'attraction',
  zoo: 'attraction', aquarium: 'attraction',
  art_gallery: 'attraction', stadium: 'attraction',
  farm: 'attraction', wildlife_park: 'attraction',
  botanical_garden: 'attraction', wildlife_refuge: 'attraction',
  historical_landmark: 'attraction', event_venue: 'attraction',
  // Nature & Outdoors (separate from human attractions)
  national_park: 'hiking', nature_preserve: 'viewpoint',
  beach: 'viewpoint', waterfall: 'viewpoint',
  scenic_spot: 'viewpoint', scenic_overlook: 'viewpoint',
  hiking_area: 'hiking', wilderness_area: 'hiking',
  campground: 'hiking',
}

interface GPlace {
  id: string
  displayName?: { text: string }
  location?: { latitude: number; longitude: number }
  types?: string[]
  primaryType?: string
  regularOpeningHours?: { weekdayDescriptions?: string[]; openNow?: boolean }
  websiteUri?: string
  rating?: number
  userRatingCount?: number
  editorialSummary?: { text: string }
}

async function fetchGPlaces(lat: number, lng: number, category: string, radius = 5000): Promise<GPlace[]> {
  // v3 prefix busts any stale IndexedDB entries from prior type-mapping changes
  const cacheKey = `v3_${lat.toFixed(3)},${lng.toFixed(3)},${category}`

  // IndexedDB cache-first: no network call if fresh data exists
  const cached = await getPlacesCache(cacheKey)
  if (cached) return cached as GPlace[]

  // Budget guard: if this device has exhausted its monthly limit, skip Places
  const budgetExhausted = await isPlacesBudgetExhausted(9000)
  if (budgetExhausted) {
    useAppStore.getState().setPlacesLimitedMode(true)
    return []
  }

  try {
    const res = await fetch(`/api/places?lat=${lat}&lng=${lng}&category=${category}&radius=${radius}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json() as { places: GPlace[]; quotaExceeded?: boolean; budgetExhausted?: boolean }

    // Server-side budget or quota signals
    if (json.quotaExceeded || json.budgetExhausted) {
      useAppStore.getState().setPlacesLimitedMode(true)
      return []
    }

    const places = json.places ?? []
    if (places.length > 0) {
      await setPlacesCache(cacheKey, places)
      await incrementPlacesRequestCount()
    }
    return places
  } catch {
    return []
  }
}

function gPlacesToLivePOI(places: GPlace[]): LivePOI[] {
  const seen = new Set<string>()
  const pois: LivePOI[] = []
  for (const p of places) {
    const name = p.displayName?.text
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const primaryType = p.primaryType ?? p.types?.[0] ?? ''
    const type = GP_LIVE_TYPE[primaryType] ?? p.types?.reduce<LivePOI['type'] | null>((acc, t) => acc ?? (GP_LIVE_TYPE[t] ?? null), null)
    if (!type) continue

    pois.push({
      id: `gp-${p.id}`,
      type,
      name,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      openingHours: p.regularOpeningHours?.weekdayDescriptions?.[0],
      website: p.websiteUri,
      rating: p.rating,
      totalRatings: p.userRatingCount,
      description: p.editorialSummary?.text,
      source: 'google',
    })
  }
  return pois
}

async function fetchPlacesForLivePOIs(lat: number, lng: number): Promise<LivePOI[]> {
  try {
    const [foodPlaces, actPlaces, naturePlaces] = await Promise.all([
      fetchGPlaces(lat, lng, 'food'),
      fetchGPlaces(lat, lng, 'activities'),
      fetchGPlaces(lat, lng, 'nature'),
    ])
    const all: GPlace[] = [...foodPlaces, ...actPlaces, ...naturePlaces]
    return gPlacesToLivePOI(all)
  } catch {
    return []
  }
}

const GP_ACCOM_TYPE: Record<string, AccommodationPOI['type']> = {
  hotel: 'hotel',
  resort_hotel: 'hotel',
  lodging: 'hotel',       // legacy Places API type
  motel: 'motel',
  bed_and_breakfast: 'guest_house',
  hostel: 'hostel',
  campground: 'campsite',
  rv_park: 'caravan_park',
}

async function fetchPlacesForAccom(lat: number, lng: number): Promise<AccommodationPOI[]> {
  try {
    const places = await fetchGPlaces(lat, lng, 'accommodation', 10000)
    const seen = new Set<string>()
    const pois: AccommodationPOI[] = []
    for (const p of places) {
      const name = p.displayName?.text
      if (!name) continue
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      const primaryType = p.primaryType ?? p.types?.[0] ?? ''
      const type: AccommodationPOI['type'] = GP_ACCOM_TYPE[primaryType] ?? 'hotel'

      pois.push({
        id: `gp-${p.id}`,
        type,
        name,
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        website: p.websiteUri,
      })
    }
    return pois
  } catch {
    return []
  }
}

// Natural/structural POI types that Overpass handles authoritatively
const NATURAL_OSM_TYPES = new Set<LivePOI['type']>(['viewpoint', 'attraction', 'hiking'])
// Commercial types routed through Google Places first
const COMMERCIAL_TYPES = new Set<LivePOI['type']>(['cafe', 'restaurant', 'pub', 'fast_food', 'bakery', 'winery'])

export async function fetchLivePOIs(cacheKey: string, lat: number, lng: number): Promise<LivePOI[]> {
  if (poiCache.has(cacheKey)) return poiCache.get(cacheKey)!

  // ── Parallel: Google Places (commercial) + Overpass (natural/structural) ──
  const [placePOIs, overpassPOIs] = await Promise.all([
    // Google Places: primary source for commercial venues
    fetchPlacesForLivePOIs(lat, lng),

    // Overpass: authoritative for natural geography, trails, viewpoints
    (async (): Promise<LivePOI[]> => {
      const rBig = 5000
      const query = `[out:json][timeout:25];
(
  nwr["tourism"~"^(viewpoint|attraction|museum)$"]["name"](around:${rBig},${lat},${lng});
  nwr["natural"~"^(peak|beach|waterfall|hot_spring)$"]["name"](around:${rBig},${lat},${lng});
  nwr["leisure"="nature_reserve"]["name"](around:${rBig},${lat},${lng});
  nwr["boundary"="national_park"]["name"](around:${rBig},${lat},${lng});
  relation["route"="hiking"]["name"](around:${rBig},${lat},${lng});
  way["route"="hiking"]["name"](around:${rBig},${lat},${lng});
  way["highway"="path"]["name"]["foot"!~"^(no|private)$"](around:${rBig},${lat},${lng});
  way["highway"="footway"]["name"]["foot"!~"^(no|private)$"](around:${rBig},${lat},${lng});
);
out center tags 100;`
      try {
        const res = await fetch(OVERPASS, { method: 'POST', body: query, signal: AbortSignal.timeout(20000) })
        if (!res.ok) return []
        const json = await res.json()
        const seen = new Set<string>()
        const pois: LivePOI[] = []
        for (const el of (json.elements ?? [])) {
          const t = el.tags ?? {}
          const name = t.name || t['name:en']
          if (!name) continue
          const key = `osm:${name.toLowerCase()}`
          if (seen.has(key)) continue
          seen.add(key)
          const elLat = el.lat ?? el.center?.lat
          const elLng = el.lon ?? el.center?.lon
          let type: LivePOI['type'] | null = null
          if (t.tourism === 'viewpoint' || t.natural === 'peak') type = 'viewpoint'
          else if (t.tourism === 'attraction' || t.tourism === 'museum' || t.natural === 'beach' || t.natural === 'waterfall' || t.natural === 'hot_spring') type = 'attraction'
          else if (t.leisure === 'nature_reserve' || t.boundary === 'national_park') type = 'attraction'
          else if (t.route === 'hiking' || t.route === 'foot' || t.highway === 'path' || t.highway === 'footway') type = 'hiking'
          if (!type) continue
          pois.push({
            id: `${el.type}-${el.id}`,
            type, name, lat: elLat, lng: elLng,
            openingHours: t.opening_hours,
            website: t.website || t['contact:website'],
            description: t.description || t.note,
            routeLength: t.distance || t['route:len'] || t.length,
          })
        }
        return pois
      } catch {
        return []
      }
    })(),
  ])

  // Merge: Google Places (commercial + activities) + Overpass (natural/structural)
  const seen = new Set<string>()
  const pois: LivePOI[] = []

  // Add all Google Places results — both commercial and activities
  for (const p of placePOIs) {
    const key = p.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    pois.push(p)
  }

  // Add Overpass natural results not already covered by Google Places
  for (const p of overpassPOIs) {
    if (!NATURAL_OSM_TYPES.has(p.type)) continue
    const key = p.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    pois.push(p)
  }

  // If Google Places returned nothing for commercial (e.g., local dev / quota), fall
  // back to Overpass for commercial types too
  const hasCommercial = pois.some((p) => COMMERCIAL_TYPES.has(p.type))
  if (!hasCommercial) {
    const r = 5000
    const fallbackQuery = `[out:json][timeout:20];
(
  nwr["amenity"~"^(cafe|restaurant|pub|bar|fast_food|food_court)$"]["name"](around:${r},${lat},${lng});
  nwr["amenity"="bakery"]["name"](around:${r},${lat},${lng});
  nwr["shop"="bakery"]["name"](around:${r},${lat},${lng});
  nwr["craft"~"^(brewery|cider|winery)$"]["name"](around:${r},${lat},${lng});
  nwr["amenity"="winery"]["name"](around:${r},${lat},${lng});
  nwr["tourism"~"^(winery|wine_cellar)$"]["name"](around:${r},${lat},${lng});
);
out center tags 80;`
    try {
      const res = await fetch(OVERPASS, { method: 'POST', body: fallbackQuery, signal: AbortSignal.timeout(15000) })
      if (res.ok) {
        const json = await res.json()
        for (const el of (json.elements ?? [])) {
          const t = el.tags ?? {}
          const name = t.name || t['name:en']
          if (!name) continue
          const key = name.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          const elLat = el.lat ?? el.center?.lat
          const elLng = el.lon ?? el.center?.lon
          let type: LivePOI['type'] | null = null
          if (t.amenity === 'cafe') type = 'cafe'
          else if (t.amenity === 'restaurant') type = 'restaurant'
          else if (t.amenity === 'pub' || t.amenity === 'bar') type = 'pub'
          else if (t.craft === 'brewery' || t.craft === 'cider') type = 'pub'
          else if (t.amenity === 'fast_food' || t.amenity === 'food_court') type = 'fast_food'
          else if (t.shop === 'bakery' || t.amenity === 'bakery') type = 'bakery'
          else if (t.amenity === 'winery' || t.tourism === 'winery' || t.tourism === 'wine_cellar' || t.craft === 'winery' || t.craft === 'wine') type = 'winery'
          if (!type) continue
          pois.push({ id: `${el.type}-${el.id}`, type, name, lat: elLat, lng: elLng, openingHours: t.opening_hours, website: t.website || t['contact:website'], cuisine: t.cuisine?.split(';')[0], description: t.description || t.note })
        }
      }
    } catch { /* silent fallback */ }
  }

  if (pois.length > 0) poiCache.set(cacheKey, pois)
  return pois
}

const wikiThumbCache = new Map<string, string | null>()

export async function fetchWikipediaSummary(cacheKey: string, placeName: string): Promise<string | null> {
  if (wikiCache.has(cacheKey)) return wikiCache.get(cacheKey)!

  const attempts = [`${placeName}, Victoria`, placeName]
  for (const name of attempts) {
    try {
      const slug = encodeURIComponent(name.replace(/ /g, '_'))
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) continue
      const json = await res.json()
      if (!json.extract || json.extract.length < 60 || json.type === 'disambiguation') continue
      // First 1-2 sentences
      const match = json.extract.match(/^(.+?[.!?](?:\s.+?[.!?])?)(?:\s|$)/)
      const summary = match ? match[1].trim() : json.extract.slice(0, 220)
      wikiCache.set(cacheKey, summary)
      // Cache the thumbnail separately
      const thumbUrl: string | null = json.thumbnail?.source ?? json.originalimage?.source ?? null
      wikiThumbCache.set(cacheKey, thumbUrl)
      return summary
    } catch { /* */ }
  }
  wikiCache.set(cacheKey, null)
  return null
}

export async function fetchWikipediaThumb(cacheKey: string, placeName: string): Promise<string | null> {
  // Thumbnail is populated as a side-effect of fetchWikipediaSummary
  if (wikiThumbCache.has(cacheKey)) return wikiThumbCache.get(cacheKey)!
  // If summary hasn't been fetched yet, fetch it now
  await fetchWikipediaSummary(cacheKey, placeName)
  return wikiThumbCache.get(cacheKey) ?? null
}

// ── Accommodation near destination ───────────────────────────────

export interface AccommodationPOI {
  id: string
  type: 'hotel' | 'motel' | 'campsite' | 'caravan_park' | 'hostel' | 'cabin' | 'guest_house'
  name: string
  lat?: number
  lng?: number
  website?: string
  stars?: number
  description?: string
}

const accomCache = new Map<string, AccommodationPOI[]>()

export async function fetchAccommodationNear(cacheKey: string, lat: number, lng: number): Promise<AccommodationPOI[]> {
  if (accomCache.has(cacheKey)) return accomCache.get(cacheKey)!

  const r = 10000
  const query = `[out:json][timeout:25];
(
  nwr["tourism"~"^(hotel|motel|guest_house|hostel|chalet|camp_site|caravan_site)$"]["name"](around:${r},${lat},${lng});
  nwr["amenity"~"^(hotel|motel)$"]["name"](around:${r},${lat},${lng});
);
out center tags 80;`

  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      body: query,
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    const seen = new Set<string>()
    const pois: AccommodationPOI[] = []

    for (const el of (json.elements ?? [])) {
      const t = el.tags ?? {}
      const name = t.name
      if (!name) continue
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      const elLat = el.lat ?? el.center?.lat
      const elLng = el.lon ?? el.center?.lon

      const tourism = t.tourism || t.amenity || ''
      let type: AccommodationPOI['type']
      if (tourism === 'hotel' || t.amenity === 'hotel') type = 'hotel'
      else if (tourism === 'motel' || t.amenity === 'motel') type = 'motel'
      else if (tourism === 'camp_site') type = 'campsite'
      else if (tourism === 'caravan_site') type = 'caravan_park'
      else if (tourism === 'hostel') type = 'hostel'
      else if (tourism === 'chalet') type = 'cabin'
      else if (tourism === 'guest_house') type = 'guest_house'
      else continue

      pois.push({
        id: `${el.type}-${el.id}`,
        type,
        name,
        lat: elLat,
        lng: elLng,
        website: t.website || t['contact:website'],
        stars: t.stars ? parseInt(t.stars) : undefined,
        description: t.description,
      })
    }

    // Supplement with Google Places when OSM accommodation data is sparse
    if (pois.length < 2) {
      const fallback = await fetchPlacesForAccom(lat, lng)
      const existingNames = new Set(pois.map((p) => p.name.toLowerCase()))
      for (const fp of fallback) {
        if (!existingNames.has(fp.name.toLowerCase())) {
          pois.push(fp)
          existingNames.add(fp.name.toLowerCase())
        }
      }
    }

    if (pois.length > 0) accomCache.set(cacheKey, pois)
    return pois
  } catch {
    return []
  }
}

// ── Route food stops (for the Dining tab) ─────────────────────────

export interface RouteFoodStop {
  id: string
  name: string
  type: 'cafe' | 'bakery' | 'restaurant' | 'pub' | 'winery' | 'roadhouse'
  lat: number
  lng: number
  openingHours?: string
  website?: string
  cuisine?: string
  distanceFromRouteKm: number   // how far off the direct line
  extraStopMin: number          // estimated total extra time (detour + stop)
}

function haversinKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function pointToSegmentKm(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return haversinKm(p, a)
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / len2))
  return haversinKm(p, { lng: a.lng + t * dx, lat: a.lat + t * dy })
}

const routeFoodCache = new Map<string, RouteFoodStop[]>()

type DiningPref = 'Cafes' | 'Bakeries' | 'CasualDining' | 'LocalPubs' | 'Wineries' | 'FineDining' | 'Roadhouses' | 'SelfCatering'

// Stops within this many km of the origin are skipped — they're in your
// starting suburb, not "on the way". Stops near the destination are covered
// by the Eat & Drink tab instead.
const ORIGIN_EXCLUSION_KM = 15
const DEST_EXCLUSION_KM   = 8

export async function fetchRouteFoodStops(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  diningPrefs: DiningPref[],
): Promise<RouteFoodStop[]> {
  // If no prefs set (wizard skipped), default to the most common stop types
  const DEFAULT_PREFS: DiningPref[] = ['Cafes', 'CasualDining', 'LocalPubs', 'Bakeries']
  const relevant = (diningPrefs.length === 0
    ? DEFAULT_PREFS
    : diningPrefs
  ).filter((p) => p !== 'SelfCatering')
  if (relevant.length === 0) return []

  const cacheKey = `${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}-${dest.lat.toFixed(2)},${dest.lng.toFixed(2)}-${relevant.sort().join(',')}`
  if (routeFoodCache.has(cacheKey)) return routeFoodCache.get(cacheKey)!

  // Generous bbox: 0.6° (~60km) padding so nearby towns aren't clipped
  const buf = 0.6
  const minLat = Math.min(origin.lat, dest.lat) - buf
  const maxLat = Math.max(origin.lat, dest.lat) + buf
  const minLng = Math.min(origin.lng, dest.lng) - buf
  const maxLng = Math.max(origin.lng, dest.lng) + buf
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`

  // Use `nwr` (node + way + relation) so polygon-tagged places (wineries, pubs)
  // are included — many Australian venues are mapped as area features in OSM.
  const parts: string[] = []
  if (relevant.includes('Cafes')) {
    parts.push(`nwr["amenity"="cafe"]["name"](${bbox})`)
  }
  if (relevant.includes('Bakeries')) {
    parts.push(`nwr["shop"="bakery"]["name"](${bbox})`)
  }
  if (relevant.includes('CasualDining') || relevant.includes('FineDining')) {
    parts.push(`nwr["amenity"="restaurant"]["name"](${bbox})`)
  }
  if (relevant.includes('LocalPubs')) {
    parts.push(`nwr["amenity"="pub"]["name"](${bbox})`)
    parts.push(`nwr["amenity"="bar"]["name"](${bbox})`)
  }
  if (relevant.includes('Wineries')) {
    // All common OSM tagging schemes for wineries
    parts.push(`nwr["amenity"="winery"]["name"](${bbox})`)
    parts.push(`nwr["tourism"="winery"]["name"](${bbox})`)
    parts.push(`nwr["craft"="winery"]["name"](${bbox})`)
    parts.push(`nwr["craft"="wine"]["name"](${bbox})`)
    parts.push(`nwr["tourism"="wine_cellar"]["name"](${bbox})`)
  }
  if (relevant.includes('Roadhouses')) {
    parts.push(`nwr["amenity"="fuel"]["name"](${bbox})`)
  }

  if (parts.length === 0) return []

  // `out center tags` returns the centroid for ways/relations so we always get coords
  const query = `[out:json][timeout:25];\n(\n  ${parts.join(';\n  ')};\n);\nout center tags 400;`

  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      body: query,
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    const seen = new Set<string>()
    const stops: RouteFoodStop[] = []

    for (const el of (json.elements ?? [])) {
      const t = el.tags ?? {}
      const name = t.name
      // Support both point nodes (lat/lon) and polygon centers (center.lat/center.lon)
      const elLat = el.lat ?? el.center?.lat
      const elLon = el.lon ?? el.center?.lon
      if (!name || elLat === undefined || elLon === undefined) continue

      const key = `${t.amenity || t.shop || t.tourism || t.craft}:${name.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)

      const p = { lat: elLat, lng: elLon }
      const dist = pointToSegmentKm(p, origin, dest)
      if (dist > 80) continue
      // Skip stops in the origin's suburb — they're not "on route"
      if (haversinKm(p, origin) < ORIGIN_EXCLUSION_KM) continue
      // Skip stops right at the destination — covered by Eat & Drink tab
      if (haversinKm(p, dest) < DEST_EXCLUSION_KM) continue

      let type: RouteFoodStop['type']
      if (t.amenity === 'cafe') type = 'cafe'
      else if (t.shop === 'bakery') type = 'bakery'
      else if (t.amenity === 'restaurant') type = 'restaurant'
      else if (t.amenity === 'pub' || t.amenity === 'bar') type = 'pub'
      else if (
        t.amenity === 'winery' || t.tourism === 'winery' || t.tourism === 'wine_cellar' ||
        t.craft === 'winery' || t.craft === 'wine'
      ) type = 'winery'
      else if (t.amenity === 'fuel') type = 'roadhouse'
      else continue

      const stopDuration = (type === 'cafe' || type === 'bakery') ? 20 : (type === 'restaurant' || type === 'winery') ? 60 : 30
      const detourDriveMin = Math.round((dist * 2) / 60 * 60)
      const extraStopMin = detourDriveMin + stopDuration

      stops.push({
        id: `${el.type ?? 'n'}-${el.id}`,
        name,
        type,
        lat: elLat,
        lng: elLon,
        openingHours: t.opening_hours,
        website: t.website || t['contact:website'],
        cuisine: t.cuisine?.split(';')[0],
        distanceFromRouteKm: Math.round(dist * 10) / 10,
        extraStopMin,
      })
    }

    const sorted = stops.sort((a, b) => a.distanceFromRouteKm - b.distanceFromRouteKm)
    routeFoodCache.set(cacheKey, sorted)
    return sorted
  } catch {
    return []
  }
}
