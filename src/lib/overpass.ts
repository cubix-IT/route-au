// All data from Overpass API (OpenStreetMap) + Wikipedia. Free forever, no API key.

export interface OpenHoursPeriod {
  open: { day: number; hour: number; minute: number }
  close?: { day: number; hour: number; minute: number }
}

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
  source?: 'osm'
}

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const OVERPASS_MIRROR = 'https://overpass.kumi.systems/api/interpreter'

const poiCache = new Map<string, LivePOI[]>()
const wikiCache = new Map<string, string | null>()

const WIKI_LS_KEY = 'ue-wiki-cache-v1'
const WIKI_TTL_MS = 24 * 60 * 60 * 1000

function loadWikiLS(): void {
  try {
    const raw = localStorage.getItem(WIKI_LS_KEY)
    if (!raw) return
    const store: Record<string, { v: string | null; t: number }> = JSON.parse(raw)
    const now = Date.now()
    for (const [k, entry] of Object.entries(store)) {
      if (now - entry.t < WIKI_TTL_MS) wikiCache.set(k, entry.v)
    }
  } catch { /* */ }
}

function saveWikiLS(key: string, value: string | null): void {
  try {
    const raw = localStorage.getItem(WIKI_LS_KEY)
    const store: Record<string, { v: string | null; t: number }> = raw ? JSON.parse(raw) : {}
    store[key] = { v: value, t: Date.now() }
    const now = Date.now()
    for (const k of Object.keys(store)) {
      if (now - store[k].t >= WIKI_TTL_MS) delete store[k]
    }
    localStorage.setItem(WIKI_LS_KEY, JSON.stringify(store))
  } catch { /* */ }
}

try { loadWikiLS() } catch { /* */ }

async function overpassFetch(query: string, timeoutMs = 20000): Promise<any[]> {
  for (const endpoint of [OVERPASS, OVERPASS_MIRROR]) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST', body: query,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) continue
      const json = await res.json()
      return json.elements ?? []
    } catch { /* try mirror */ }
  }
  return []
}

export async function fetchLivePOIs(cacheKey: string, lat: number, lng: number): Promise<LivePOI[]> {
  if (poiCache.has(cacheKey)) return poiCache.get(cacheKey)!

  const r = 15000
  const query = `[out:json][timeout:25];
(
  nwr["tourism"~"^(viewpoint|attraction|museum|gallery|theme_park|zoo|aquarium)$"]["name"](around:${r},${lat},${lng});
  nwr["natural"~"^(peak|beach|waterfall|hot_spring)$"]["name"](around:${r},${lat},${lng});
  nwr["leisure"="nature_reserve"]["name"](around:${r},${lat},${lng});
  nwr["boundary"="national_park"]["name"](around:${r},${lat},${lng});
  relation["route"="hiking"]["name"](around:${r},${lat},${lng});
  way["highway"="path"]["name"]["foot"!~"^(no|private)$"](around:${r},${lat},${lng});
  nwr["amenity"~"^(cafe|restaurant|pub|bar|fast_food|bakery|winery|biergarten)$"]["name"](around:${r},${lat},${lng});
  nwr["shop"="bakery"]["name"](around:${r},${lat},${lng});
  nwr["craft"~"^(brewery|cider|winery|wine|distillery)$"]["name"](around:${r},${lat},${lng});
  nwr["tourism"~"^(winery|wine_cellar)$"]["name"](around:${r},${lat},${lng});
);
out center tags 150;`

  const elements = await overpassFetch(query)
  const seen = new Set<string>()
  const pois: LivePOI[] = []

  for (const el of elements) {
    const t = el.tags ?? {}
    const name = t.name || t['name:en']
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const elLat = el.lat ?? el.center?.lat
    const elLng = el.lon ?? el.center?.lon

    let type: LivePOI['type'] | null = null
    if (t.tourism === 'viewpoint' || t.natural === 'peak') type = 'viewpoint'
    else if (t.tourism === 'attraction' || t.tourism === 'museum' || t.tourism === 'gallery' || t.tourism === 'zoo' || t.tourism === 'aquarium' || t.natural === 'beach' || t.natural === 'waterfall' || t.natural === 'hot_spring') type = 'attraction'
    else if (t.leisure === 'nature_reserve' || t.boundary === 'national_park') type = 'attraction'
    else if (t.route === 'hiking' || t.highway === 'path') type = 'hiking'
    else if (t.amenity === 'cafe' || t.shop === 'coffee') type = 'cafe'
    else if (t.amenity === 'restaurant') type = 'restaurant'
    else if (t.amenity === 'pub' || t.amenity === 'bar' || t.amenity === 'biergarten' || t.craft === 'brewery' || t.craft === 'cider' || t.craft === 'distillery') type = 'pub'
    else if (t.amenity === 'fast_food') type = 'fast_food'
    else if (t.shop === 'bakery' || t.amenity === 'bakery') type = 'bakery'
    else if (t.amenity === 'winery' || t.tourism === 'winery' || t.tourism === 'wine_cellar' || t.craft === 'winery' || t.craft === 'wine') type = 'winery'
    if (!type) continue

    pois.push({
      id: `${el.type}-${el.id}`,
      type, name, lat: elLat, lng: elLng,
      openingHours: t.opening_hours,
      website: t.website || t['contact:website'],
      cuisine: t.cuisine?.split(';')[0],
      description: t.description || t.note,
      routeLength: t.distance || t['route:len'] || t.length,
      source: 'osm',
    })
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
      const match = json.extract.match(/^(.+?[.!?](?:\s.+?[.!?])?)(?:\s|$)/)
      const summary = match ? match[1].trim() : json.extract.slice(0, 220)
      wikiCache.set(cacheKey, summary)
      saveWikiLS(cacheKey, summary)
      const thumbUrl: string | null = json.thumbnail?.source ?? json.originalimage?.source ?? null
      wikiThumbCache.set(cacheKey, thumbUrl)
      return summary
    } catch { /* */ }
  }
  wikiCache.set(cacheKey, null)
  saveWikiLS(cacheKey, null)
  return null
}

export async function fetchWikipediaThumb(cacheKey: string, placeName: string): Promise<string | null> {
  if (wikiThumbCache.has(cacheKey)) return wikiThumbCache.get(cacheKey)!
  await fetchWikipediaSummary(cacheKey, placeName)
  return wikiThumbCache.get(cacheKey) ?? null
}

// ── Accommodation ────────────────────────────────────────────────────────────

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

  const query = `[out:json][timeout:25];
(
  nwr["tourism"~"^(hotel|motel|guest_house|hostel|chalet|camp_site|caravan_site)$"]["name"](around:10000,${lat},${lng});
  nwr["amenity"~"^(hotel|motel)$"]["name"](around:10000,${lat},${lng});
);
out center tags 80;`

  const elements = await overpassFetch(query)
  const seen = new Set<string>()
  const pois: AccommodationPOI[] = []

  for (const el of elements) {
    const t = el.tags ?? {}
    const name = t.name
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const tourism = t.tourism || t.amenity || ''
    let type: AccommodationPOI['type']
    if (tourism === 'hotel' || t.amenity === 'hotel')   type = 'hotel'
    else if (tourism === 'motel' || t.amenity === 'motel') type = 'motel'
    else if (tourism === 'camp_site')    type = 'campsite'
    else if (tourism === 'caravan_site') type = 'caravan_park'
    else if (tourism === 'hostel')       type = 'hostel'
    else if (tourism === 'chalet')       type = 'cabin'
    else if (tourism === 'guest_house')  type = 'guest_house'
    else continue

    pois.push({
      id: `${el.type}-${el.id}`,
      type, name,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      website: t.website || t['contact:website'],
      stars: t.stars ? parseInt(t.stars) : undefined,
      description: t.description,
    })
  }

  if (pois.length > 0) accomCache.set(cacheKey, pois)
  return pois
}

// ── Route food stops ─────────────────────────────────────────────────────────

export interface RouteFoodStop {
  id: string
  name: string
  type: 'cafe' | 'bakery' | 'restaurant' | 'pub' | 'winery' | 'roadhouse'
  lat: number
  lng: number
  openingHours?: string
  website?: string
  cuisine?: string
  distanceFromRouteKm: number
  extraStopMin: number
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
const ORIGIN_EXCLUSION_KM = 15
const DEST_EXCLUSION_KM   = 8

type DiningPref = 'Cafes' | 'Bakeries' | 'CasualDining' | 'LocalPubs' | 'Wineries' | 'FineDining' | 'Roadhouses' | 'SelfCatering'

export async function fetchRouteFoodStops(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  diningPrefs: DiningPref[],
): Promise<RouteFoodStop[]> {
  const DEFAULT_PREFS: DiningPref[] = ['Cafes', 'CasualDining', 'LocalPubs', 'Bakeries']
  const relevant = (diningPrefs.length === 0 ? DEFAULT_PREFS : diningPrefs).filter((p) => p !== 'SelfCatering')
  if (relevant.length === 0) return []

  const cacheKey = `${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}-${dest.lat.toFixed(2)},${dest.lng.toFixed(2)}-${relevant.sort().join(',')}`
  if (routeFoodCache.has(cacheKey)) return routeFoodCache.get(cacheKey)!

  const buf = 0.6
  const minLat = Math.min(origin.lat, dest.lat) - buf
  const maxLat = Math.max(origin.lat, dest.lat) + buf
  const minLng = Math.min(origin.lng, dest.lng) - buf
  const maxLng = Math.max(origin.lng, dest.lng) + buf
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`

  const parts: string[] = []
  if (relevant.includes('Cafes'))                                         parts.push(`nwr["amenity"="cafe"]["name"](${bbox})`)
  if (relevant.includes('Bakeries'))                                      parts.push(`nwr["shop"="bakery"]["name"](${bbox})`)
  if (relevant.includes('CasualDining') || relevant.includes('FineDining')) parts.push(`nwr["amenity"="restaurant"]["name"](${bbox})`)
  if (relevant.includes('LocalPubs')) {
    parts.push(`nwr["amenity"="pub"]["name"](${bbox})`)
    parts.push(`nwr["amenity"="bar"]["name"](${bbox})`)
  }
  if (relevant.includes('Wineries')) {
    parts.push(`nwr["amenity"="winery"]["name"](${bbox})`)
    parts.push(`nwr["tourism"="winery"]["name"](${bbox})`)
    parts.push(`nwr["craft"="winery"]["name"](${bbox})`)
    parts.push(`nwr["craft"="wine"]["name"](${bbox})`)
    parts.push(`nwr["tourism"="wine_cellar"]["name"](${bbox})`)
  }
  if (relevant.includes('Roadhouses')) parts.push(`nwr["amenity"="fuel"]["name"](${bbox})`)
  if (parts.length === 0) return []

  const query = `[out:json][timeout:25];\n(\n  ${parts.join(';\n  ')};\n);\nout center tags 400;`
  const elements = await overpassFetch(query, 25000)

  const seen = new Set<string>()
  const stops: RouteFoodStop[] = []

  for (const el of elements) {
    const t = el.tags ?? {}
    const name = t.name
    const elLat = el.lat ?? el.center?.lat
    const elLon = el.lon ?? el.center?.lon
    if (!name || elLat === undefined || elLon === undefined) continue

    const key = `${t.amenity || t.shop || t.tourism || t.craft}:${name.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    const p = { lat: elLat, lng: elLon }
    const dist = pointToSegmentKm(p, origin, dest)
    if (dist > 80) continue
    if (haversinKm(p, origin) < ORIGIN_EXCLUSION_KM) continue
    if (haversinKm(p, dest) < DEST_EXCLUSION_KM) continue

    let type: RouteFoodStop['type']
    if (t.amenity === 'cafe')       type = 'cafe'
    else if (t.shop === 'bakery')   type = 'bakery'
    else if (t.amenity === 'restaurant') type = 'restaurant'
    else if (t.amenity === 'pub' || t.amenity === 'bar') type = 'pub'
    else if (t.amenity === 'winery' || t.tourism === 'winery' || t.tourism === 'wine_cellar' || t.craft === 'winery' || t.craft === 'wine') type = 'winery'
    else if (t.amenity === 'fuel')  type = 'roadhouse'
    else continue

    const stopDuration = (type === 'cafe' || type === 'bakery') ? 20 : (type === 'restaurant' || type === 'winery') ? 60 : 30
    stops.push({
      id: `${el.type ?? 'n'}-${el.id}`,
      name, type,
      lat: elLat, lng: elLon,
      openingHours: t.opening_hours,
      website: t.website || t['contact:website'],
      cuisine: t.cuisine?.split(';')[0],
      distanceFromRouteKm: Math.round(dist * 10) / 10,
      extraStopMin: Math.round((dist * 2) / 60 * 60) + stopDuration,
    })
  }

  const sorted = stops.sort((a, b) => a.distanceFromRouteKm - b.distanceFromRouteKm)
  routeFoodCache.set(cacheKey, sorted)
  return sorted
}
