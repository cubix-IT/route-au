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
}

const OVERPASS = 'https://overpass-api.de/api/interpreter'

// Module-level cache keyed by sub-destination ID
const poiCache = new Map<string, LivePOI[]>()
const wikiCache = new Map<string, string | null>()

export async function fetchLivePOIs(cacheKey: string, lat: number, lng: number): Promise<LivePOI[]> {
  if (poiCache.has(cacheKey)) return poiCache.get(cacheKey)!

  const r = 8000    // 8 km for food & drink (covers most town areas)
  const rBig = 20000 // 20 km for trails, views, attractions

  const query = `[out:json][timeout:25];
(
  nwr["amenity"~"^(cafe|restaurant|pub|bar|fast_food|food_court|bakery)$"]["name"](around:${r},${lat},${lng});
  nwr["shop"="bakery"]["name"](around:${r},${lat},${lng});
  nwr["amenity"~"^(winery)$"]["name"](around:${rBig},${lat},${lng});
  nwr["tourism"~"^(winery|wine_cellar)$"]["name"](around:${rBig},${lat},${lng});
  nwr["craft"~"^(winery|wine)$"]["name"](around:${rBig},${lat},${lng});
  nwr["tourism"~"^(viewpoint|attraction|museum)$"]["name"](around:${rBig},${lat},${lng});
  nwr["natural"~"^(peak|beach)$"]["name"](around:${rBig},${lat},${lng});
  relation["route"="hiking"]["name"](around:${rBig},${lat},${lng});
  way["route"="hiking"]["name"](around:${rBig},${lat},${lng});
);
out center tags 120;`

  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      body: query,
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    const seen = new Set<string>()
    const pois: LivePOI[] = []

    for (const el of (json.elements ?? [])) {
      const t = el.tags ?? {}
      const name = t.name || t['name:en']
      if (!name) continue

      const key = `${(t.amenity || t.tourism || t.natural || t.route || '')}:${name.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)

      const elLat = el.lat ?? el.center?.lat
      const elLng = el.lon ?? el.center?.lon

      let type: LivePOI['type'] | null = null
      if (t.amenity === 'cafe') type = 'cafe'
      else if (t.amenity === 'restaurant') type = 'restaurant'
      else if (t.amenity === 'pub' || t.amenity === 'bar') type = 'pub'
      else if (t.amenity === 'fast_food' || t.amenity === 'food_court') type = 'fast_food'
      else if (t.shop === 'bakery') type = 'bakery'
      else if (t.amenity === 'winery' || t.tourism === 'winery' || t.tourism === 'wine_cellar' || t.craft === 'winery' || t.craft === 'wine') type = 'winery'
      else if (t.tourism === 'viewpoint' || t.natural === 'peak') type = 'viewpoint'
      else if (t.tourism === 'attraction' || t.tourism === 'museum' || t.natural === 'beach') type = 'attraction'
      else if (t.route === 'hiking' || t.route === 'foot') type = 'hiking'

      if (!type) continue

      pois.push({
        id: `${el.type}-${el.id}`,
        type,
        name,
        lat: elLat,
        lng: elLng,
        openingHours: t.opening_hours,
        website: t.website || t['contact:website'],
        cuisine: t.cuisine?.split(';')[0],
        description: t.description || t.note,
        routeLength: t.distance || t['route:len'] || t.length,
      })
    }

    poiCache.set(cacheKey, pois)
    return pois
  } catch {
    return []
  }
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

export async function fetchRouteFoodStops(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  diningPrefs: DiningPref[],
): Promise<RouteFoodStop[]> {
  const relevant = diningPrefs.filter((p) => p !== 'SelfCatering')
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
      if (dist > 80) continue  // filter out anything >80km off the direct line

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
