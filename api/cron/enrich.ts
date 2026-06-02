import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from '../_lib/supabase.js'
import { sendCronEmail, emailWrapper, statusRow } from '../_lib/email.js'

// ─────────────────────────────────────────────────────────────────────────────
// Enrichment cron — 100% free, no API keys required
//
// Data sources:
//   1. Overpass API (OpenStreetMap)  — POIs, food, nature, parks
//   2. Wikipedia REST API            — descriptions & hero thumbnails
//   3. Wikidata SPARQL               — tourist attractions with Wikipedia links
//
// Usage limits & stop conditions:
//   Overpass  : 10,000 queries/day safe limit → hard stop at 9,000/day
//               Stop run if any single query takes >12s (server overloaded)
//               HTTP 429 → stop immediately, mark remaining as skipped
//   Wikipedia : 200 req/min (with User-Agent) → 350ms sleep between calls
//               HTTP 429 → skip destination, log and continue
//   Wikidata  : 60s timeout per query, max 5 parallel → run sequentially
//               Timeout or error → skip, don't retry same run
//
// Schedule: 0 19 * * *  (6am AEST) — daily, 5 destinations per run
// At 5/day all 139 destinations cycle every ~28 days, well within free limits.
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE  = 8   // 8 × (4s Overpass + 3s sleep) ≈ 56s — within 60s Vercel limit
const REFRESH_DAYS = 28    // re-enrich each destination once a month

// ── Usage hard limits ────────────────────────────────────────────────────────
const OVERPASS_DAILY_LIMIT  = 9_000   // stop run if daily total hits this
const OVERPASS_TIMEOUT_MS   = 10_000  // stop run if a query takes longer (node-only queries ~5s)
const WIKIPEDIA_SLEEP_MS    = 350     // min gap between Wikipedia calls
const USER_AGENT = 'UnplannedEscapes/1.0 (unplanned-escapes.vercel.app; contact@unplannedescapes.com.au)'

// ── OSM tag → internal category mapping ─────────────────────────────────────
const FOOD_AMENITY = new Set(['cafe','restaurant','pub','bar','fast_food','food_court','bakery','winery','biergarten','ice_cream'])
const FOOD_SHOP    = new Set(['bakery','pastry','deli','chocolate','coffee'])
const FOOD_CRAFT   = new Set(['brewery','cider','winery','wine','distillery'])
const FOOD_TOURISM = new Set(['winery','wine_cellar'])

const NATURE_NATURAL  = new Set(['peak','beach','waterfall','hot_spring','cliff','cave_entrance','volcano','coastline'])
const NATURE_LEISURE  = new Set(['nature_reserve','common','pitch','dog_park'])
const NATURE_BOUNDARY = new Set(['national_park','protected_area'])

const ACT_TOURISM = new Set(['attraction','museum','artwork','gallery','viewpoint','theme_park','zoo','aquarium','alpine_hut'])
const ACT_LEISURE = new Set(['sports_centre','stadium','golf_course','miniature_golf','swimming_pool','marina','picnic_ground','water_park','amusement_arcade'])
const ACT_AMENITY = new Set(['theatre','cinema','arts_centre','library','marketplace','spa'])

// Fast food chains — never useful for a weekend getaway app
const CHAIN_BLACKLIST = /\b(mcdonald'?s|hungry jack'?s|kfc|subway|domino'?s|pizza hut|red rooster|oporto|nando'?s|grill'?d|betty'?s burgers|guzman|taco bell|carl'?s jr|burger king|wendy'?s|seven.?eleven|7.?eleven|bp|caltex|shell|ampol|united petroleum|woolworths|coles|aldi|chemist warehouse)\b/i

function osmCategory(tags: Record<string,string>): 'food'|'nature'|'activity'|null {
  if (FOOD_AMENITY.has(tags.amenity))    return 'food'
  if (FOOD_SHOP.has(tags.shop))          return 'food'
  if (FOOD_CRAFT.has(tags.craft))        return 'food'
  if (FOOD_TOURISM.has(tags.tourism))    return 'food'
  // Hot springs / mineral springs → activity (wellness), not nature
  if (tags.natural === 'hot_spring' || tags.natural === 'spring') return 'activity'
  // Railways, historic sites → activity
  if (tags.railway === 'station')        return 'activity'
  if (tags.historic)                     return 'activity'
  // Lakes, waterfalls → activity (scenic)
  if (tags.waterway === 'waterfall')     return 'activity'
  if (tags.waterway === 'lake' || tags.waterway === 'reservoir' || tags.waterway === 'dam') return 'activity'
  // Parks and gardens → activity (nature walk / scenic)
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'activity'
  // Markets → activity
  if (tags.amenity === 'marketplace')    return 'activity'
  if (NATURE_NATURAL.has(tags.natural))  return 'nature'
  if (NATURE_LEISURE.has(tags.leisure) && !ACT_LEISURE.has(tags.leisure)) return 'nature'
  if (NATURE_BOUNDARY.has(tags.boundary)) return 'nature'
  if (ACT_TOURISM.has(tags.tourism))     return 'activity'
  if (ACT_LEISURE.has(tags.leisure))     return 'activity'
  if (ACT_AMENITY.has(tags.amenity))     return 'activity'
  return null
}

function activityCategory(tags: Record<string,string>, name: string): string {
  const n = name.toLowerCase()
  // Viewpoints & scenic
  if (tags.tourism === 'viewpoint' || /lookout|viewpoint|scenic overlook|panorama/.test(n)) return 'viewpoint'
  if (tags.natural === 'peak' || /\bpeak\b|summit|mount\b/.test(n))      return 'viewpoint'
  // Water & nature
  if (tags.natural === 'waterfall' || /waterfall|falls(?!.?creek)/.test(n)) return 'nature'
  if (tags.natural === 'beach' || tags.leisure === 'beach_resort' || /\bbeach\b|\bcoast\b/.test(n)) return 'beach'
  if (tags.natural === 'hot_spring' || /hot spring|mineral spring|thermal|bathhouse|day spa/.test(n)) return 'wellness'
  // Culture & history
  if (tags.railway === 'station' || /railway|train station|historic station/.test(n)) return 'history'
  if (tags.historic || /museum|heritage|historic|history|colonial|ruins|memorial|courthouse|gaol/.test(n)) return 'history'
  if (tags.tourism === 'gallery' || tags.amenity === 'arts_centre' || /gallery|art centre|art space/.test(n)) return 'art'
  // Markets
  if (tags.amenity === 'marketplace' || /\bmarket\b|farmers market|night market|sunday market/.test(n)) return 'markets'
  // Lakes & water features
  if (tags.waterway === 'lake' || tags.waterway === 'reservoir' || /\blake\b|\breservoir\b/.test(n)) return 'nature'
  if (tags.waterway === 'waterfall' || /waterfall|falls(?!.?creek)/.test(n)) return 'nature'
  // Wildlife
  if (/wildlife|sanctuary|zoo|koala|penguin|seal|dolphin|animal park/.test(n)) return 'wildlife'
  // Parks & nature reserves
  if (tags.leisure === 'nature_reserve' || tags.boundary === 'national_park' || /national park|state park|nature reserve/.test(n)) return 'nature'
  if (/\bgarden\b|botanic|arboretum/.test(n))                             return 'nature'
  if (/forest|bush walk|rainforest/.test(n))                              return 'nature'
  // Active & adventure
  if (/adventure|zipline|treetop|ropes|rock climb|absei/.test(n))        return 'active'
  if (tags.leisure === 'sports_centre' || /sports centre|leisure centre/.test(n)) return 'active'
  if (tags.leisure === 'golf_course' || /golf/.test(n))                   return 'active'
  // Relaxation & wellness
  if (tags.amenity === 'spa' || tags.leisure === 'spa' || /\bspa\b|wellness|retreat|day spa/.test(n)) return 'relaxation'
  // Entertainment
  if (tags.leisure === 'stadium' || tags.amenity === 'theatre' || tags.amenity === 'cinema') return 'entertainment'
  // Drink experiences — their own categories
  if (/winery|cellar door|vineyard|wine tasting/.test(n))                 return 'winery'
  if (/brewery|brewpub|brew house|craft beer/.test(n))                    return 'brewery'
  if (/distillery|\bgin\b|whisky|whiskey|spirits/.test(n))                return 'distillery'
  return 'nature'
}

function activityEmoji(category: string): string {
  const map: Record<string,string> = {
    viewpoint:'🌄', nature:'🌿', beach:'🏖️', wellness:'♨️', history:'🏛️',
    art:'🎨', markets:'🛒', wildlife:'🦘', entertainment:'🎵', active:'🧗',
    relaxation:'🧖', nature_reserve:'🌿',
    winery:'🍷', brewery:'🍺', distillery:'🥃',
  }
  return map[category] ?? '📍'
}

function foodCategory(tags: Record<string,string>, name: string): string {
  const n = name.toLowerCase()
  if (tags.craft === 'brewery' || tags.craft === 'cider' || /brewery|brewing|brewpub/.test(n)) return 'Brewery'
  if (tags.craft === 'distillery' || /distillery|\bgin\b|whisky|whiskey/.test(n)) return 'Distillery'
  if (tags.amenity === 'winery' || tags.tourism === 'winery' || tags.craft === 'winery' || /winery|cellar door|vineyard/.test(n)) return 'Winery'
  if (tags.amenity === 'pub' || tags.amenity === 'bar' || tags.amenity === 'biergarten') return 'Pub'
  if (tags.shop === 'bakery' || tags.amenity === 'bakery' || /bakery|bakehouse|patisserie/.test(n)) return 'Bakery'
  if (tags.amenity === 'cafe' || tags.shop === 'coffee' || tags.amenity === 'ice_cream') return 'Cafe'
  if (tags.amenity === 'fast_food') return 'Cafe'
  return 'Restaurant'
}

function natureType(tags: Record<string,string>): string {
  if (tags.boundary === 'national_park' || /national park/.test((tags.name||'').toLowerCase())) return 'national_park'
  return 'nature_reserve'
}

// Quality filter without ratings:
// Food: must have name + (website OR phone OR opening_hours) — shows it's an active business
// Activities: all named OSM tourism/leisure features qualify (OSM is curated, not spam)
// Nature: all named natural features qualify
const CRAFT_TYPES = new Set(['brewery','cider','winery','wine','distillery'])
function foodQualifies(tags: Record<string,string>): boolean {
  // Exclude chain fast food & fuel stations — not weekend getaway recommendations
  if (CHAIN_BLACKLIST.test(tags.name || '')) return false
  // Craft venues (winery/brewery/distillery) are premium weekend getaway content — include even without contact details
  if (CRAFT_TYPES.has(tags.craft) || tags.tourism === 'winery' || tags.tourism === 'wine_cellar') return true
  // Must have at least one contact/hours signal — shows it's an active local business
  return !!(tags.website || tags['contact:website'] || tags.phone || tags['contact:phone'] || tags.opening_hours)
}

// ── Overpass fetch with usage tracking ──────────────────────────────────────

interface UsageState {
  overpassCallsToday: number
  overpassSlowCount: number   // consecutive slow responses
  wikipediaCallsThisRun: number
  lastWikipediaCall: number   // timestamp
  stopped: boolean
  stopReason: string | null
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'
// Fallback mirrors if primary is slow
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function getDailyOverpassCount(): Promise<number> {
  if (!adminSupabase) return 0
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await adminSupabase
    .from('cron_log')
    .select('records_upserted')
    .gte('run_at', today)
    .eq('job_name', 'overpass-calls')
  return (data ?? []).reduce((s: number, r: any) => s + (r.records_upserted ?? 0), 0)
}

async function fetchOverpass(
  query: string,
  usage: UsageState,
  mirrorIndex = 0,
): Promise<any[] | null> {
  if (usage.stopped) return null
  if (usage.overpassCallsToday >= OVERPASS_DAILY_LIMIT) {
    usage.stopped = true
    usage.stopReason = `Overpass daily limit reached (${usage.overpassCallsToday} calls)`
    return null
  }

  const endpoint = OVERPASS_MIRRORS[mirrorIndex % OVERPASS_MIRRORS.length]
  const start = Date.now()
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: query,
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
    })

    const elapsed = Date.now() - start
    usage.overpassCallsToday++

    if (res.status === 429) {
      usage.stopped = true
      usage.stopReason = 'Overpass HTTP 429 — rate limited, stopping run'
      return null
    }
    if (!res.ok) return []

    // If response was very slow, note it (but don't stop yet unless consecutive)
    if (elapsed > 8_000) {
      usage.overpassSlowCount++
      if (usage.overpassSlowCount >= 2) {
        usage.stopped = true
        usage.stopReason = `Overpass consistently slow (${elapsed}ms) — server overloaded, stopping`
        return null
      }
    } else {
      usage.overpassSlowCount = 0
    }

    const json = await res.json()
    return json.elements ?? []
  } catch (err: any) {
    if (err?.name === 'TimeoutError') {
      usage.overpassSlowCount++
      if (usage.overpassSlowCount >= 2) {
        usage.stopped = true
        usage.stopReason = 'Overpass timeout twice in a row — stopping run'
        return null
      }
      // Try next mirror once
      if (mirrorIndex < OVERPASS_MIRRORS.length - 1) {
        return fetchOverpass(query, usage, mirrorIndex + 1)
      }
    }
    return []
  }
}

// ── Quality scoring ──────────────────────────────────────────────────────────
// Stored as attributes.quality_score (0–100). Used to sort activities in UI.
// Primary signal: Wikipedia monthly pageviews (if the place has a wiki article).
// Fallback: OSM tag richness — more tags = more notable/active place.

function calcQualityScore(tags: Record<string,string>, wikiViews: number): number {
  let score = 0
  // Pageviews signal (most powerful — reflects real-world interest)
  if (wikiViews > 10_000) score += 55
  else if (wikiViews > 5_000) score += 45
  else if (wikiViews > 1_000) score += 35
  else if (wikiViews > 200)  score += 20
  else if (wikiViews > 0)    score += 10
  // OSM tag signals (fallback when no wiki article)
  if (tags.wikipedia)  score += 20
  if (tags.wikidata)   score += 15
  if (tags.tourism === 'attraction') score += 10
  if (tags.website || tags['contact:website']) score += 5
  if (tags.opening_hours) score += 3
  if (tags.description) score += 3
  if (tags.phone || tags['contact:phone']) score += 2
  return Math.min(score, 100)
}

// ── Wikipedia pageviews fetch ─────────────────────────────────────────────────
// Returns average monthly views over the last 3 months, or 0 if no article.

async function fetchWikiPageviews(wikiSlug: string): Promise<number> {
  try {
    const end = new Date()
    const start = new Date(end)
    start.setMonth(start.getMonth() - 3)
    const fmt = (d: Date) => d.toISOString().slice(0,7).replace('-','') + '01'
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/${encodeURIComponent(wikiSlug)}/monthly/${fmt(start)}/${fmt(end)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return 0
    const json = await res.json() as { items?: { views: number }[] }
    const items = json.items ?? []
    if (!items.length) return 0
    return Math.round(items.reduce((s, i) => s + i.views, 0) / items.length)
  } catch { return 0 }
}

// ── Wikipedia fetch with rate limiting ──────────────────────────────────────

async function fetchWikiSummary(
  name: string,
  usage: UsageState,
): Promise<string | null> {
  if (usage.stopped) return null

  // Enforce minimum gap between Wikipedia calls
  const gap = Date.now() - usage.lastWikipediaCall
  if (gap < WIKIPEDIA_SLEEP_MS) {
    await sleep(WIKIPEDIA_SLEEP_MS - gap)
  }

  const attempts = [`${name}, Victoria, Australia`, name]
  for (const attempt of attempts) {
    try {
      const slug = encodeURIComponent(attempt.replace(/ /g, '_'))
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
        {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(6_000),
        },
      )
      usage.lastWikipediaCall = Date.now()
      usage.wikipediaCallsThisRun++

      if (res.status === 429) {
        console.warn('[wikipedia] 429 received — skipping remaining Wikipedia calls this run')
        return null
      }
      if (!res.ok) continue

      const json = await res.json()
      if (!json.extract || json.extract.length < 50 || json.type === 'disambiguation') continue

      const match = json.extract.match(/^(.+?[.!?](?:\s.+?[.!?])?)(?:\s|$)/)
      return match ? match[1].trim() : json.extract.slice(0, 280)
    } catch { /* timeout or network */ }
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Main enrichment for one sub-destination ──────────────────────────────────

async function enrichSubDest(
  subDestId: number,
  slug: string,
  name: string,
  lat: number,
  lng: number,
  usage: UsageState,
): Promise<number> {
  if (usage.stopped) return 0

  // Always stamp enriched_at first — even if Overpass fails, destination moves
  // to end of queue so we don't loop on the same slug forever
  await adminSupabase
    .from('sub_destinations')
    .update({ enriched_at: new Date().toISOString() })
    .eq('sub_dest_id', subDestId)

  // Tiered radius by distance from Melbourne CBD:
  // inner suburbs (< 15km): 2km — avoid swamping with city-wide results
  // regional towns (15–80km): 10km — standard town coverage
  // rural/remote (80km+): 20km — sparse OSM needs wider net
  const MELB_LAT = -37.814, MELB_LNG = 144.963
  const distFromCBD = Math.sqrt((lat - MELB_LAT) ** 2 + (lng - MELB_LNG) ** 2) * 111
  const r = distFromCBD < 15 ? 2_000 : distFromCBD < 80 ? 10_000 : 20_000

  const limit = distFromCBD < 15 ? 120 : distFromCBD < 80 ? 200 : 300
  // nwr = node/way/relation — captures both point POIs and area-mapped venues (wineries, parks, etc.)
  const query = `[out:json][timeout:20];
(
  nwr["tourism"~"^(attraction|museum|gallery|viewpoint|zoo|aquarium|winery|wine_cellar|alpine_hut|picnic_site)$"]["name"](around:${r},${lat},${lng});
  nwr["natural"~"^(peak|beach|waterfall|hot_spring|spring|cliff|cave_entrance)$"]["name"](around:${r},${lat},${lng});
  nwr["amenity"~"^(cafe|restaurant|pub|bar|bakery|winery|fast_food|marketplace|spa|theatre|cinema|arts_centre|ice_cream|biergarten)$"]["name"](around:${r},${lat},${lng});
  nwr["shop"~"^(bakery|pastry|deli|coffee|chocolate)$"]["name"](around:${r},${lat},${lng});
  nwr["craft"~"^(brewery|cider|winery|wine|distillery)$"]["name"](around:${r},${lat},${lng});
  nwr["leisure"~"^(nature_reserve|garden|park|marina|dog_park)$"]["name"](around:${r},${lat},${lng});
  nwr["boundary"~"^(national_park|protected_area)$"]["name"](around:${r},${lat},${lng});
  nwr["historic"]["name"](around:${r},${lat},${lng});
  nwr["railway"="station"]["name"](around:${r},${lat},${lng});
  nwr["waterway"~"^(waterfall|lake|reservoir|dam)$"]["name"](around:${r},${lat},${lng});
);
out center tags ${limit};`

  const elements = await fetchOverpass(query, usage)
  if (!elements) return 0

  const activities: any[] = []
  const foods: any[] = []
  const nature: any[] = []
  const seenSlugs = new Set<string>()

  for (const el of elements) {
    const tags = el.tags ?? {}
    const name_ = tags.name
    if (!name_) continue

    const elSlug = `osm-${el.type}-${el.id}`
    if (seenSlugs.has(elSlug)) continue
    seenSlugs.add(elSlug)

    const elLat = el.lat ?? el.center?.lat ?? null
    const elLng = el.lon ?? el.center?.lon ?? null
    const website = tags.website || tags['contact:website'] || null
    const phone   = tags.phone   || tags['contact:phone']   || null
    const address = tags['addr:full'] || (tags['addr:street']
      ? `${tags['addr:housenumber'] ? tags['addr:housenumber'] + ' ' : ''}${tags['addr:street']}, ${tags['addr:suburb'] || tags['addr:city'] || ''}`.trim()
      : null)

    const cat = osmCategory(tags)
    if (!cat) continue

    if (cat === 'food') {
      if (!foodQualifies(tags)) continue
      foods.push({
        slug: elSlug, sub_dest_id: subDestId,
        name: name_, category: foodCategory(tags, name_),
        description: tags.description || null,
        lat: elLat, lng: elLng, address,
        attributes: {
          source: 'static',
          opening_hours_text: tags.opening_hours || null,
          website_uri: website,
          cuisine: tags.cuisine?.split(';')[0] || null,
          wikipedia: tags.wikipedia || null,
          wikidata: tags.wikidata || null,
          quality_score: calcQualityScore(tags, 0),
        },
        source: 'static',
      })
    } else if (cat === 'nature') {
      // Only keep nature spots that are real visitor destinations.
      // Government survey parcels (e.g. "Beavers Hill", "I85 Bushland Reserve", "Coliban I7")
      // have no website/phone/hours and names that are uninformative to visitors.
      const hasContactInfo = !!(website || tags.phone || tags['contact:phone'] || tags.opening_hours)
      const hasDescription = !!(tags.description || tags.note)
      // Name patterns that indicate a real visitor destination
      const isVisitorName = /national park|state park|regional park|state forest|conservation park|wilderness park|marine park|scenic reserve|natural features reserve|historic reserve|falls\b|waterfall|gorge|\blake\b|\blagoon\b|\breservoir\b|mineral spring|hot spring|\bbeach\b|\bocean\b|\bbay\b|botanic garden|lookout|summit track|heritage|^wombat|^mount\b|^mt\b/i.test(name_)
      // Exclude code-named survey parcels: "I85 Bushland Reserve", "H79 Bushland Reserve", "K47 Streamside"
      const isSurveyParcel = /\b[A-Z]\d+\b/.test(name_) || /\bI\d+\b/.test(name_)
      if (isSurveyParcel) continue
      if (!hasContactInfo && !hasDescription && !isVisitorName) continue
      nature.push({
        slug: elSlug, sub_dest_id: subDestId,
        name: name_,
        type: natureType(tags),
        description: tags.description || null,
        lat: elLat, lng: elLng, address,
        source: 'static',
        attributes: {
          source: 'static',
          website_uri: website,
          opening_hours_text: tags.opening_hours || null,
          wikipedia: tags.wikipedia || null,
          wikidata: tags.wikidata || null,
          quality_score: calcQualityScore(tags, 0),
        },
      })
    } else {
      const actCat = activityCategory(tags, name_)
      activities.push({
        slug: elSlug, sub_dest_id: subDestId,
        name: name_, category: actCat,
        emoji: activityEmoji(actCat),
        description: tags.description || null,
        duration: null, cost: 'free',
        lat: elLat, lng: elLng, address,
        kids_ok: tags.min_age ? parseInt(tags.min_age) <= 5 : true,
        is_hidden_gem: false,
        maps_url: elLat && elLng ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name_)}+Victoria+Australia` : null,
        website, phone, tags: Object.keys(tags),
        source: 'static',
        attributes: {
          source: 'static',
          website_uri: website,
          opening_hours_text: tags.opening_hours || null,
          wikipedia: tags.wikipedia || null,
          wikidata: tags.wikidata || null,
          quality_score: calcQualityScore(tags, 0),
        },
      })
    }
  }

  // Wikipedia descriptions: prioritise items with an explicit `wikipedia` OSM tag, then top unnamed items
  if (!usage.stopped) {
    // Items with a wikipedia tag — guaranteed match, up to 5 per dest
    const withWikiTag = [
      ...activities.filter(a => a.attributes?.wikipedia && !a.description),
      ...foods.filter(f => f.attributes?.wikipedia && !f.description),
      ...nature.filter(n => n.attributes?.wikipedia && !n.description),
    ].slice(0, 5)
    for (const item of withWikiTag) {
      if (usage.stopped) break
      const title = item.attributes.wikipedia.replace(/^en:/i, '')
      const wiki = await fetchWikiSummary(title, usage)
      if (wiki) item.description = wiki
    }
    // Top activity without a description — name-based lookup
    if (!usage.stopped) {
      const topAct = activities.find(a => !a.description)
      if (topAct) {
        const wiki = await fetchWikiSummary(topAct.name, usage)
        if (wiki) topAct.description = wiki
      }
    }
    // Top winery/brewery/distillery without a description
    if (!usage.stopped) {
      const topDrink = foods.find(f =>
        ['Winery','Brewery','Distillery'].includes(f.category) && !f.description,
      )
      if (topDrink) {
        const wiki = await fetchWikiSummary(topDrink.name, usage)
        if (wiki) topDrink.description = wiki
      }
    }
  }

  // ── Wikipedia pageviews → quality_score upgrade ───────────────────────────
  // For any item with a `wikipedia` OSM tag, fetch 3-month avg pageviews and
  // recompute quality_score with the real popularity signal.
  // Cap at 10 items per dest run to stay within time budget.
  const wikiItems = [
    ...activities.filter(a => a.attributes?.wikipedia),
    ...nature.filter(n => n.attributes?.wikipedia),
    ...foods.filter(f => f.attributes?.wikipedia),
  ].slice(0, 10)

  for (const item of wikiItems) {
    const slug = (item.attributes.wikipedia as string).replace(/^en:/i, '').replace(/ /g, '_')
    const views = await fetchWikiPageviews(slug)
    if (views > 0) {
      item.attributes.wiki_monthly_views = views
      // Rebuild quality_score with actual pageviews
      item.attributes.quality_score = calcQualityScore(
        { wikipedia: item.attributes.wikipedia as string, wikidata: item.attributes.wikidata as string },
        views,
      )
    }
    await sleep(200) // gentle rate limiting — 5 req/s well within 200 req/min limit
  }

  if (!adminSupabase) return 0
  let upserted = 0

  // Upsert activities
  if (activities.length > 0) {
    const { error } = await adminSupabase
      .from('activities')
      .upsert(activities, { onConflict: 'slug', ignoreDuplicates: false })
    if (!error) upserted += activities.length
    else console.error('[enrich] activities upsert error:', error.message)
  }

  // Upsert food_places
  if (foods.length > 0) {
    const { error } = await adminSupabase
      .from('food_places')
      .upsert(foods, { onConflict: 'slug', ignoreDuplicates: false })
    if (!error) upserted += foods.length
    else console.error('[enrich] food upsert error:', error.message)
  }

  // Upsert nature_spots
  if (nature.length > 0) {
    const { error } = await adminSupabase
      .from('nature_spots')
      .upsert(nature, { onConflict: 'slug', ignoreDuplicates: false })
    if (!error) upserted += nature.length
    else console.error('[enrich] nature upsert error:', error.message)
  }

  // Generate Claude descriptions for items that have none
  await generateDescriptions(slug, name, activities, foods)

  console.log(`[enrich] ${slug}: ${activities.length} activities, ${foods.length} food, ${nature.length} nature — overpass calls so far: ${usage.overpassCallsToday}`)
  return upserted
}

async function generateDescriptions(
  slug: string,
  destName: string,
  activities: any[],
  foods: any[],
) {
  if (!adminSupabase) return

  const allItems = [
    ...activities.filter(a => !a.description).slice(0, 20).map(a => ({ ...a, _table: 'activities' })),
    ...foods.filter(f => !f.description).slice(0, 20).map(f => ({ ...f, _table: 'food_places' })),
  ]
  if (allItems.length === 0) return

  const resolved: Record<string, string> = {}

  // 1. Wikidata — short factual description from structured data
  for (const item of allItems) {
    const wdId = item.tags?.includes?.('wikidata') ? null : null // wikidata tag stored in OSM tags array
    // OSM tags are stored as Object.keys(tags) — wikidata value not preserved, skip
    void wdId
  }

  // 2. Wikipedia — fetch lead paragraph for items with wikipedia OSM tag
  for (const item of allItems) {
    const wpTag = item.attributes?.wikipedia // e.g. "en:Walhalla, Victoria"
    if (!wpTag) continue
    const title = wpTag.replace(/^en:/i, '').replace(/ /g, '_')
    try {
      const r = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { 'User-Agent': 'UnplannedEscapes/1.0 (support@cubixit.com.au)' }, signal: AbortSignal.timeout(5000) }
      )
      if (r.ok) {
        const d = await r.json() as { extract?: string }
        const extract = d.extract?.split('.')[0]
        if (extract && extract.length > 20) resolved[item.slug] = extract + '.'
      }
    } catch { /* skip */ }
  }

  // 3. Claude Haiku — for remaining items, pass real OSM context so descriptions are specific
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return

  const needClaude = allItems.filter(i => !resolved[i.slug])
  if (needClaude.length === 0) return

  try {
    const itemList = needClaude.map(i => {
      const parts = [`name:"${i.name}"`, `category:${i.category}`]
      if (i.address) parts.push(`address:"${i.address}"`)
      if (i.attributes?.opening_hours_text) parts.push(`hours:"${i.attributes.opening_hours_text}"`)
      if (i.website) parts.push(`has website`)
      if (i.phone) parts.push(`has phone`)
      return `- slug:"${i.slug}" ${parts.join(' ')}`
    }).join('\n')

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        temperature: 0.2,
        system: `You are a local travel writer for Victoria, Australia.
Write one specific, vivid sentence (15-25 words) for each place — describing what it actually is and what makes it worth visiting.
Use the address, hours, and category clues to be accurate. Avoid generic phrases like "a great place to visit" or "must-see attraction".
Be concrete: mention the food type, the view, the history, the atmosphere.
Respond ONLY with valid JSON mapping slug to description. No markdown.`,
        messages: [{
          role: 'user',
          content: `Places near ${destName}, Victoria:\n${itemList}\n\nJSON: {"slug":"description",...}`,
        }],
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!r.ok) return
    const data = await r.json() as { content?: { text: string }[] }
    const text = data.content?.[0]?.text?.trim() ?? ''
    const start = text.indexOf('{'), end = text.lastIndexOf('}')
    if (start === -1 || end === -1) return
    const descriptions: Record<string, string> = JSON.parse(text.slice(start, end + 1))

    for (const [dslug, desc] of Object.entries(descriptions)) {
      if (!desc || typeof desc !== 'string') continue
      resolved[dslug] = desc.slice(0, 220)
    }
  } catch (e) {
    console.error('[enrich] description generation error:', e instanceof Error ? e.message : e)
    return
  }

  // Write to DB
  let written = 0
  for (const [dslug, desc] of Object.entries(resolved)) {
    const item = allItems.find(i => i.slug === dslug)
    if (!item) continue
    const { error } = await adminSupabase.from(item._table).update({ description: desc }).eq('slug', dslug)
    if (!error) written++
  }
  if (written > 0) console.log(`[enrich] ${slug}: wrote ${written} descriptions`)
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!adminSupabase) return res.status(500).json({ error: 'Supabase not configured' })

  // ── Supabase DB size guard — stop before hitting 500MB free limit ─────────
  // Rough estimate: count rows across main tables × 2KB avg
  const SUPABASE_STOP_MB = 450  // stop at 450MB, hard limit is 500MB
  try {
    const tables = ['activities', 'food_places', 'nature_spots', 'accommodation']
    let totalRows = 0
    for (const t of tables) {
      const { count } = await adminSupabase.from(t).select('*', { count: 'exact', head: true })
      totalRows += count ?? 0
    }
    const estimatedMB = Math.round(totalRows * 2 / 1024)
    if (estimatedMB >= SUPABASE_STOP_MB) {
      return res.status(429).json({
        error: `Supabase DB size limit approached (${estimatedMB}MB / 500MB free). Enrichment paused.`,
        estimated_mb: estimatedMB,
        limit_mb: 500,
      })
    }
  } catch { /* non-fatal — proceed */ }

  const force     = req.query.force === '1'
  const batchSize = Math.min(parseInt(String(req.query.limit ?? BATCH_SIZE)), 10)
  const runAt     = new Date().toISOString()

  // ── Usage state for this run ─────────────────────────────────────────────
  const usage: UsageState = {
    overpassCallsToday:    await getDailyOverpassCount(),
    overpassSlowCount:     0,
    wikipediaCallsThisRun: 0,
    lastWikipediaCall:     0,
    stopped:               false,
    stopReason:            null,
  }

  // Pre-flight: refuse to start if already near daily Overpass limit
  if (usage.overpassCallsToday >= OVERPASS_DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Overpass daily limit reached',
      overpassCallsToday: usage.overpassCallsToday,
      limit: OVERPASS_DAILY_LIMIT,
    })
  }

  try {
    const staleDate = new Date(Date.now() - REFRESH_DAYS * 24 * 60 * 60 * 1000).toISOString()

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
      await logCronRun(runAt, 'ok', 'All destinations fresh — nothing to do', 0, 0, usage)
      return res.status(200).json({ ok: true, message: 'All destinations fresh', usage: usageSummary(usage) })
    }

    let totalUpserted = 0
    let processed = 0
    const results: any[] = []

    for (const sub of subDests) {
      if (usage.stopped) break

      const upserted = await enrichSubDest(
        sub.sub_dest_id, sub.slug, sub.name, sub.lat, sub.lng, usage,
      )
      totalUpserted += upserted
      processed++
      results.push({ slug: sub.slug, upserted, overpassCallsUsed: usage.overpassCallsToday })

      // 3s pause between destinations — prevents Overpass burst rate limiting (429)
      if (!usage.stopped && processed < subDests.length) await sleep(3000)
    }

    // Count how many destinations are still pending
    const { count: remaining } = await adminSupabase
      .from('sub_destinations')
      .select('*', { count: 'exact', head: true })
      .or(`enriched_at.is.null,enriched_at.lt.${staleDate}`)

    const status = usage.stopped ? 'stopped' : 'ok'
    const message = usage.stopped
      ? `Stopped early: ${usage.stopReason}`
      : `Enriched ${processed} destinations, ${totalUpserted} records upserted`

    await logCronRun(runAt, status, message, totalUpserted, processed, usage)

    // Send email only when all destinations are done (or stopped early due to limits)
    const icon = usage.stopped ? '⚠️' : '✅'
    if (usage.stopped || (remaining ?? 0) === 0) {
      const rows = results.map((r: any) =>
        statusRow(r.slug.replace(/-/g, ' '), `${r.upserted} records`, r.upserted > 0)
      ).join('')
      await sendCronEmail(
        `${icon} Daily top-up — ${processed} destinations, ${totalUpserted} records`,
        emailWrapper(`Daily top-up · ${new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Melbourne', weekday: 'short', day: 'numeric', month: 'short' })} AEST`, `
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            ${statusRow('Status', usage.stopped ? `Stopped — ${usage.stopReason}` : 'Completed', !usage.stopped)}
            ${statusRow('Destinations processed', String(processed))}
            ${statusRow('Records added', String(totalUpserted))}
            ${statusRow('Remaining', String(remaining ?? 0))}
            ${statusRow('Overpass calls', `${usage.overpassCallsToday} / ${OVERPASS_DAILY_LIMIT}`)}
          </table>
          ${results.length > 0 ? `<div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Destinations</div>
          <table style="width:100%;border-collapse:collapse">${rows}</table>` : ''}
        `)
      )
    }

    return res.status(200).json({
      ok: true,
      processed,
      totalUpserted,
      remaining: remaining ?? 0,
      stoppedEarly: usage.stopped,
      stopReason: usage.stopReason,
      results,
      usage: usageSummary(usage),
    })
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    await logCronRun(runAt, 'error', msg, 0, 0, usage)
    return res.status(500).json({ error: msg, usage: usageSummary(usage) })
  }
}

function usageSummary(u: UsageState) {
  return {
    overpassCallsToday:    u.overpassCallsToday,
    overpassDailyLimit:    OVERPASS_DAILY_LIMIT,
    overpassRemaining:     OVERPASS_DAILY_LIMIT - u.overpassCallsToday,
    overpassUsedPct:       Math.round((u.overpassCallsToday / OVERPASS_DAILY_LIMIT) * 100),
    wikipediaCallsThisRun: u.wikipediaCallsThisRun,
    stopped:               u.stopped,
    stopReason:            u.stopReason,
  }
}

async function logCronRun(
  runAt: string, status: string, message: string,
  records: number, destinations: number, usage: UsageState,
) {
  if (!adminSupabase) return
  await adminSupabase.from('cron_log').insert({
    job_name: 'enrich-overpass',
    run_at: runAt,
    completed_at: new Date().toISOString(),
    status,
    message,
    records_upserted: records,
    destinations_processed: destinations,
    duration_ms: Date.now() - new Date(runAt).getTime(),
    notes: JSON.stringify(usageSummary(usage)),
  })
}
