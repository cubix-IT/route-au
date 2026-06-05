// All data from Overpass API (OpenStreetMap) + Wikipedia. Free forever, no API key.

export interface OpenHoursPeriod {
  open: { day: number; hour: number; minute: number }
  close?: { day: number; hour: number; minute: number }
}

export interface LivePOI {
  id: string
  type: 'winery' | 'brewery' | 'distillery' | 'pub' | 'viewpoint' | 'attraction' | 'hiking'
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
const OVERPASS_MIRROR2 = 'https://overpass.private.coffee/api/interpreter'

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

async function overpassFetch(query: string, timeoutMs = 8000): Promise<any[]> {
  for (const endpoint of [OVERPASS, OVERPASS_MIRROR, OVERPASS_MIRROR2]) {
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
  const query = `[out:json][timeout:8];
(
  nwr["tourism"~"^(viewpoint|attraction|museum|gallery|theme_park|zoo|aquarium)$"]["name"](around:${r},${lat},${lng});
  nwr["natural"~"^(peak|beach|waterfall|hot_spring)$"]["name"](around:${r},${lat},${lng});
  nwr["leisure"="nature_reserve"]["name"](around:${r},${lat},${lng});
  nwr["boundary"="national_park"]["name"](around:${r},${lat},${lng});
  relation["route"="hiking"]["name"](around:${r},${lat},${lng});
  way["highway"="path"]["name"]["foot"!~"^(no|private)$"](around:${r},${lat},${lng});
  nwr["amenity"="pub"]["name"](around:${r},${lat},${lng});
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
    else if (t.amenity === 'pub' || t.amenity === 'bar' || t.amenity === 'biergarten') type = 'pub'
    else if (t.craft === 'brewery' || t.craft === 'cider') type = 'brewery'
    else if (t.craft === 'distillery') type = 'distillery'
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
  address?: string
}

const accomCache = new Map<string, AccommodationPOI[]>()

export async function fetchAccommodationNear(cacheKey: string, lat: number, lng: number): Promise<AccommodationPOI[]> {
  if (accomCache.has(cacheKey)) return accomCache.get(cacheKey)!

  const query = `[out:json][timeout:8];
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

