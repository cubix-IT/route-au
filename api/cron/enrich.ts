import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from '../_lib/supabase.js'

// Called daily at 3am AEST by Vercel Cron
// Protected by CRON_SECRET env var
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.authorization
  if (secret && authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const runAt = new Date().toISOString()
  let recordsAdded = 0

  try {
    // Pull all sub-destinations so we know what to enrich
    const { data: subDests, error: sdErr } = await adminSupabase
      .from('sub_destinations')
      .select('id, name, lat, lng')

    if (sdErr) throw sdErr

    // For each sub-destination, query Overpass API for relevant OSM POIs
    for (const sub of subDests ?? []) {
      const added = await enrichSubDest(sub.id, sub.name, sub.lat, sub.lng)
      recordsAdded += added
    }

    await adminSupabase.from('cron_log').insert({
      run_at: runAt,
      status: 'ok',
      message: `Enriched ${subDests?.length ?? 0} sub-destinations`,
      records_added: recordsAdded,
    })

    return res.status(200).json({ ok: true, recordsAdded })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/enrich]', msg)

    await adminSupabase.from('cron_log').insert({
      run_at: runAt,
      status: 'error',
      message: msg,
      records_added: 0,
    }).then(() => {}, () => {})

    return res.status(500).json({ error: msg })
  }
}

async function enrichSubDest(
  subDestId: string,
  name: string,
  lat: number,
  lng: number,
): Promise<number> {
  const radius = 5000 // 5km radius around the sub-destination centre
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"attraction|museum|viewpoint|gallery|picnic_site|camp_site"](around:${radius},${lat},${lng});
      node["leisure"~"park|nature_reserve|swimming_area|beach"](around:${radius},${lat},${lng});
      node["amenity"~"restaurant|cafe|pub|winery"](around:${radius},${lat},${lng});
      node["historic"~"monument|memorial|ruins|building"](around:${radius},${lat},${lng});
    );
    out body;
  `

  const overpassUrl = 'https://overpass-api.de/api/interpreter'
  const resp = await fetch(overpassUrl, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(30_000),
  })

  if (!resp.ok) return 0

  const json = await resp.json() as { elements: OsmElement[] }
  const elements = json.elements ?? []

  const activities = elements
    .filter((el) => el.tags?.name)
    .map((el) => osmElementToActivity(el, subDestId))
    .filter(Boolean) as ActivityRow[]

  if (activities.length === 0) return 0

  const { error } = await adminSupabase
    .from('activities')
    .upsert(activities, { onConflict: 'id', ignoreDuplicates: true })

  if (error) {
    console.warn(`[cron/enrich] upsert error for ${name}:`, error.message)
    return 0
  }

  return activities.length
}

interface OsmElement {
  id: number
  tags?: Record<string, string>
  lat?: number
  lon?: number
}

interface ActivityRow {
  id: string
  sub_dest_id: string
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
}

function osmElementToActivity(el: OsmElement, subDestId: string): ActivityRow | null {
  const tags = el.tags ?? {}
  const name = tags.name
  if (!name) return null

  const { category, emoji, duration } = classifyOsmElement(tags)

  const mapsUrl = el.lat && el.lon
    ? `https://www.google.com/maps/search/?api=1&query=${el.lat},${el.lon}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Victoria')}`

  return {
    id: `osm-${el.id}`,
    sub_dest_id: subDestId,
    name,
    category,
    emoji,
    description: tags.description || tags['description:en'] || `${name} — discovered via OpenStreetMap`,
    duration,
    cost: 'free',
    kids_ok: true,
    is_hidden_gem: false,
    maps_url: mapsUrl,
    tags: [],
    source: 'osm',
  }
}

function classifyOsmElement(tags: Record<string, string>): { category: string; emoji: string; duration: string } {
  const tourism = tags.tourism ?? ''
  const amenity = tags.amenity ?? ''
  const leisure = tags.leisure ?? ''
  const historic = tags.historic ?? ''

  if (amenity === 'restaurant') return { category: 'food', emoji: '🍽️', duration: '1–1.5 hrs' }
  if (amenity === 'cafe') return { category: 'food', emoji: '☕', duration: '30–60 min' }
  if (amenity === 'pub') return { category: 'drink', emoji: '🍺', duration: '1–2 hrs' }
  if (amenity === 'winery' || tourism === 'winery') return { category: 'drink', emoji: '🍷', duration: '1–2 hrs' }
  if (tourism === 'museum') return { category: 'history', emoji: '🏛️', duration: '1–2 hrs' }
  if (tourism === 'gallery') return { category: 'art', emoji: '🖼️', duration: '45–60 min' }
  if (tourism === 'viewpoint') return { category: 'viewpoint', emoji: '👁️', duration: '20–30 min' }
  if (tourism === 'attraction') return { category: 'nature', emoji: '⭐', duration: '1 hr' }
  if (tourism === 'picnic_site') return { category: 'relaxation', emoji: '🧺', duration: '45–60 min' }
  if (tourism === 'camp_site') return { category: 'relaxation', emoji: '⛺', duration: '—' }
  if (leisure === 'nature_reserve' || leisure === 'park') return { category: 'nature', emoji: '🌿', duration: '1–2 hrs' }
  if (leisure === 'swimming_area' || leisure === 'beach') return { category: 'active', emoji: '🌊', duration: '1–2 hrs' }
  if (historic) return { category: 'history', emoji: '🏚️', duration: '30–45 min' }

  return { category: 'nature', emoji: '📍', duration: '1 hr' }
}
