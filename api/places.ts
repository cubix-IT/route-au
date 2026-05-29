import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readFileSync } from 'fs'
import { join } from 'path'

// vercel dev doesn't always inject .env.local into the function process — load manually as fallback
if (!process.env.GOOGLE_PLACES_API_KEY) {
  try {
    for (const file of ['.env.local', '.env']) {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      for (const line of content.split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
      }
    }
  } catch { /* no env file — expected in production */ }
}

const NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.regularOpeningHours',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.editorialSummary',
].join(',')

const CATEGORY_TYPES: Record<string, string[]> = {
  food:          ['restaurant', 'cafe', 'bar', 'pub', 'winery', 'bakery', 'dessert_shop', 'brewery', 'bistro'],
  activities:    ['tourist_attraction', 'park', 'amusement_park', 'zoo', 'aquarium', 'museum', 'art_gallery', 'farm', 'botanical_garden'],
  nature:        ['national_park', 'hiking_area', 'beach', 'nature_preserve', 'scenic_spot', 'campground', 'waterfall'],
  accommodation: ['hotel', 'resort_hotel', 'bed_and_breakfast', 'hostel', 'campground'],
  essentials:    ['gas_station', 'pharmacy', 'atm', 'parking'],
}

// Budget guardrail — in-memory, best-effort (resets on cold start, but IndexedDB
// client-side caching is the primary mechanism preventing repeat API calls).
let instanceRequestCount = 0
const MONTHLY_LIMIT = parseInt(process.env.PLACES_MONTHLY_LIMIT ?? '9000')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { lat, lng, category, radius = '5000' } = req.query as Record<string, string>
  if (!lat || !lng || !category) return res.status(400).json({ error: 'lat, lng, category required' })

  const includedTypes = CATEGORY_TYPES[category]
  if (!includedTypes) return res.status(400).json({ error: 'invalid category' })

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return res.status(200).json({ places: [] })

  // Soft budget guard — return empty rather than allowing overage
  if (instanceRequestCount >= MONTHLY_LIMIT) {
    console.warn(`[places] Budget limit reached (${instanceRequestCount} requests this instance)`)
    return res.status(200).json({ places: [], budgetExhausted: true })
  }

  const radiusM = Math.min(Math.max(parseInt(radius) || 5000, 500), 10000)

  try {
    instanceRequestCount++

    const r = await fetch(NEARBY_URL, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius: radiusM,
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    })

    // Quota exceeded — decrement counter and return empty (do not cache errors)
    if (r.status === 429 || r.status === 403) {
      instanceRequestCount--
      console.warn(`[places] API quota/auth error: ${r.status}`)
      return res.status(200).json({ places: [], quotaExceeded: true })
    }

    if (!r.ok) {
      instanceRequestCount--
      const errText = await r.text().catch(() => '')
      console.error(`[places] API ${r.status}: ${errText}`)
      return res.status(200).json({ places: [] })
    }

    const json = await r.json()
    // Cache for 1 hour at CDN level — client IndexedDB caches for 24h
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({ places: json.places ?? [] })
  } catch (err) {
    instanceRequestCount--
    console.error('[places] fetch error:', err)
    return res.status(200).json({ places: [] })
  }
}
