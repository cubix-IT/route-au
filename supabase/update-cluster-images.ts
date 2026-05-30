/**
 * Fetches a high-quality Google Places photo for the most iconic landmark
 * in each cluster and updates the image_url in Supabase.
 *
 * Run with:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... GOOGLE_PLACES_API_KEY=... npx tsx supabase/update-cluster-images.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? '',
)
const GKEY = process.env.GOOGLE_PLACES_API_KEY ?? ''

// Cluster slug → exact Google Places search query for the most iconic/photogenic landmark
const CLUSTER_HERO: Record<string, string> = {
  'yarra-valley':           'Healesville Sanctuary Victoria',
  'dandenongs':             'Puffing Billy Railway Belgrave Victoria',
  'mornington':             'Peninsula Hot Springs Rye Victoria',
  'daylesford':             'Hanging Rock Reserve Woodend Victoria',
  'phillip-island':         'Penguin Parade Phillip Island Victoria',
  'great-ocean-road':       'Twelve Apostles Port Campbell Victoria',
  'bass-coast':             'Inverloch Beach Victoria',
  'grampians':              'Boroka Lookout Grampians Victoria',
  'bright-alpine':          'Bright Victoria autumn',
  'mansfield-high-country': 'Mount Buller Ski Resort Victoria',
  'murray-river':           'Port of Echuca Historic Wharf Victoria',
  'ballarat':               'Sovereign Hill Ballarat Victoria',
  'bendigo':                'Bendigo Art Gallery Victoria',
  'wilsons-prom':           'Squeaky Beach Wilsons Promontory Victoria',
  'east-gippsland':         'Lakes Entrance Victoria',
  'melbourne':              'Flinders Street Station Melbourne Victoria',
  'geelong':                'Geelong Waterfront Victoria',
  'shepparton':             'Shepparton Art Museum Victoria',
  'wodonga':                'Lake Hume Wodonga Victoria',
}

async function getGooglePlacesPhoto(query: string): Promise<string | null> {
  // Step 1: Text search to find the place
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GKEY}`
  const searchResp = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) })
  if (!searchResp.ok) return null
  const searchData = await searchResp.json() as {
    results?: { photos?: { photo_reference: string }[] }[]
  }

  const photoRef = searchData.results?.[0]?.photos?.[0]?.photo_reference
  if (!photoRef) return null

  // Step 2: Resolve photo URL — follow the redirect to get the final CDN URL
  const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photoreference=${photoRef}&key=${GKEY}`
  const photoResp = await fetch(photoApiUrl, { redirect: 'follow', signal: AbortSignal.timeout(8000) })
  if (!photoResp.ok) return null

  // Return the final resolved URL (Google CDN — stable for months)
  return photoResp.url
}

async function main() {
  if (!GKEY) { console.error('GOOGLE_PLACES_API_KEY not set'); process.exit(1) }

  const { data: clusters, error } = await supabase
    .from('clusters')
    .select('cluster_id, slug, name')
    .order('display_order')
  if (error) { console.error('Failed to fetch clusters:', error.message); process.exit(1) }

  for (const cluster of clusters ?? []) {
    const query = CLUSTER_HERO[cluster.slug]
    if (!query) {
      console.log(`  ${cluster.slug}: no hero defined, skipping`)
      continue
    }

    console.log(`  ${cluster.name} → searching: "${query}"`)
    try {
      const imgUrl = await getGooglePlacesPhoto(query)
      if (!imgUrl) {
        console.log(`    ⚠️  No photo found`)
        continue
      }
      const { error: e } = await supabase
        .from('clusters')
        .update({ image_url: imgUrl })
        .eq('cluster_id', cluster.cluster_id)

      if (e) console.error(`    ❌ DB error:`, e.message)
      else console.log(`    ✅ Updated: ${imgUrl.slice(0, 90)}...`)
    } catch (e) {
      console.error(`    ❌ Error:`, e)
    }

    // Polite delay between API calls
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('\nAll done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
