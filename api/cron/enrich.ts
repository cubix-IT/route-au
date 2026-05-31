import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from '../_lib/supabase.js'

// Called daily at 3am AEST by Vercel Cron (vercel.json: "0 17 * * *")
// Only enriches destinations that haven't been enriched in the last REFRESH_DAYS days.
// Processes BATCH_SIZE destinations per run sequentially — avoids Google rate limits.
// Pass ?force=1 to ignore the 7-day check and re-enrich the next batch regardless.
// Pass ?limit=N to override batch size (max 10 to stay in free tier).
const BATCH_SIZE = 5
const REFRESH_DAYS = 7
const RADIUS = 10000  // 10km

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!adminSupabase) return res.status(500).json({ error: 'Supabase not configured' })

  const gKey = process.env.GOOGLE_PLACES_API_KEY
  if (!gKey) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY not configured' })

  const force = req.query.force === '1'
  const batchSize = Math.min(parseInt(String(req.query.limit ?? BATCH_SIZE)), 10)
  const runAt = new Date().toISOString()
  let recordsUpserted = 0
  let destinationsProcessed = 0
  let skipped = 0

  try {
    const staleDate = new Date(Date.now() - REFRESH_DAYS * 24 * 60 * 60 * 1000).toISOString()

    // Only fetch destinations that need enriching:
    //   enriched_at IS NULL  → never been enriched
    //   enriched_at < 7 days ago → stale, needs refresh
    // Ordered by enriched_at ASC (nulls first) so never-enriched ones go first,
    // then oldest-enriched next — always prioritises the most outdated.
    let query = adminSupabase
      .from('sub_destinations')
      .select('sub_dest_id, slug, name, lat, lng, enriched_at')
      .order('enriched_at', { ascending: true, nullsFirst: true })
      .limit(batchSize)

    if (!force) {
      query = query.or(`enriched_at.is.null,enriched_at.lt.${staleDate}`)
    }

    const { data: subDests, error: sdErr } = await query
    if (sdErr) throw sdErr

    if (!subDests?.length) {
      // All destinations are fresh — nothing to do
      await adminSupabase.from('cron_log').insert({
        job_name: 'enrich-places',
        run_at: runAt,
        completed_at: new Date().toISOString(),
        status: 'ok',
        message: `All destinations fresh (enriched within ${REFRESH_DAYS} days) — skipped`,
        records_upserted: 0,
        destinations_processed: 0,
        duration_ms: Date.now() - new Date(runAt).getTime(),
      })
      await adminSupabase.from('cron_status').upsert({
        job_name: 'enrich-places',
        last_run_at: runAt,
        last_success_at: new Date().toISOString(),
      }, { onConflict: 'job_name' })
      return res.status(200).json({ ok: true, recordsUpserted: 0, destinationsProcessed: 0, skipped: 0, message: 'All fresh' })
    }

    // Process sequentially — avoids hammering Google's rate limit
    // (parallel was causing silent failures on initial load)
    for (const sub of subDests) {
      const added = await enrichSubDest(gKey, sub.sub_dest_id, sub.slug, sub.name, sub.lat, sub.lng)
      recordsUpserted += added
      destinationsProcessed++

      // Mark enriched_at immediately after each destination
      await adminSupabase
        .from('sub_destinations')
        .update({ enriched_at: new Date().toISOString() })
        .eq('sub_dest_id', sub.sub_dest_id)
    }

    const remaining = await getRemainingCount(staleDate, force)

    await adminSupabase.from('cron_log').insert({
      job_name: 'enrich-places',
      run_at: runAt,
      completed_at: new Date().toISOString(),
      status: 'ok',
      message: `Enriched ${destinationsProcessed} destinations. ${remaining} still need refresh.`,
      records_upserted: recordsUpserted,
      destinations_processed: destinationsProcessed,
      duration_ms: Date.now() - new Date(runAt).getTime(),
    })

    await adminSupabase.from('cron_status').upsert({
      job_name: 'enrich-places',
      last_run_at: runAt,
      last_success_at: new Date().toISOString(),
      total_records_upserted: recordsUpserted,
    }, { onConflict: 'job_name' })

    return res.status(200).json({ ok: true, recordsUpserted, destinationsProcessed, skipped, remaining })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/enrich]', msg)

    await adminSupabase.from('cron_log').insert({
      job_name: 'enrich-places',
      run_at: runAt,
      completed_at: new Date().toISOString(),
      status: 'error',
      message: msg,
      records_upserted: recordsUpserted,
      destinations_processed: destinationsProcessed,
      duration_ms: Date.now() - new Date(runAt).getTime(),
    }).then(() => {}, () => {})

    await adminSupabase.from('cron_status').upsert({
      job_name: 'enrich-places',
      last_run_at: runAt,
      last_error_at: new Date().toISOString(),
      last_error_message: msg,
    }, { onConflict: 'job_name' }).then(() => {}, () => {})

    return res.status(500).json({ error: msg })
  }
}

async function getRemainingCount(staleDate: string, force: boolean): Promise<number> {
  if (!adminSupabase) return 0
  let q = adminSupabase.from('sub_destinations').select('*', { count: 'exact', head: true })
  if (!force) q = q.or(`enriched_at.is.null,enriched_at.lt.${staleDate}`)
  const { count } = await q
  return count ?? 0
}

// ── Google Places fetchers ────────────────────────────────────────────────────

interface OpenHoursPeriod {
  open: { day: number; hour: number; minute: number }
  close?: { day: number; hour: number; minute: number }
}

interface GPlace {
  place_id: string
  name: string
  geometry: { location: { lat: number; lng: number } }
  types: string[]
  primary_type?: string   // v1 primaryType — more specific than types[]
  vicinity?: string
  business_status?: string
  rating?: number
  user_ratings_total?: number
  editorial_summary?: string
  website_uri?: string
  opening_hours_periods?: OpenHoursPeriod[]
}

// Google Places API v1 (New) — returns cuisine-level types like chinese_restaurant, italian_restaurant
// Much richer type taxonomy than the old Nearby Search API.
async function fetchByType(
  apiKey: string, lat: number, lng: number, type: string,
): Promise<GPlace[]> {
  const body = {
    includedTypes: [type],
    maxResultCount: 20,
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius: RADIUS },
    },
  }
  const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // Request specific fields — only pay for what we use
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.formattedAddress,places.rating,places.userRatingCount,places.businessStatus,places.primaryType,places.editorialSummary,places.websiteUri,places.regularOpeningHours',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  })
  if (!resp.ok) return []
  const data = await resp.json() as { places?: PlacesV1Result[] }
  return (data.places ?? [])
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY' && p.businessStatus !== 'CLOSED_TEMPORARILY')
    .map((p) => ({
      place_id: p.id,
      name: p.displayName?.text ?? '',
      geometry: { location: { lat: p.location.latitude, lng: p.location.longitude } },
      types: p.types ?? [],
      primary_type: p.primaryType,
      vicinity: p.formattedAddress,
      rating: p.rating,
      user_ratings_total: p.userRatingCount,
      business_status: p.businessStatus,
      editorial_summary: p.editorialSummary?.text,
      website_uri: p.websiteUri,
      opening_hours_periods: p.regularOpeningHours?.periods,
    }))
}

interface PlacesV1Result {
  id: string
  displayName?: { text: string }
  location: { latitude: number; longitude: number }
  types?: string[]
  formattedAddress?: string
  rating?: number
  userRatingCount?: number
  businessStatus?: string
  primaryType?: string
  editorialSummary?: { text: string }
  websiteUri?: string
  regularOpeningHours?: { periods?: OpenHoursPeriod[] }
}

// Text Search via Places API v1 — catches lookouts, waterfalls, wineries, trails etc.
async function fetchByKeyword(
  apiKey: string, lat: number, lng: number, keyword: string,
): Promise<GPlace[]> {
  const body = {
    textQuery: keyword,
    maxResultCount: 20,
    locationBias: {
      circle: { center: { latitude: lat, longitude: lng }, radius: RADIUS },
    },
  }
  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.formattedAddress,places.rating,places.userRatingCount,places.businessStatus,places.primaryType,places.editorialSummary,places.websiteUri,places.regularOpeningHours',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  })
  if (!resp.ok) return []
  const data = await resp.json() as { places?: PlacesV1Result[] }
  return (data.places ?? [])
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY' && p.businessStatus !== 'CLOSED_TEMPORARILY')
    .map((p) => ({
      place_id: p.id,
      name: p.displayName?.text ?? '',
      geometry: { location: { lat: p.location.latitude, lng: p.location.longitude } },
      types: p.types ?? [],
      vicinity: p.formattedAddress,
      rating: p.rating,
      user_ratings_total: p.userRatingCount,
      business_status: p.businessStatus,
      editorial_summary: p.editorialSummary?.text,
      website_uri: p.websiteUri,
      opening_hours_periods: p.regularOpeningHours?.periods,
    }))
}

// ── Classification ────────────────────────────────────────────────────────────

// Cuisine types from Google Places API v1 — used for wizard filtering
// Maps v1 type string → human-readable cuisine label
const CUISINE_TYPE_MAP: Record<string, string> = {
  chinese_restaurant: 'Chinese', japanese_restaurant: 'Japanese',
  thai_restaurant: 'Thai', vietnamese_restaurant: 'Vietnamese',
  korean_restaurant: 'Korean', indian_restaurant: 'Indian',
  italian_restaurant: 'Italian', french_restaurant: 'French',
  greek_restaurant: 'Greek', mediterranean_restaurant: 'Mediterranean',
  mexican_restaurant: 'Mexican', american_restaurant: 'American',
  seafood_restaurant: 'Seafood', steak_house: 'Steakhouse',
  pizza_restaurant: 'Pizza', sushi_restaurant: 'Sushi',
  ramen_restaurant: 'Ramen', burger_restaurant: 'Burgers',
  vegetarian_restaurant: 'Vegetarian', vegan_restaurant: 'Vegan',
  breakfast_restaurant: 'Breakfast', brunch_restaurant: 'Brunch',
  fine_dining_restaurant: 'Fine Dining', gastropub: 'Gastropub',
  wine_bar: 'Wine Bar', cocktail_bar: 'Cocktail Bar',
  sports_bar: 'Sports Bar', pub: 'Pub',
  coffee_shop: 'Cafe', tea_house: 'Tea House',
  bakery: 'Bakery', dessert_shop: 'Desserts',
  ice_cream_shop: 'Ice Cream', sandwich_shop: 'Sandwiches',
  winery: 'Winery', brewery: 'Brewery', distillery: 'Distillery',
}

function extractCuisineTags(types: string[]): string[] {
  return types
    .filter((t) => t in CUISINE_TYPE_MAP)
    .map((t) => CUISINE_TYPE_MAP[t])
    .filter(Boolean)
}

// Explicit food/drink — take priority over point_of_interest which Google adds to everything
const EXPLICIT_FOOD = new Set([
  'restaurant', 'cafe', 'bar', 'bakery', 'fast_food',
  'meal_takeaway', 'meal_delivery', 'winery',
  // Places API v1 cuisine types — all map to food
  ...Object.keys(CUISINE_TYPE_MAP),
])

// Strong activity types that override park/nature classification
const STRONG_ACTIVITY = new Set([
  'tourist_attraction', 'zoo', 'aquarium', 'amusement_park', 'amusement_center',
  'museum', 'art_gallery', 'bowling_alley', 'casino', 'stadium', 'spa',
  'movie_theater', 'night_club',
])

// Nature types (parks, reserves, natural features)
const NATURE_TYPES = new Set(['campground', 'natural_feature', 'park', 'rv_park'])

// Accommodation types
const ACCOMMODATION_TYPES = new Set(['lodging', 'campground', 'rv_park'])

// Service types — NOT searched by default, but classified if they appear.
// To enable: add the type to the searches array in enrichSubDest.
const SERVICE_TYPES = new Set([
  'bank', 'atm', 'hospital', 'pharmacy', 'police',
  'doctor', 'dentist', 'veterinary_care', 'fire_station',
  'post_office', 'local_government_office',
])

// Types that are experiences/destinations — override food classification even if cafe/restaurant also in types
const EXPERIENCE_PRIMARY = new Set([
  'market', 'tourist_attraction', 'farm', 'garden', 'historical_landmark',
  'historical_place', 'cultural_landmark', 'national_park', 'zoo', 'aquarium',
  'amusement_park', 'art_gallery', 'museum', 'vineyard', 'winery',
])

function classifyGPlace(types: string[], primaryType?: string): 'activity' | 'food' | 'nature' | 'accommodation' | 'service' | null {
  // Primary type wins — a market with a cafe corner is still a market
  if (primaryType && EXPERIENCE_PRIMARY.has(primaryType)) return 'activity'
  if (types.some((t) => EXPLICIT_FOOD.has(t))) return 'food'
  if (types.some((t) => ACCOMMODATION_TYPES.has(t))) return 'accommodation'
  if (types.some((t) => SERVICE_TYPES.has(t))) return 'service'
  if (types.some((t) => STRONG_ACTIVITY.has(t))) return 'activity'
  if (types.some((t) => NATURE_TYPES.has(t))) return 'nature'
  if (types.includes('point_of_interest')) return 'activity'
  return null
}

// Use place name + types to pick the best activity category
function categoryFromPlace(name: string, types: string[]): { category: string; emoji: string } {
  const n = name.toLowerCase()

  // Name-based detection — catches lookouts, waterfalls, trails etc. that Google types as generic
  if (/lookout|lookout point|scenic lookout|summit|peak|mountain top/.test(n))
    return { category: 'viewpoint', emoji: '🌄' }
  if (/waterfall|falls(?!\s*creek)|cascade/.test(n))
    return { category: 'nature', emoji: '💧' }
  if (/walk|trail|track|hiking|hike|nature walk/.test(n))
    return { category: 'active', emoji: '🥾' }
  if (/beach|coast|cove|bay(?! area)/.test(n))
    return { category: 'beach', emoji: '🏖️' }
  if (/winery|cellar door|vineyard|wine/.test(n))
    return { category: 'drink', emoji: '🍷' }
  if (/brewery|brew|beer/.test(n))
    return { category: 'drink', emoji: '🍺' }
  if (/distillery|gin|whisky|whiskey/.test(n))
    return { category: 'drink', emoji: '🥃' }
  if (/hot spring|mineral spring|thermal|bathhouse/.test(n))
    return { category: 'wellness', emoji: '♨️' }
  if (/museum|heritage|historic|history/.test(n))
    return { category: 'history', emoji: '🏛️' }
  if (/gallery|art|sculpture/.test(n))
    return { category: 'art', emoji: '🎨' }
  if (/market|farmers|growers/.test(n))
    return { category: 'markets', emoji: '🛒' }
  if (/zoo|sanctuary|wildlife|animal|koala|penguin/.test(n))
    return { category: 'wildlife', emoji: '🦘' }
  if (/park|reserve|garden|forest|national/.test(n))
    return { category: 'nature', emoji: '🌿' }
  if (/adventure|treetop|ropes|zipline|climb/.test(n))
    return { category: 'active', emoji: '🧗' }
  if (/spa|wellness|retreat|health/.test(n))
    return { category: 'relaxation', emoji: '🧖' }

  // Type-based fallback
  if (types.includes('amusement_park') || types.includes('amusement_center'))
    return { category: 'active', emoji: '🎢' }
  if (types.includes('aquarium')) return { category: 'wildlife', emoji: '🐠' }
  if (types.includes('art_gallery')) return { category: 'art', emoji: '🎨' }
  if (types.includes('museum')) return { category: 'history', emoji: '🏛️' }
  if (types.includes('zoo')) return { category: 'wildlife', emoji: '🦘' }
  if (types.includes('spa')) return { category: 'relaxation', emoji: '♨️' }
  if (types.includes('bowling_alley')) return { category: 'active', emoji: '🎳' }
  if (types.includes('stadium')) return { category: 'active', emoji: '🏟️' }
  if (types.includes('night_club') || types.includes('movie_theater'))
    return { category: 'entertainment', emoji: '🎵' }
  if (types.includes('campground')) return { category: 'relaxation', emoji: '⛺' }
  if (types.includes('natural_feature')) return { category: 'nature', emoji: '🌿' }
  if (types.includes('park')) return { category: 'nature', emoji: '🌳' }

  return { category: 'nature', emoji: '📍' }
}

function foodCategoryFromTypes(types: string[]): string {
  // Cellar door experiences — each kept distinct, not lumped together
  if (types.some((t) => ['distillery'].includes(t))) return 'Distillery'
  if (types.some((t) => ['brewery'].includes(t))) return 'Brewery'
  if (types.some((t) => ['winery', 'wine_bar'].includes(t))) return 'Winery'
  // Pub / gastropub
  if (types.some((t) => ['pub', 'gastropub', 'sports_bar'].includes(t))) return 'Pub'
  // Bakery / desserts
  if (types.some((t) => ['bakery', 'dessert_shop', 'ice_cream_shop'].includes(t))) return 'Bakery'
  // Cafe / coffee
  if (types.some((t) => ['cafe', 'coffee_shop', 'tea_house', 'breakfast_restaurant', 'brunch_restaurant'].includes(t))) return 'Cafe'
  // Bar
  if (types.some((t) => ['bar', 'cocktail_bar'].includes(t))) return 'Bar'
  // Restaurant (catches all cuisine subtypes like italian_restaurant, chinese_restaurant etc.)
  if (types.some((t) => t.endsWith('_restaurant') || t === 'restaurant' || t === 'fine_dining_restaurant' || t === 'steak_house')) return 'Restaurant'
  return 'Restaurant'
}

function natureTypeFromGoogleTypes(types: string[]): string {
  if (types.includes('campground') || types.includes('rv_park')) return 'national_park'
  if (types.includes('natural_feature')) return 'nature_reserve'
  return 'nature_reserve'
}

function accommodationTypeFromGoogleTypes(name: string, types: string[]): string {
  const n = name.toLowerCase()
  if (types.includes('campground') || /campground|campsite|camping/.test(n)) return 'campsite'
  if (types.includes('rv_park') || /caravan|rv park|holiday park/.test(n)) return 'caravan_park'
  if (/motel/.test(n)) return 'motel'
  if (/resort/.test(n)) return 'resort'
  if (/hostel|backpacker/.test(n)) return 'hostel'
  if (/cabin|cottage|chalet/.test(n)) return 'cabin'
  if (/bed.and.breakfast|b&b|bnb/.test(n)) return 'bed_and_breakfast'
  if (/guest.house|guesthouse/.test(n)) return 'guest_house'
  return 'hotel'
}

// ── Main enrichment ───────────────────────────────────────────────────────────

async function enrichSubDest(
  gKey: string, subDestId: number, slug: string, name: string, lat: number, lng: number,
): Promise<number> {
  if (!adminSupabase) return 0

  // Type-based searches — comprehensive coverage
  const typeSearches = await Promise.all([
    fetchByType(gKey, lat, lng, 'tourist_attraction'),
    fetchByType(gKey, lat, lng, 'restaurant'),
    fetchByType(gKey, lat, lng, 'cafe'),
    fetchByType(gKey, lat, lng, 'bar'),
    fetchByType(gKey, lat, lng, 'bakery'),
    fetchByType(gKey, lat, lng, 'meal_takeaway'),
    fetchByType(gKey, lat, lng, 'museum'),
    fetchByType(gKey, lat, lng, 'art_gallery'),
    fetchByType(gKey, lat, lng, 'park'),
    fetchByType(gKey, lat, lng, 'campground'),
    fetchByType(gKey, lat, lng, 'natural_feature'),
    fetchByType(gKey, lat, lng, 'spa'),
    fetchByType(gKey, lat, lng, 'amusement_park'),
    fetchByType(gKey, lat, lng, 'winery'),
    fetchByType(gKey, lat, lng, 'zoo'),
    fetchByType(gKey, lat, lng, 'aquarium'),
    fetchByType(gKey, lat, lng, 'bowling_alley'),
    fetchByType(gKey, lat, lng, 'night_club'),
    fetchByType(gKey, lat, lng, 'movie_theater'),
    fetchByType(gKey, lat, lng, 'lodging'),
  ])

  // Keyword text searches — catches lookouts, waterfalls, wineries, trails
  // that Google doesn't give a specific type but shows on Maps
  const keywordSearches = await Promise.all([
    fetchByKeyword(gKey, lat, lng, `scenic lookout near ${name} Victoria`),
    fetchByKeyword(gKey, lat, lng, `waterfall near ${name} Victoria`),
    fetchByKeyword(gKey, lat, lng, `walking trail near ${name} Victoria`),
    fetchByKeyword(gKey, lat, lng, `winery cellar door near ${name} Victoria`),
    fetchByKeyword(gKey, lat, lng, `viewpoint near ${name} Victoria`),
  ])

  // Deduplicate across all searches by place_id
  const allPlaces = new Map<string, GPlace>()
  for (const p of [...typeSearches.flat(), ...keywordSearches.flat()]) {
    allPlaces.set(p.place_id, p)
  }

  const activities: ActivityRow[] = []
  const foods: FoodRow[] = []
  const nature: NatureRow[] = []
  const accommodation: AccommodationRow[] = []

  for (const place of allPlaces.values()) {
    const classification = classifyGPlace(place.types, place.primary_type)
    if (!classification || classification === 'service') continue

    const placeSlug = `${slug}-gp-${place.place_id}`
    const pLat = place.geometry.location.lat
    const pLng = place.geometry.location.lng
    const address = place.vicinity ?? null

    if (classification === 'food') {
      // Only surface genuinely excellent food — send users to Google for generic search.
      const rating = place.rating ?? 0
      const reviewCount = place.user_ratings_total ?? 0
      if (rating < 4.5 || reviewCount < 100) continue

      foods.push({
        slug: placeSlug, sub_dest_id: subDestId, name: place.name,
        category: foodCategoryFromTypes(place.types),
        description: '', lat: pLat, lng: pLng, address,
        // Store cuisine tags from Google Places v1 types (e.g. chinese_restaurant) for wizard filtering
        attributes: {
          google_place_id: place.place_id,
          primary_type: place.primary_type,
          types: place.types,
          cuisine_tags: extractCuisineTags([...(place.primary_type ? [place.primary_type] : []), ...place.types]),
          rating,
          review_count: reviewCount,
          business_status: place.business_status ?? 'OPERATIONAL',
          editorial_summary: place.editorial_summary,
          website_uri: place.website_uri,
          opening_hours_periods: place.opening_hours_periods,
        },
        source: 'google',
      })
    } else if (classification === 'nature') {
      // Nature spots: require at least 4.0★ and 50 reviews to be worth showing
      const rating = place.rating ?? 0
      const reviewCount = place.user_ratings_total ?? 0
      if (rating < 4.0 || reviewCount < 50) continue
      nature.push({
        slug: placeSlug, sub_dest_id: subDestId, name: place.name,
        type: natureTypeFromGoogleTypes(place.types),
        description: '', lat: pLat, lng: pLng, address, source: 'google',
      })
    } else if (classification === 'accommodation') {
      accommodation.push({
        slug: placeSlug, sub_dest_id: subDestId, name: place.name,
        type: accommodationTypeFromGoogleTypes(place.name, place.types),
        description: '', lat: pLat, lng: pLng, address,
        attributes: {
          google_place_id: place.place_id,
          editorial_summary: place.editorial_summary,
          website_uri: place.website_uri,
          opening_hours_periods: place.opening_hours_periods,
        },
        source: 'google',
      })
    } else {
      // Quality filter for activities: 4.5★ + 1,000+ reviews
      const rating = place.rating ?? 0
      const reviewCount = place.user_ratings_total ?? 0
      if (rating < 4.5 || reviewCount < 1000) continue

      // Exclude generic beauty/spa places — only keep genuine experience venues
      // (hot springs, wellness retreats are fine; nail salons and hair salons are not)
      const isGenericBeauty = place.types.some((t) =>
        ['beauty_salon', 'hair_care', 'nail_salon', 'hair_salon', 'barber', 'tattoo_parlor'].includes(t)
      )
      if (isGenericBeauty) continue

      const { category, emoji } = categoryFromPlace(place.name, place.types)
      activities.push({
        slug: placeSlug, sub_dest_id: subDestId, name: place.name,
        category, emoji, description: place.editorial_summary ?? '', duration: '1–2 hrs', cost: '$',
        kids_ok: true, is_hidden_gem: false,
        maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        tags: place.types.slice(0, 5), source: 'google',
        attributes: {
          google_place_id: place.place_id, rating, review_count: reviewCount,
          editorial_summary: place.editorial_summary,
          website_uri: place.website_uri,
          opening_hours_periods: place.opening_hours_periods,
        },
      })
    }
  }

  let total = 0

  const upserts: Array<{ table: string; rows: unknown[] }> = [
    { table: 'activities', rows: activities },
    { table: 'food_places', rows: foods },
    { table: 'nature_spots', rows: nature },
    { table: 'accommodation', rows: accommodation },
  ]

  for (const { table, rows } of upserts) {
    if (!rows.length) continue
    const { error } = await adminSupabase
      .from(table)
      .upsert(rows, { onConflict: 'slug', ignoreDuplicates: true })
    if (!error) total += rows.length
    else console.warn(`[enrich] ${table} error for ${name}:`, error.message)
  }

  return total
}

// ── Row types ─────────────────────────────────────────────────────────────────

interface ActivityRow {
  slug: string; sub_dest_id: number; name: string; category: string
  emoji: string; description: string; duration: string; cost: string
  kids_ok: boolean; is_hidden_gem: boolean; maps_url: string
  tags: string[]; source: string
  attributes?: Record<string, unknown>
}

interface FoodRow {
  slug: string; sub_dest_id: number; name: string; category: string
  description: string; lat: number; lng: number; address: string | null
  attributes: Record<string, unknown>; source: string
}

interface NatureRow {
  slug: string; sub_dest_id: number; name: string; type: string
  description: string; lat: number | null; lng: number | null
  address: string | null; source: string
}

interface AccommodationRow {
  slug: string; sub_dest_id: number; name: string; type: string
  description: string; lat: number | null; lng: number | null
  address: string | null; attributes: Record<string, unknown>; source: string
}
