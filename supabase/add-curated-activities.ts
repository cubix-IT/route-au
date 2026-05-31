/**
 * Add curated activities that Google Places API misses or under-indexes.
 * These are iconic places that must always show regardless of enrichment.
 * Run with:  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx supabase/add-curated-activities.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Curated activities with lat/lng so they survive bounding-box queries
// Slugs prefixed 'curated-' to distinguish from Google Places 'gp-' slugs
const CURATED: Array<{
  slug: string; sub_dest_slug: string; name: string; category: string; emoji: string
  description: string; duration: string; cost: string; kids_ok: boolean
  is_hidden_gem: boolean; maps_url: string; lat: number; lng: number
  rating?: number; review_count?: number
}> = [
  {
    slug: 'curated-lake-tyrrell',
    sub_dest_slug: 'sea-lake',
    name: 'Lake Tyrrell',
    category: 'nature',
    emoji: '🌅',
    description: "Victoria's largest salt lake, blazing vivid pink at sunset. At night the water reflects the Milky Way with zero light pollution — one of the most spectacular stargazing spots in Australia.",
    duration: '1–3 hrs',
    cost: 'free',
    kids_ok: true,
    is_hidden_gem: false,
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Lake+Tyrrell+Sea+Lake+Victoria',
    lat: -35.371,
    lng: 142.813,
    rating: 4.7,
    review_count: 1200,
  },
  {
    slug: 'curated-rod-laver-arena',
    sub_dest_slug: 'richmond',
    name: 'Rod Laver Arena & Melbourne Park',
    category: 'entertainment',
    emoji: '🎾',
    description: 'Home of the Australian Open Grand Slam tennis. Tours of the venue available year-round; world-class concerts and events throughout the year.',
    duration: '1–2 hrs',
    cost: '$$',
    kids_ok: true,
    is_hidden_gem: false,
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Rod+Laver+Arena+Melbourne',
    lat: -37.821,
    lng: 144.978,
    rating: 4.6,
    review_count: 8000,
  },
  {
    slug: 'curated-yarra-bend-park',
    sub_dest_slug: 'richmond',
    name: 'Yarra Bend Park & Flying Fox Colony',
    category: 'nature',
    emoji: '🦇',
    description: "Melbourne's largest inner-city parkland. Home to one of the world's largest urban flying-fox colonies (grey-headed fruit bats). Beautiful riverside walks, kayaking, and cycling paths.",
    duration: '1–3 hrs',
    cost: 'free',
    kids_ok: true,
    is_hidden_gem: false,
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Yarra+Bend+Park+Melbourne',
    lat: -37.793,
    lng: 145.013,
    rating: 4.5,
    review_count: 3500,
  },
  {
    slug: 'curated-st-pauls-cathedral',
    sub_dest_slug: 'melbourne-cbd',
    name: "St Paul's Cathedral",
    category: 'history',
    emoji: '⛪',
    description: "Melbourne's most iconic Gothic Revival landmark, opposite Federation Square. Free entry during the day; stunning interior with Victorian-era stained glass. Regular organ recitals.",
    duration: '30 min',
    cost: 'free',
    kids_ok: true,
    is_hidden_gem: false,
    maps_url: "https://www.google.com/maps/search/?api=1&query=St+Paul's+Cathedral+Melbourne",
    lat: -37.817,
    lng: 144.968,
    rating: 4.6,
    review_count: 15000,
  },
  {
    slug: 'curated-hanging-rock-reserve',
    sub_dest_slug: 'macedon',
    name: 'Hanging Rock Reserve',
    category: 'nature',
    emoji: '🪨',
    description: "A volcanic rock formation made famous by Picnic at Hanging Rock. Scramble to the summit for panoramic Macedon views, wander the eucalypt forest, and spot native wildlife. Annual New Year's and Australia Day horse races.",
    duration: '2–3 hrs',
    cost: '$',
    kids_ok: true,
    is_hidden_gem: false,
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Hanging+Rock+Reserve+Woodend+Victoria',
    lat: -37.374,
    lng: 144.535,
    rating: 4.5,
    review_count: 9000,
  },
]

async function run() {
  console.log('Adding curated activities to Supabase…')

  // Get sub_dest slug → sub_dest_id map
  const slugs = [...new Set(CURATED.map((c) => c.sub_dest_slug))]
  const { data: sdRows } = await sb.from('sub_destinations').select('sub_dest_id, slug').in('slug', slugs)
  const sdMap = new Map<string, number>()
  for (const r of sdRows ?? []) sdMap.set(r.slug, r.sub_dest_id)

  for (const c of CURATED) {
    const sub_dest_id = sdMap.get(c.sub_dest_slug)
    if (!sub_dest_id) { console.error(`No sub_dest_id for ${c.sub_dest_slug}`); continue }
    const { error } = await sb.from('activities').upsert({
      slug: c.slug,
      sub_dest_id,
      name: c.name,
      category: c.category,
      emoji: c.emoji,
      description: c.description,
      duration: c.duration,
      cost: c.cost,
      kids_ok: c.kids_ok,
      is_hidden_gem: c.is_hidden_gem,
      maps_url: c.maps_url,
      lat: c.lat,
      lng: c.lng,
      source: 'static',
      tags: [],
      attributes: {
        rating: c.rating ?? null,
        review_count: c.review_count ?? null,
        business_status: 'OPERATIONAL',
        curated: true,
      },
    }, { onConflict: 'slug' })
    if (error) { console.error(`${c.slug}:`, error.message); continue }
    console.log(`  ${c.name} (${c.slug}) OK`)
  }
  console.log('Done.')
}

run().catch((e) => { console.error(e); process.exit(1) })
