/**
 * Add missing sub-destinations (Baw Baw, etc.) to Supabase.
 * Run with:  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx supabase/add-missing-destinations.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const NEW_CLUSTERS = [
  {
    slug: 'baw-baw', name: 'Mount Baw Baw',
    tagline: "Victoria's most accessible alpine resort — snow in winter, wildflower walks and giant tree ferns in summer.",
    drive_time_range: '2 – 2.5 hrs', themes: ['Snow','Hiking','Nature','Wildlife','Scenic'],
    seasonal_scores: { summer:6, autumn:7, winter:9, spring:7 },
    image_url: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80',
    gradient_from: '#0d2137', gradient_to: '#1a3a5c', display_order: 20,
  },
]

const NEW_SUB_DESTINATIONS = [
  { slug: 'mount-baw-baw', cluster_slug: 'baw-baw', name: 'Mount Baw Baw', drive_time_hours: 2.2, drive_km: 175, lat: -37.838, lng: 146.270, themes: ['Snow','Hiking','Nature','Wildlife'], highlights: ['Ski and snowboard runs (June–September)', 'Mount Baw Baw Alpine Resort village', 'Cascades Nature Walk and alpine wildflowers', 'Mountain ash forests and lyrebird habitat'], display_order: 1 },
  { slug: 'rawson', cluster_slug: 'baw-baw', name: 'Rawson & Thomson River', drive_time_hours: 2.0, drive_km: 165, lat: -37.897, lng: 146.482, themes: ['Nature','Hiking','Scenic'], highlights: ['Thomson River trout fishing', 'Rawson township', 'Scenic drive through Tyers', 'Gateway to Baw Baw National Park'], display_order: 2 },
]

async function run() {
  console.log('Adding missing destinations to Supabase…')

  // Upsert clusters
  for (const c of NEW_CLUSTERS) {
    const { error } = await supabase.from('clusters').upsert({ slug: c.slug, name: c.name, tagline: c.tagline, image_url: c.image_url, gradient_from: c.gradient_from, gradient_to: c.gradient_to, seasonal_scores: c.seasonal_scores, display_order: c.display_order }, { onConflict: 'slug' })
    if (error) { console.error(`Cluster ${c.slug}:`, error.message); continue }
    console.log(`  Cluster ${c.slug} OK`)
  }

  // Resolve cluster slugs → cluster_ids
  const { data: clusters } = await supabase.from('clusters').select('cluster_id, slug')
  const clusterMap = new Map<string, number>()
  for (const c of clusters ?? []) clusterMap.set(c.slug, c.cluster_id)

  // Upsert sub_destinations
  for (const s of NEW_SUB_DESTINATIONS) {
    const cluster_id = clusterMap.get(s.cluster_slug)
    if (!cluster_id) { console.error(`No cluster_id for ${s.cluster_slug}`); continue }
    const { error } = await supabase.from('sub_destinations').upsert({
      slug: s.slug, cluster_id, name: s.name, lat: s.lat, lng: s.lng,
      drive_time_hours: s.drive_time_hours, drive_km: s.drive_km,
      themes: s.themes, highlights: s.highlights, display_order: s.display_order,
    }, { onConflict: 'slug' })
    if (error) { console.error(`Sub-dest ${s.slug}:`, error.message); continue }
    console.log(`  Sub-dest ${s.slug} OK`)
  }

  console.log('Done.')
}

run().catch((e) => { console.error(e); process.exit(1) })
