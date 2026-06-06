/**
 * Local enrichment script — uses Geofabrik Victoria PBF (no Overpass API).
 * Downloads the PBF (~224MB) once per day, parses all POIs into memory,
 * then upserts to Supabase per destination.
 *
 * After each run, appends a log entry to logs/enrich-runs.jsonl and commits+pushes to git.
 *
 * Run:  npm run enrich                     # 8 stale destinations
 *       npm run enrich -- --all            # all stale destinations
 *       npm run enrich -- --limit 20       # up to 20 stale destinations
 *       npm run enrich -- --slug healesville  # one specific destination
 *       npm run enrich -- --force          # re-enrich regardless of age
 *       npm run enrich -- --no-push        # skip git commit/push (dry run log)
 */

import { createWriteStream, createReadStream, existsSync, statSync, appendFileSync, mkdirSync } from 'fs'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import parseOSM from 'osm-pbf-parser'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''
const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const db = createClient(supabaseUrl, supabaseKey)

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const ALL_MODE    = args.includes('--all')
const FORCE_MODE  = args.includes('--force')
const NO_PUSH     = args.includes('--no-push')
const limitArg    = args.indexOf('--limit')
const slugArg     = args.indexOf('--slug')
const SLUG_FILTER = slugArg !== -1 ? args[slugArg + 1] : null
const BATCH_SIZE  = ALL_MODE ? 9999 : limitArg !== -1 ? parseInt(args[limitArg + 1]) : 8
const REFRESH_DAYS = 28

// ── Paths ─────────────────────────────────────────────────────────────────────
const PBF_PATH  = path.resolve(__dirname, '../data/victoria-latest.osm.pbf')
const LOG_PATH  = path.resolve(__dirname, '../logs/enrich-runs.jsonl')
const PBF_URL   = 'https://download.geofabrik.de/australia-oceania/australia/victoria-latest.osm.pbf'
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const USER_AGENT = 'UnplannedEscapes/1.0 (unplanned-escapes.vercel.app; contact@unplannedescapes.com.au)'

// ── Tag sets (same as before) ─────────────────────────────────────────────────
const FOOD_AMENITY  = new Set(['cafe','restaurant','pub','bar','fast_food','food_court','bakery','winery','biergarten','ice_cream'])
const FOOD_SHOP     = new Set(['bakery','pastry','deli','chocolate','coffee'])
const FOOD_CRAFT    = new Set(['brewery','cider','winery','wine','distillery'])
const FOOD_TOURISM  = new Set(['winery','wine_cellar'])
const NATURE_NATURAL  = new Set(['peak','beach','waterfall','hot_spring','cliff','cave_entrance','volcano','coastline'])
const NATURE_LEISURE  = new Set(['nature_reserve','common','pitch','dog_park'])
const NATURE_BOUNDARY = new Set(['national_park','protected_area'])
const ACT_TOURISM = new Set(['attraction','museum','artwork','gallery','viewpoint','theme_park','zoo','aquarium','alpine_hut'])
const ACT_LEISURE = new Set(['sports_centre','stadium','golf_course','miniature_golf','swimming_pool','marina','picnic_ground','water_park','amusement_arcade'])
const ACT_AMENITY = new Set(['theatre','cinema','arts_centre','library','marketplace','spa'])
const CHAIN_BLACKLIST = /\b(mcdonald'?s|hungry jack'?s|kfc|subway|domino'?s|pizza hut|red rooster|oporto|nando'?s|grill'?d|betty'?s burgers|guzman|taco bell|carl'?s jr|burger king|wendy'?s|seven.?eleven|7.?eleven|bp|caltex|shell|ampol|united petroleum|woolworths|coles|aldi|chemist warehouse)\b/i

// Coord-pin for natural features (OSM has precise coords) — named search shows all nearby spots instead
function isNaturalFeature(tags: Record<string,string>): boolean {
  return !!(tags.natural || tags.waterway || tags.boundary || tags.historic ||
            tags.railway || tags.leisure === 'park' || tags.leisure === 'garden' ||
            tags.leisure === 'nature_reserve' || tags.tourism === 'viewpoint' ||
            tags.tourism === 'attraction' || tags.tourism === 'museum' || tags.tourism === 'gallery')
}
function mapsUrl(name: string, destName: string, lat: number, lon: number, tags: Record<string,string>): string {
  if (isNaturalFeature(tags)) return `https://maps.google.com/maps?q=${lat},${lon}+(${encodeURIComponent(name)})`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ', ' + destName)}&ll=${lat},${lon}`
}
const CRAFT_TYPES = new Set(['brewery','cider','winery','wine','distillery'])

function osmCategory(tags: Record<string,string>): 'food'|'nature'|'activity'|null {
  if (FOOD_AMENITY.has(tags.amenity))    return 'food'
  if (FOOD_SHOP.has(tags.shop))          return 'food'
  if (FOOD_CRAFT.has(tags.craft))        return 'food'
  if (FOOD_TOURISM.has(tags.tourism))    return 'food'
  if (tags.natural === 'hot_spring' || tags.natural === 'spring') return 'activity'
  if (tags.railway === 'station' || tags.railway === 'narrow_gauge' || tags.railway === 'preserved' || tags.railway === 'heritage') return 'activity'
  if (tags.historic)                     return 'activity'
  if (tags.waterway === 'waterfall')     return 'activity'
  if (tags.waterway === 'lake' || tags.waterway === 'reservoir' || tags.waterway === 'dam') return 'activity'
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'activity'
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
  // Peaks = hiking, not viewpoints (you hike to a peak)
  if (tags.natural === 'peak' || /\bpeak\b|summit/.test(n))              return 'active'
  if (tags.tourism === 'viewpoint' || /lookout|viewpoint|scenic overlook|panorama/.test(n)) return 'viewpoint'
  if (tags.natural === 'waterfall' || /waterfall|falls(?!.?creek)/.test(n)) return 'nature'
  if (tags.natural === 'beach' || tags.leisure === 'beach_resort' || /\bbeach\b|\bcoast\b/.test(n)) return 'beach'
  if (tags.natural === 'hot_spring' || /hot spring|mineral spring|thermal|bathhouse|day spa/.test(n)) return 'wellness'
  if (tags.railway === 'narrow_gauge' || tags.railway === 'preserved' || tags.railway === 'heritage' || /puffing billy|steam train|steam railway|heritage railway|narrow.gauge/.test(n)) return 'entertainment'
  if (tags.railway === 'station' || /railway|train station|historic station/.test(n)) return 'history'
  // Historic people, events, sites — catch names like "Ned Kelly's Capture", "Burke & Wills"
  if (tags.historic || /museum|heritage|historic|history|colonial|ruins|memorial|courthouse|gaol|capture|battle|gold rush|explorers?|ned kelly|burke|wills|bushranger/.test(n)) return 'history'
  if (tags.tourism === 'gallery' || tags.amenity === 'arts_centre' || /gallery|art centre|art space/.test(n)) return 'art'
  if (tags.amenity === 'marketplace' || /\bmarket\b|farmers market|night market|sunday market/.test(n)) return 'markets'
  if (tags.waterway === 'lake' || tags.waterway === 'reservoir' || /\blake\b|\breservoir\b/.test(n)) return 'nature'
  if (/wildlife|sanctuary|zoo|koala|penguin|seal|dolphin|animal park/.test(n)) return 'wildlife'
  if (tags.leisure === 'nature_reserve' || tags.boundary === 'national_park' || /national park|state park|nature reserve/.test(n)) return 'nature'
  if (/\bgarden\b|botanic|arboretum/.test(n)) return 'nature'
  if (/forest|bush walk|rainforest/.test(n)) return 'nature'
  if (/adventure|zipline|treetop|ropes|rock climb|absei|hik(e|ing)|trail/.test(n)) return 'active'
  if (tags.leisure === 'sports_centre' || /sports centre|leisure centre/.test(n)) return 'active'
  if (tags.leisure === 'golf_course' || /golf/.test(n)) return 'active'
  if (tags.amenity === 'spa' || tags.leisure === 'spa' || /\bspa\b|wellness|retreat|day spa/.test(n)) return 'relaxation'
  if (tags.leisure === 'stadium' || tags.amenity === 'theatre' || tags.amenity === 'cinema') return 'entertainment'
  if (/winery|cellar door|vineyard|wine tasting|brewery|brewpub|brew house|craft beer|distillery|\bgin\b|whisky|whiskey|spirits/.test(n)) return 'drink'
  // Food-named attractions (cheese factory, dairy, farm shop etc.) → food, not nature
  if (/cheese|dairy|\bfarm\b|cider|olive|honey|chocolate|confection|providore|deli|pantry|smokehouse|preserves/.test(n)) return 'food'
  return 'nature'
}

function activityEmoji(cat: string): string {
  const m: Record<string,string> = { viewpoint:'🌄', nature:'🌿', beach:'🏖️', wellness:'♨️', history:'🏛️', art:'🎨', markets:'🛒', wildlife:'🦘', entertainment:'🎵', active:'🧗', relaxation:'🧖', drink:'🍷', food:'🍽️', family:'🎠', sports:'⚽', shopping:'🛍️' }
  return m[cat] ?? '📍'
}

function foodCategory(tags: Record<string,string>, name: string): string {
  const n = name.toLowerCase()
  if (tags.craft === 'brewery' || tags.craft === 'cider' || /brewery|brewing|brewpub/.test(n)) return 'Brewery'
  if (tags.craft === 'distillery' || /distillery|\bgin\b|whisky|whiskey/.test(n)) return 'Distillery'
  if (tags.amenity === 'winery' || tags.tourism === 'winery' || tags.craft === 'winery' || /winery|cellar door|vineyard/.test(n)) return 'Winery'
  if (tags.amenity === 'pub' || tags.amenity === 'bar' || tags.amenity === 'biergarten') return 'Pub'
  if (tags.shop === 'bakery' || tags.amenity === 'bakery' || /bakery|bakehouse|patisserie/.test(n)) return 'Bakery'
  if (tags.amenity === 'ice_cream' || /ice.?cream|gelato|sorbet/.test(n)) return 'Cafe'
  if (tags.amenity === 'cafe' || tags.shop === 'coffee') return 'Cafe'
  if (tags.amenity === 'fast_food') return 'Restaurant'  // treat as restaurant, not cafe
  return 'Restaurant'
}

function natureType(tags: Record<string,string>): string {
  if (tags.boundary === 'national_park' || /national park/.test((tags.name||'').toLowerCase())) return 'national_park'
  return 'nature_reserve'
}

// Accommodation tags — these belong in the accommodation table, not activities or food
const ACCOM_TAGS = new Set(['hotel','motel','guest_house','hostel','apartment','chalet','alpine_hut'])
const ACCOM_NAME = /\b(hotel|motel|lodge|resort|inn\b|b&b|bed.and.breakfast|caravan park|campground|glamping|retreat|holiday park|motor inn|country club)\b/i

function isAccommodation(tags: Record<string,string>): boolean {
  return ACCOM_TAGS.has(tags.tourism) || ACCOM_NAME.test(tags.name || '')
}

function foodQualifies(tags: Record<string,string>): boolean {
  if (CHAIN_BLACKLIST.test(tags.name || '')) return false
  if (isAccommodation(tags)) return false  // hotels etc. belong in accommodation, not food
  // Craft venues always qualify — destination-worthy experiences
  if (CRAFT_TYPES.has(tags.craft) || tags.tourism === 'winery' || tags.tourism === 'wine_cellar') return true
  // Pubs and restaurants — need contact info to show they're active businesses
  if (tags.amenity === 'pub' || tags.amenity === 'bar' || tags.amenity === 'restaurant') {
    return !!(tags.website || tags['contact:website'] || tags.phone || tags['contact:phone'] || tags.opening_hours)
  }
  // Cafes and bakeries — only if notable (Wikipedia article means tourist-worthy, e.g. Beechworth Bakery)
  if (tags.amenity === 'cafe' || tags.amenity === 'bakery' || tags.shop === 'bakery' || tags.shop === 'coffee') {
    return !!(tags.wikipedia || tags.wikidata)
  }
  return !!(tags.website || tags['contact:website'] || tags.phone || tags['contact:phone'] || tags.opening_hours)
}

function calcQualityScore(tags: Record<string,string>, wikiViews: number): number {
  let s = 0
  if (wikiViews > 10_000) s += 55
  else if (wikiViews > 5_000) s += 45
  else if (wikiViews > 1_000) s += 35
  else if (wikiViews > 200)  s += 20
  else if (wikiViews > 0)    s += 10
  if (tags.wikipedia)  s += 20
  if (tags.wikidata)   s += 15
  if (tags.tourism === 'attraction') s += 10
  if (tags.website || tags['contact:website']) s += 5
  if (tags.opening_hours) s += 3
  if (tags.description) s += 3
  if (tags.phone || tags['contact:phone']) s += 2
  return Math.min(s, 100)
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

// ── Geofabrik download ────────────────────────────────────────────────────────
async function ensurePbf(): Promise<void> {
  mkdirSync(path.dirname(PBF_PATH), { recursive: true })

  if (existsSync(PBF_PATH)) {
    const age = Date.now() - statSync(PBF_PATH).mtimeMs
    if (age < MAX_AGE_MS) {
      const mb = (statSync(PBF_PATH).size / 1024 / 1024).toFixed(0)
      console.log(`PBF cached (${mb} MB, ${Math.round(age/60000)} min old) — skipping download`)
      return
    }
    console.log('PBF >1 day old, re-downloading...')
  } else {
    console.log('Downloading Victoria PBF from Geofabrik (~224 MB)...')
  }

  const res = await fetch(PBF_URL, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`Geofabrik download failed: HTTP ${res.status}`)

  const total = parseInt(res.headers.get('content-length') ?? '0')
  let received = 0, lastPct = -1
  const writer = createWriteStream(PBF_PATH)
  const reader = res.body!.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.length
    writer.write(value)
    if (total) {
      const pct = Math.floor(received / total * 100)
      if (pct !== lastPct && pct % 10 === 0) {
        process.stdout.write(`  ${pct}% (${(received/1024/1024).toFixed(0)} MB / ${(total/1024/1024).toFixed(0)} MB)\n`)
        lastPct = pct
      }
    }
  }
  await new Promise<void>((res, rej) => writer.end(err => err ? rej(err) : res()))
  console.log(`Downloaded: ${(statSync(PBF_PATH).size/1024/1024).toFixed(0)} MB`)
}

// ── PBF parsing ───────────────────────────────────────────────────────────────
// A POI is any named OSM element with a tag we care about.
interface Poi {
  type: 'node' | 'way'
  id: number
  lat: number
  lon: number
  tags: Record<string,string>
}

// Two-pass parse:
// Pass 1 — collect all relevant nodes + record which node IDs ways need for centroids
// Pass 2 — collect centroid coords for those way node refs, compute centroids for ways
async function parsePbf(): Promise<Poi[]> {
  const RELEVANT_TAG_KEYS = ['tourism','natural','amenity','shop','craft','leisure','boundary','historic','waterway','railway']

  function isRelevant(tags: Record<string,string>): boolean {
    return RELEVANT_TAG_KEYS.some(k => tags[k]) && !!tags.name
  }

  // ── Pass 1 ──────────────────────────────────────────────────────────────────
  process.stdout.write('Pass 1: scanning nodes and ways...')
  const pois: Poi[] = []
  const relevantWays: Array<{ id: number; tags: Record<string,string>; refs: number[] }> = []
  const neededNodeIds = new Set<number>()

  await pipeline(
    createReadStream(PBF_PATH),
    parseOSM() as any,
    new Transform({
      objectMode: true,
      transform(items: any[], _enc, cb) {
        for (const item of items) {
          if (item.type === 'node') {
            if (isRelevant(item.tags ?? {})) {
              pois.push({ type: 'node', id: item.id, lat: item.lat, lon: item.lon, tags: item.tags })
            }
          } else if (item.type === 'way') {
            if (isRelevant(item.tags ?? {})) {
              relevantWays.push({ id: item.id, tags: item.tags, refs: item.refs ?? [] })
              for (const ref of (item.refs ?? [])) neededNodeIds.add(ref)
            }
          }
        }
        cb()
      },
    }),
  )
  process.stdout.write(` done. ${pois.length.toLocaleString()} tagged nodes, ${relevantWays.length.toLocaleString()} tagged ways\n`)

  // ── Pass 2 ──────────────────────────────────────────────────────────────────
  process.stdout.write(`Pass 2: resolving ${neededNodeIds.size.toLocaleString()} node coords for way centroids...`)
  const nodeCoords = new Map<number, [number, number]>()

  await pipeline(
    createReadStream(PBF_PATH),
    parseOSM() as any,
    new Transform({
      objectMode: true,
      transform(items: any[], _enc, cb) {
        for (const item of items) {
          if (item.type === 'node' && neededNodeIds.has(item.id)) {
            nodeCoords.set(item.id, [item.lat, item.lon])
          }
          // Ways come after nodes in PBF — once we hit ways we're done collecting coords
          if (item.type === 'way') break
        }
        cb()
      },
    }),
  )
  process.stdout.write(` resolved ${nodeCoords.size.toLocaleString()}\n`)

  // Compute centroids for ways
  for (const way of relevantWays) {
    const coords = way.refs.map(id => nodeCoords.get(id)).filter(Boolean) as [number, number][]
    if (coords.length === 0) continue
    const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length
    const lon = coords.reduce((s, c) => s + c[1], 0) / coords.length
    pois.push({ type: 'way', id: way.id, lat, lon, tags: way.tags })
  }

  console.log(`Total POIs in Victoria: ${pois.length.toLocaleString()}`)
  return pois
}

// ── Lookup POIs near a destination ───────────────────────────────────────────
function nearbyPois(allPois: Poi[], lat: number, lng: number, radiusKm: number): Poi[] {
  return allPois.filter(p => haversineKm(lat, lng, p.lat, p.lon) <= radiusKm)
}

// ── Wikipedia ─────────────────────────────────────────────────────────────────
let lastWikiCall = 0

async function fetchWikiSummary(name: string): Promise<string | null> {
  const gap = Date.now() - lastWikiCall
  if (gap < 350) await sleep(350 - gap)
  for (const attempt of [`${name}, Victoria, Australia`, name]) {
    try {
      const slug = encodeURIComponent(attempt.replace(/ /g, '_'))
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
        headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6_000),
      })
      lastWikiCall = Date.now()
      if (res.status === 429 || !res.ok) continue
      const json = await res.json() as { extract?: string; type?: string }
      if (!json.extract || json.extract.length < 50 || json.type === 'disambiguation') continue
      const match = json.extract.match(/^(.+?[.!?](?:\s.+?[.!?])?)(?:\s|$)/)
      return match ? match[1].trim() : json.extract.slice(0, 280)
    } catch { /* skip */ }
  }
  return null
}

async function fetchWikiPageviews(wikiSlug: string): Promise<number> {
  try {
    const end = new Date(), start = new Date(end)
    start.setMonth(start.getMonth() - 3)
    const fmt = (d: Date) => d.toISOString().slice(0,7).replace('-','') + '01'
    const res = await fetch(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/${encodeURIComponent(wikiSlug)}/monthly/${fmt(start)}/${fmt(end)}`,
      { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5_000) }
    )
    if (!res.ok) return 0
    const json = await res.json() as { items?: { views: number }[] }
    const items = json.items ?? []
    return items.length ? Math.round(items.reduce((s, i) => s + i.views, 0) / items.length) : 0
  } catch { return 0 }
}

// ── VHD ───────────────────────────────────────────────────────────────────────
interface VhdPlace { id: number; name: string; latlon: string; summary?: string; location?: string; url?: string; vhr_number?: string; primary_image_url?: string }

function stripHtml(str: string): string {
  return str.replace(/&hellip;/g,'…').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()
}

async function fetchVhd(name: string, lat: number, lng: number, radiusKm: number): Promise<VhdPlace[]> {
  try {
    const res = await fetch(`https://api.heritagecouncil.vic.gov.au/v1/places?sub=${encodeURIComponent(name)}&aut=1086&rpp=50`, {
      headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const json = await res.json() as { _embedded?: { places?: VhdPlace[] } }
    return (json._embedded?.places ?? []).filter(p => {
      if (!p.latlon) return false
      const [pLat, pLng] = p.latlon.split(',').map(Number)
      return !isNaN(pLat) && haversineKm(lat, lng, pLat, pLng) <= radiusKm
    })
  } catch { return [] }
}

// ── Descriptions: Wikipedia + Haiku, written to in-memory objects ────────────
// Must be called BEFORE quality filtering so descriptions inform what gets upserted.
async function fillDescriptions(destName: string, activities: any[], foods: any[]) {
  if (!anthropicKey) return

  // Items to enrich: those without a description, PLUS those with a wikipedia tag
  // (Wikipedia always wins over a short OSM description tag like "A bushland haven...")
  const allItems = [
    ...activities.filter(a => !a.description || a.attributes?.wikipedia).slice(0, 30),
    ...foods.filter(f => !f.description || f.attributes?.wikipedia).slice(0, 20),
  ]
  if (allItems.length === 0) return

  const resolved: Record<string,string> = {}

  // Wikipedia — for any item with a wikipedia OSM tag
  for (const item of allItems.filter(i => i.attributes?.wikipedia)) {
    try {
      const slug = encodeURIComponent(item.attributes.wikipedia.replace(/^en:/i,'').replace(/ /g,'_'))
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
        headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000),
      })
      if (r.ok) {
        const d = await r.json() as { extract?: string }
        const extract = d.extract?.split('.')[0]
        if (extract && extract.length > 20) resolved[item.slug] = extract + '.'
      }
    } catch { /* skip */ }
  }

  // Haiku batch — for everything still without a description
  const needHaiku = allItems.filter(i => !resolved[i.slug])
  if (needHaiku.length > 0) {
    try {
      const itemList = needHaiku.map(i => {
        const parts = [`name:"${i.name}"`, `category:${i.category}`]
        if (i.address) parts.push(`address:"${i.address}"`)
        if (i.website) parts.push(`has website`)
        return `- slug:"${i.slug}" ${parts.join(' ')}`
      }).join('\n')

      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 2000, temperature: 0.2,
          system: `You are a local travel writer for Victoria, Australia. Write one specific, vivid sentence (15-25 words) for each place. Be concrete — mention the food type, view, history, or atmosphere. Respond ONLY with valid JSON mapping slug to description.`,
          messages: [{ role: 'user', content: `Places near ${destName}, Victoria:\n${itemList}\n\nJSON: {"slug":"description",...}` }],
        }),
        signal: AbortSignal.timeout(30000),
      })
      if (r.ok) {
        const data = await r.json() as { content?: { text: string }[] }
        const text = data.content?.[0]?.text?.trim() ?? ''
        const s = text.indexOf('{'), e = text.lastIndexOf('}')
        if (s !== -1 && e !== -1) {
          const descs: Record<string,string> = JSON.parse(text.slice(s, e + 1))
          for (const [slug, desc] of Object.entries(descs)) {
            if (desc && typeof desc === 'string') resolved[slug] = desc.slice(0, 220)
          }
        }
      }
    } catch (e: any) { console.error(`  [haiku] ${e?.message}`) }
  }

  // Write resolved descriptions back into the in-memory objects
  let filled = 0
  for (const item of allItems) {
    if (resolved[item.slug]) {
      item.description = resolved[item.slug]
      filled++
    }
  }
  if (filled > 0) console.log(`  [descriptions] filled ${filled} via Wikipedia/Haiku (${Object.keys(resolved).filter(s => allItems.find(i=>i.slug===s && i.attributes?.wikipedia)).length} wiki, ${needHaiku.filter(i=>resolved[i.slug]).length} haiku)`)
}

// ── Wikipedia-first: extract named attractions from the destination's Wikipedia article ──
async function fetchWikipediaAttractions(destName: string, destSlug: string, subDestId: number, allPois: Poi[], lat: number, lng: number): Promise<any[]> {
  if (!anthropicKey) return []
  try {
    // Fetch relevant sections (Tourism, Recreation, Sport, Heritage, Events, Present)
    const wikiPage = encodeURIComponent(destName.replace(/ /g, '_') + ',_Victoria')
    const secRes = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${wikiPage}&prop=sections&format=json`, {
      headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000),
    })
    if (!secRes.ok) return []
    const secData = await secRes.json() as { parse?: { sections?: { number: string; line: string }[] } }
    const sections = secData.parse?.sections ?? []
    const RELEVANT = /tourism|recreation|sport|heritage|event|present|attraction|culture|entertainment|festival/i
    const relevantSections = sections.filter(s => RELEVANT.test(s.line))
    if (relevantSections.length === 0) return []

    // Fetch wikitext for each relevant section
    const texts: string[] = []
    for (const sec of relevantSections.slice(0, 4)) {
      const r = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${wikiPage}&prop=wikitext&section=${sec.number}&format=json`, {
        headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000),
      })
      if (!r.ok) continue
      const d = await r.json() as { parse?: { wikitext?: { '*': string } } }
      let text = d.parse?.wikitext?.['*'] ?? ''
      // Strip wiki markup
      text = text.replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
        .replace(/\{\{[^}]+\}\}/g, '').replace(/==+[^=]=+/g, '')
        .replace(/\'{2,}/g, '').replace(/<ref[^>]*>.*?<\/ref>/gs, '')
        .replace(/<[^>]+>/g, '').trim()
      if (text.length > 50) texts.push(`## ${sec.line}\n${text.slice(0, 800)}`)
    }
    if (texts.length === 0) return []

    // Ask Haiku to extract named attractions as structured data
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 1500, temperature: 0,
        system: `Extract named tourist attractions, recreation venues, events, and notable places from Wikipedia text about ${destName}, Victoria Australia.
Return ONLY a JSON array: [{"name":"...","category":"history|nature|active|wildlife|art|entertainment|markets|viewpoint|beach|relaxation|wellness","description":"one vivid sentence 15-25 words"}]
Only include specific named places/events (not general descriptions). Max 12 items. Skip pubs, restaurants, cafes, wineries — those come from a separate source.`,
        messages: [{ role: 'user', content: texts.join('\n\n') }],
      }),
      signal: AbortSignal.timeout(25000),
    })
    if (!r.ok) return []
    const data = await r.json() as { content?: { text: string }[] }
    const text = data.content?.[0]?.text?.trim() ?? ''
    const s = text.indexOf('['), e = text.lastIndexOf(']')
    if (s === -1 || e === -1) return []
    const items: { name: string; category: string; description: string }[] = JSON.parse(text.slice(s, e + 1))

    // Geocode each item using Photon (near destination lat/lng)
    const results: any[] = []
    for (const item of items.slice(0, 12)) {
      if (!item.name || !item.description || item.name.length < 4) continue
      // First check if already in OSM POIs
      const osmMatch = allPois.find(p => p.tags.name && p.tags.name.toLowerCase().includes(item.name.toLowerCase().slice(0, 15)))
      let itemLat = osmMatch?.lat ?? null
      let itemLng = osmMatch?.lon ?? null

      if (!itemLat || !itemLng) {
        // Try Photon geocoder
        try {
          const q = encodeURIComponent(`${item.name} ${destName} Victoria`)
          const pr = await fetch(`https://photon.komoot.io/api/?q=${q}&limit=1&bbox=140,-39,150,-34`, {
            signal: AbortSignal.timeout(5000),
          })
          if (pr.ok) {
            const pd = await pr.json() as { features?: { geometry: { coordinates: [number, number] } }[] }
            const feat = pd.features?.[0]
            if (feat) { itemLng = feat.geometry.coordinates[0]; itemLat = feat.geometry.coordinates[1] }
          }
        } catch { /* skip */ }
        await sleep(100)
      }

      const wikiSlug = `wiki-${destSlug}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
      results.push({
        slug: wikiSlug, sub_dest_id: subDestId,
        name: item.name, category: item.category,
        emoji: activityEmoji(item.category),
        description: item.description,
        duration: null, cost: 'free', lat: itemLat, lng: itemLng, address: null,
        kids_ok: true, is_hidden_gem: false,
        maps_url: itemLat && itemLng
          ? `https://maps.google.com/maps?q=${itemLat},${itemLng}+(${encodeURIComponent(item.name)})`
          : null,
        website: osmMatch?.tags?.website || null,
        phone: osmMatch?.tags?.phone || null,
        tags: ['wikipedia', item.category], source: 'static',
        attributes: { source: 'static', quality_score: 40, from_wikipedia: true },
      })
    }
    if (results.length > 0) console.log(`  [wikipedia] +${results.length} attractions from Wikipedia article`)
    return results
  } catch (e) {
    return []
  }
}

// ── Enrich one destination ────────────────────────────────────────────────────
async function enrichSubDest(
  allPois: Poi[],
  subDestId: number, slug: string, name: string, lat: number, lng: number,
): Promise<number> {
  await db.from('sub_destinations').update({ enriched_at: new Date().toISOString() }).eq('sub_dest_id', subDestId)

  const MELB_LAT = -37.814, MELB_LNG = 144.963
  const distFromCBD = Math.sqrt((lat - MELB_LAT)**2 + (lng - MELB_LNG)**2) * 111
  // Tighter radius — mountain/rural roads mean 10km straight-line can be 45+ min drive
  const radiusKm = distFromCBD < 15 ? 2 : distFromCBD < 80 ? 6 : 15

  const elements = nearbyPois(allPois, lat, lng, radiusKm)
  console.log(`  Found ${elements.length} POIs within ${radiusKm}km`)

  const activities: any[] = []
  const foods: any[] = []
  const nature: any[] = []
  const seenSlugs = new Set<string>()

  // Wikipedia-first: seed activities from Wikipedia Tourism/Recreation sections
  // Food & Drinks come from OSM only (OSM is reliable for cafes/pubs/wineries)
  const wikiActivities = await fetchWikipediaAttractions(name, slug, subDestId, elements, lat, lng)
  for (const wa of wikiActivities) {
    seenSlugs.add(wa.slug)
    activities.push(wa)
  }

  for (const el of elements) {
    const tags = el.tags
    const name_ = tags.name
    if (!name_) continue
    // Skip names that are raw coordinates (e.g. "-38.123, 145.456" or "145.456,-38.123")
    if (/^-?\d+\.\d+\s*[,;]\s*-?\d+\.\d+$/.test(name_.trim())) continue
    // Skip very short, purely numeric, or single-word junk names
    if (name_.trim().length < 4 || /^\d+$/.test(name_.trim())) continue
    // Skip closed/former/demolished places
    if (/\bclosed\b|\(closed\)|\bformer\b|\bdemolished\b|\bderelict\b|\babandon/i.test(name_)) continue

    const elSlug = `osm-${el.type}-${el.id}`
    if (seenSlugs.has(elSlug)) continue
    seenSlugs.add(elSlug)

    const website = tags.website || tags['contact:website'] || null
    const phone   = tags.phone   || tags['contact:phone']   || null
    const address = tags['addr:full'] || (tags['addr:street']
      ? `${tags['addr:housenumber'] ? tags['addr:housenumber'] + ' ' : ''}${tags['addr:street']}, ${tags['addr:suburb'] || tags['addr:city'] || ''}`.trim()
      : null)

    // Skip libraries — public libraries are not weekend getaway destinations
    if (tags.amenity === 'library') continue

    // Filter out zoo/sanctuary sub-enclosure labels — OSM names like "Dingo1", "Koala",
    // "Lyre Bird", "Platypus" etc. are internal facility markers, not visitor destinations.
    // Pattern: single animal/bird name (optionally followed by a digit), no other context words.
    const ZOO_ENCLOSURE = /^(dingo|koala|kangaroo|wallaby|platypus|wombat|echidna|emu|quoll|tasmanian devil|lyre bird|cassowary|crocodile|snake|lizard|possum|bandicoot|bilby|numbat|bettong|potoroo|pademelon|glider|parrot|cockatoo|lorikeet|pelican|penguin|seal|dingo)\s*\d*$/i
    if (ZOO_ENCLOSURE.test(name_.trim())) continue

    // Skip accommodation entirely — belongs in accommodation table, not enrichment
    if (isAccommodation(tags)) continue

    const cat = osmCategory(tags)
    if (!cat) continue

    if (cat === 'food') {
      if (!foodQualifies(tags)) continue
      const foodCat = foodCategory(tags, name_)
      const foodDesc = tags.description || null
      // Quality gate: generic food (restaurants/cafes/pubs/bakeries) must have a description
      const GENERIC_FOOD = new Set(['Restaurant', 'Cafe', 'Pub', 'Bakery'])
      if (GENERIC_FOOD.has(foodCat) && !foodDesc) continue
      foods.push({
        slug: elSlug, sub_dest_id: subDestId, name: name_, category: foodCat,
        description: foodDesc, lat: el.lat, lng: el.lon, address,
        attributes: { source:'static', opening_hours_text: tags.opening_hours || null, website_uri: website,
          cuisine: tags.cuisine?.split(';')[0] || null, wikipedia: tags.wikipedia || null,
          wikidata: tags.wikidata || null, quality_score: calcQualityScore(tags, 0) },
        source: 'static',
      })
    } else if (cat === 'nature') {
      const hasContact = !!(website || phone || tags.opening_hours)
      const hasDesc    = !!(tags.description || tags.note)
      const isVisitor  = /national park|state park|regional park|state forest|conservation park|wilderness park|marine park|scenic reserve|natural features reserve|historic reserve|falls\b|waterfall|gorge|\blake\b|\blagoon\b|\breservoir\b|mineral spring|hot spring|\bbeach\b|\bocean\b|\bbay\b|botanic garden|lookout|summit track|heritage|^wombat|^mount\b|^mt\b/i.test(name_)
      if (/\b[A-Z]\d+\b/.test(name_) || /\bI\d+\b/.test(name_)) continue
      if (!hasContact && !hasDesc && !isVisitor) continue
      // Quality gate: nature spots must have a description to be stored
      if (!hasDesc) continue
      nature.push({
        slug: elSlug, sub_dest_id: subDestId, name: name_, type: natureType(tags),
        description: tags.description || null, lat: el.lat, lng: el.lon, address, source: 'static',
        attributes: { source:'static', website_uri: website, opening_hours_text: tags.opening_hours || null,
          wikipedia: tags.wikipedia || null, wikidata: tags.wikidata || null, quality_score: calcQualityScore(tags, 0) },
      })
    } else {
      const actCat = activityCategory(tags, name_)
      // For heritage railway stations, derive display name from Wikipedia title or well-known operator names
      // e.g. "Belgrave (Narrow-gauge)" → "Puffing Billy Railway"
      const operator = tags.operator || tags['operator:en'] || ''
      const wikiTitle = (tags.wikipedia || '').replace(/^en:/i, '')
      const isHeritageRailway = tags.railway === 'station' || tags.railway === 'narrow_gauge' || tags.railway === 'preserved' || tags.railway === 'heritage'
      let displayName = name_
      if (isHeritageRailway) {
        // Extract railway name from Wikipedia title: "Belgrave (Puffing Billy) railway station" → "Puffing Billy Railway"
        const pbMatch = wikiTitle.match(/\(([^)]+)\)\s*railway station/i)
        if (pbMatch) displayName = pbMatch[1] + ' Railway'
        // Known operator name mappings
        else if (/puffing billy/i.test(operator)) displayName = 'Puffing Billy Railway'
        else if (/zig.?zag/i.test(operator) || /zig.?zag/i.test(wikiTitle)) displayName = 'Zig Zag Railway'
        else if (/puffing billy/i.test(wikiTitle)) displayName = 'Puffing Billy Railway'
      }
      activities.push({
        slug: elSlug, sub_dest_id: subDestId, name: displayName, category: actCat, emoji: activityEmoji(actCat),
        description: tags.description || null, duration: null, cost: 'free', lat: el.lat, lng: el.lon, address,
        kids_ok: tags.min_age ? parseInt(tags.min_age) <= 5 : true, is_hidden_gem: false,
        maps_url: el.lat && el.lon
          ? mapsUrl(displayName, name, el.lat, el.lon, tags)
          : null,
        website, phone, tags: Object.keys(tags), source: 'static',
        attributes: { source:'static', website_uri: website, opening_hours_text: tags.opening_hours || null,
          wikipedia: tags.wikipedia || null, wikidata: tags.wikidata || null, quality_score: calcQualityScore(tags, 0) },
      })
    }
  }

  // Pageviews quality upgrade
  for (const item of [...activities, ...nature, ...foods].filter(i => i.attributes?.wikipedia).slice(0, 10)) {
    const views = await fetchWikiPageviews((item.attributes.wikipedia as string).replace(/^en:/i,'').replace(/ /g,'_'))
    if (views > 0) {
      item.attributes.wiki_monthly_views = views
      item.attributes.quality_score = calcQualityScore({ wikipedia: item.attributes.wikipedia, wikidata: item.attributes.wikidata }, views)
    }
    await sleep(200)
  }

  // VHD heritage
  await sleep(200)
  const vhdPlaces = await fetchVhd(name, lat, lng, radiusKm)
  for (const vhd of vhdPlaces) {
    const vhdSlug = `vhd-${vhd.id}`
    if (seenSlugs.has(vhdSlug)) continue
    seenSlugs.add(vhdSlug)
    const [vLat, vLng] = vhd.latlon.split(',').map(Number)
    const rawSummary = vhd.summary ? stripHtml(vhd.summary) : null
    const description = rawSummary ? (rawSummary.length > 220 ? rawSummary.slice(0,217).replace(/\s\S*$/,'…') : rawSummary) : null
    activities.push({
      slug: vhdSlug, sub_dest_id: subDestId,
      name: vhd.name.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bOf\b/g,'of').replace(/\bThe\b/g,'the').replace(/^The\b/,'The'),
      category: 'history', emoji: '🏛️', description, duration: null, cost: 'free',
      lat: vLat, lng: vLng, address: vhd.location || null, kids_ok: true, is_hidden_gem: false,
      maps_url: `https://maps.google.com/?q=${vLat},${vLng}`,
      website: vhd.url || null, phone: null, tags: ['heritage','vhr'], source: 'static',
      attributes: { source:'static', vhd_id: vhd.id, vhd_url: vhd.url, vhr_number: vhd.vhr_number, image_url: vhd.primary_image_url, quality_score: 40 },
    })
  }
  if (vhdPlaces.length > 0) console.log(`  [vhd] +${vhdPlaces.length} heritage places`)

  // Fill descriptions BEFORE quality filter — Haiku writes to in-memory objects
  await fillDescriptions(name, activities, foods)

  // Upsert
  let upserted = 0
  const qualityActivities = activities.filter(a => a.description && a.description.trim().length > 20)
  const actSlugs    = qualityActivities.map(a => a.slug)
  const foodSlugs   = foods.map(f => f.slug)
  const natureSlugs = nature.map(n => n.slug)

  // Delete stale records BEFORE inserting — clean slate per destination, no leftovers
  await db.from('activities').delete().eq('sub_dest_id', subDestId)
  await db.from('food_places').delete().eq('sub_dest_id', subDestId)
  await db.from('nature_spots').delete().eq('sub_dest_id', subDestId)

  // Upsert (not insert) — POIs near destination boundaries share slugs across sub_dest_ids
  if (qualityActivities.length > 0) {
    const { error } = await db.from('activities').upsert(qualityActivities, { onConflict: 'slug', ignoreDuplicates: false })
    if (!error) upserted += qualityActivities.length
    else console.error('  [err] activities:', error.message)
  }
  if (foods.length > 0) {
    const { error } = await db.from('food_places').upsert(foods, { onConflict: 'slug', ignoreDuplicates: false })
    if (!error) upserted += foods.length
    else console.error('  [err] food:', error.message)
  }
  if (nature.length > 0) {
    const { error } = await db.from('nature_spots').upsert(nature, { onConflict: 'slug', ignoreDuplicates: false })
    if (!error) upserted += nature.length
    else console.error('  [err] nature:', error.message)
  }

  console.log(`  activities: ${activities.length} found, ${qualityActivities.length} with desc | food: ${foods.length} | nature: ${nature.length} | upserted: ${upserted}`)
  return upserted
}

// ── Git log ───────────────────────────────────────────────────────────────────
function appendRunLog(entry: object) {
  mkdirSync(path.dirname(LOG_PATH), { recursive: true })
  appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8')
}

function gitCommitLog(entry: { destinations: number; upserted: number }) {
  if (NO_PUSH) { console.log('--no-push: skipping git commit'); return }
  try {
    const repoRoot = path.resolve(__dirname, '..')
    execSync(`git -C "${repoRoot}" add logs/enrich-runs.jsonl`, { stdio: 'pipe' })
    execSync(`git -C "${repoRoot}" commit -m "chore: enrich run — ${entry.destinations} dest, ${entry.upserted} records"`, { stdio: 'pipe' })
    execSync(`git -C "${repoRoot}" push`, { stdio: 'pipe' })
    console.log('Log committed and pushed to GitHub')
  } catch (e: any) {
    console.warn('Git push failed (non-fatal):', e?.message?.split('\n')[0])
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  const startedAt = new Date().toISOString()
  console.log('\nUnplanned Escapes — enrichment (Geofabrik)')
  console.log(`Mode: ${SLUG_FILTER ? `slug=${SLUG_FILTER}` : FORCE_MODE ? 'force-all' : 'stale only'} | Batch: ${ALL_MODE ? 'all' : BATCH_SIZE}`)
  console.log(`Anthropic key: ${anthropicKey ? 'present' : 'missing'}`)
  console.log('─'.repeat(60))

  await ensurePbf()
  const allPois = await parsePbf()

  const staleDate = new Date(Date.now() - REFRESH_DAYS * 24 * 60 * 60 * 1000).toISOString()
  let query = db
    .from('sub_destinations')
    .select('sub_dest_id, slug, name, lat, lng, enriched_at')
    .order('enriched_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  if (SLUG_FILTER) {
    query = query.eq('slug', SLUG_FILTER)
  } else if (!FORCE_MODE) {
    query = query.or(`enriched_at.is.null,enriched_at.lt.${staleDate}`)
  }

  const { data: subDests, error } = await query
  if (error) { console.error('DB error:', error.message); process.exit(1) }
  if (!subDests?.length) { console.log('All destinations are fresh — nothing to do.'); return }

  console.log(`\nEnriching ${subDests.length} destinations...\n`)

  let totalUpserted = 0
  const results: Array<{ slug: string; upserted: number }> = []

  for (let i = 0; i < subDests.length; i++) {
    const sub = subDests[i]
    console.log(`[${i+1}/${subDests.length}] ${sub.name} (${sub.slug})`)
    const upserted = await enrichSubDest(allPois, sub.sub_dest_id, sub.slug, sub.name, sub.lat, sub.lng)
    totalUpserted += upserted
    results.push({ slug: sub.slug, upserted })
  }

  const completedAt = new Date().toISOString()
  const durationSec = Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000)

  console.log('\n' + '─'.repeat(60))
  console.log(`Done in ${durationSec}s | Destinations: ${results.length} | Upserted: ${totalUpserted}`)

  // Append to git log
  const logEntry = {
    run_at: startedAt,
    completed_at: completedAt,
    duration_sec: durationSec,
    mode: SLUG_FILTER ? `slug:${SLUG_FILTER}` : FORCE_MODE ? 'force' : 'stale',
    destinations: results.length,
    upserted: totalUpserted,
    pbf_source: 'geofabrik',
    results,
  }
  appendRunLog(logEntry)
  gitCommitLog(logEntry)
}

main().catch(err => { console.error(err); process.exit(1) })
