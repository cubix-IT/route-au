/**
 * One-time (and monthly) loader for Great Trails Victoria KML data.
 * Source: data.vic.gov.au — CC BY 4.0
 *
 * Run manually:   npx tsx scripts/load-trails.ts
 * Monthly cron:   called from api/cron/summaries.ts on 1st of month
 */

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(supabaseUrl, supabaseKey)

// ── Trail catalogue ───────────────────────────────────────────────────────────

const TRAILS = [
  // Walk
  { slug: 'great-ocean-walk',              name: 'Great Ocean Walk',               type: 'walk',  region: 'Great Ocean Road',   url: 'https://discover.data.vic.gov.au/dataset/0640bf6d-982c-432c-92a4-26522e25b5a9/resource/3158bff6-8677-4da2-8527-0f481d4b4705/download/great_ocean_walk.kml' },
  { slug: 'great-walhalla-alpine-trail',   name: 'Great Walhalla Alpine Trail',    type: 'walk',  region: 'Gippsland',          url: 'https://discover.data.vic.gov.au/dataset/e7ed4217-c9fb-4b69-b868-f270e5576eef/resource/b92dd94e-9123-42a3-97c1-d77479161be9/download/great_walhalla_alpine_trail.kml' },
  { slug: 'great-south-west-walk',         name: 'Great South West Walk',          type: 'walk',  region: 'South West Victoria', url: 'https://discover.data.vic.gov.au/dataset/3bd1ef68-bb6c-40c8-b6a5-3d5036bf36b7/resource/d496e2ed-74dc-4508-b5d1-1d48446f6c7c/download/great_south_west_walk.kml' },
  { slug: 'mornington-peninsula-walk',     name: 'Mornington Peninsula Walk',      type: 'walk',  region: 'Mornington Peninsula', url: 'https://discover.data.vic.gov.au/dataset/7344d5d3-5850-48ac-ad22-d3317a044865/resource/a75bc567-ef4e-40b2-a5bf-51a2b325f16a/download/mornington_peninsula_walk.kml' },
  { slug: 'surf-coast-walk',               name: 'Surf Coast Walk',                type: 'walk',  region: 'Great Ocean Road',   url: 'https://discover.data.vic.gov.au/dataset/bc61ee94-8397-4e2a-8f24-c2cbf62685e3/resource/e95194cc-43b0-43de-ba2b-b4264b88966f/download/surf_coast_walk.kml' },
  { slug: 'wilsons-promontory-circuit',    name: 'Wilsons Promontory Southern Circuit', type: 'walk', region: 'Wilsons Promontory', url: 'https://discover.data.vic.gov.au/dataset/b587c248-b3a9-42f0-94f2-90e55879fc9b/resource/5c825a38-6b4f-4dff-9f88-12a9a06abcf8/download/wilsons_promontory_southern_cir.kml' },
  { slug: 'goldfields-track',              name: 'Goldfields Track',               type: 'walk',  region: 'Goldfields',         url: 'https://discover.data.vic.gov.au/dataset/23cd7f2e-5a7d-47a8-9ba5-bb754b3c4fda/resource/0d34f29a-8dc5-4fc5-8e40-560126a8b43e/download/goldfields_track.kml' },
  // Cycle / rail trails
  { slug: 'great-victorian-rail-trail',    name: 'Great Victorian Rail Trail',     type: 'cycle', region: 'High Country',       url: 'https://discover.data.vic.gov.au/dataset/3230104a-ff52-402c-92f1-fde0a3d6aa90/resource/40032b69-6825-47b3-8688-218d6c3dbbac/download/great_victorian_rail_trail.kml' },
  { slug: 'east-gippsland-rail-trail',     name: 'East Gippsland Rail Trail',      type: 'cycle', region: 'Gippsland',          url: 'https://discover.data.vic.gov.au/dataset/1e5d0fa2-9153-422d-8526-23f546deb8ed/resource/dfaeaf8b-ef0f-4e89-8043-1821c5a6f99e/download/east_gippsland_rail_trail.kml' },
  { slug: 'gippsland-plains-rail-trail',   name: 'Gippsland Plains Rail Trail',    type: 'cycle', region: 'Gippsland',          url: 'https://discover.data.vic.gov.au/dataset/91d69342-f6e3-4de7-a410-610a9e55a348/resource/e681c8e7-a943-4e15-adca-ba9567a4336e/download/gippsland_plains_rail_trail.kml' },
  { slug: 'murray-to-mountains-rail-trail', name: 'Murray to Mountains Rail Trail', type: 'cycle', region: 'High Country',      url: 'https://discover.data.vic.gov.au/dataset/a8345b9d-d490-40cd-a5b8-45a0ab30c53c/resource/10db6e1c-7400-46ae-9858-fad046fb976b/download/murray_to_mountains_rail_trail.kml' },
  { slug: 'lilydale-to-warburton',         name: 'Lilydale to Warburton Rail Trail', type: 'cycle', region: 'Yarra Valley',    url: 'https://discover.data.vic.gov.au/dataset/f647f5cc-1b04-4d54-9a97-09b83bdb04fd/resource/76e26974-db2f-45ff-b25b-8e30049c861f/download/lilydale_to_warburton_rail_trai.kml' },
  // MTB
  { slug: 'mt-buller-bike-park',           name: 'Mt Buller Bike Park',            type: 'mtb',   region: 'High Country',       url: 'https://discover.data.vic.gov.au/dataset/0560f705-ba42-4578-85b7-8a78a2bf70dd/resource/5b398ae9-4756-4366-a849-c124734d81ab/download/mt_buller_bike_park.kml' },
  { slug: 'forrest-mountain-bike-trails',  name: 'Forrest Mountain Bike Trails',   type: 'mtb',   region: 'Otways',             url: 'https://discover.data.vic.gov.au/dataset/4aec4d90-6a3c-42bc-9ea3-42d0618f4431/resource/154f74ca-94f4-4cde-81a2-0aa02e1b2e32/download/forrest_mountain_bike_trails.kml' },
  { slug: 'you-yangs-mountain-bike-park',  name: 'You Yangs Mountain Bike Park',   type: 'mtb',   region: 'Geelong',            url: 'https://discover.data.vic.gov.au/dataset/0b139f62-1f00-4bad-8a79-c23340ad40ba/resource/aecc589d-da3d-4884-aab8-a5d09c46af82/download/you_yangs_mountain_bike_park.kml' },
] as const

// ── Manually curated trails not on data.vic.gov.au ───────────────────────────
// These are upserted directly with hardcoded waypoints (no KML fetch needed).

const STATIC_TRAILS = [
  {
    slug: 'brisbane-ranges-burchell-trail',
    name: 'Burchell Trail',
    type: 'walk' as const,
    region: 'Brisbane Ranges',
    distance_km: 11,
    kml_url: 'https://www.parks.vic.gov.au/places-to-see/parks/brisbane-ranges-national-park/things-to-do/walking',
    waypoints: [
      { name: 'Stony Creek Trailhead', description: 'Main trailhead with parking area near Stony Creek picnic ground.', lat: -37.862, lng: 144.238 },
      { name: 'Anakie Gorge', description: 'Rocky gorge with seasonal creek and diverse birdlife through Brisbane Ranges.', lat: -37.872, lng: 144.232 },
      { name: 'Riddells Creek Lookout', description: 'Elevated views over the Brisbane Ranges and surrounding farmland.', lat: -37.858, lng: 144.225 },
    ],
    route_coords: [
      [144.238, -37.862], [144.235, -37.864], [144.232, -37.868],
      [144.232, -37.872], [144.228, -37.875], [144.225, -37.870],
      [144.225, -37.858], [144.230, -37.855], [144.238, -37.862],
    ] as [number, number][],
  },
  {
    slug: 'brisbane-ranges-anakie-gorge-walk',
    name: 'Anakie Gorge Walk',
    type: 'walk' as const,
    region: 'Brisbane Ranges',
    distance_km: 8.5,
    kml_url: 'https://www.parks.vic.gov.au/places-to-see/parks/brisbane-ranges-national-park/things-to-do/walking',
    waypoints: [
      { name: 'Anakie Gorge Picnic Area', description: 'Start of the walk with picnic facilities and car parking.', lat: -37.874, lng: 144.231 },
      { name: 'Gorge Circuit', description: 'Loop through the rocky gorge with native orchids and grey kangaroos.', lat: -37.878, lng: 144.228 },
      { name: 'Scrubby Creek', description: 'Seasonal waterhole attracting wildlife including echidnas and wallabies.', lat: -37.882, lng: 144.235 },
    ],
    route_coords: [
      [144.231, -37.874], [144.228, -37.878], [144.224, -37.881],
      [144.228, -37.885], [144.235, -37.882], [144.237, -37.878],
      [144.233, -37.875], [144.231, -37.874],
    ] as [number, number][],
  },
  {
    slug: 'dandenong-ranges-kokoda-track',
    name: 'Kokoda Track Memorial Walk',
    type: 'walk' as const,
    region: 'Dandenong Ranges',
    distance_km: 10,
    kml_url: 'https://www.parks.vic.gov.au/places-to-see/parks/dandenong-ranges-national-park/things-to-do/walking',
    waypoints: [
      { name: 'Ferny Creek Start', description: 'Start near Ferny Creek with access through tall mountain ash forest.', lat: -37.892, lng: 145.353 },
      { name: 'Sherbrooke Forest', description: 'Dense temperate rainforest famous for superb lyrebird calls.', lat: -37.905, lng: 145.357 },
      { name: 'Sherbrooke Falls', description: 'Cascading waterfall hidden in ferny gullies — best after rain.', lat: -37.912, lng: 145.362 },
    ],
    route_coords: [
      [145.353, -37.892], [145.355, -37.898], [145.357, -37.905],
      [145.360, -37.910], [145.362, -37.912], [145.358, -37.908],
      [145.355, -37.902], [145.353, -37.892],
    ] as [number, number][],
  },
  {
    slug: 'macedon-camels-hump-walk',
    name: 'Camels Hump Walk',
    type: 'walk' as const,
    region: 'Macedon Ranges',
    distance_km: 3.5,
    kml_url: 'https://www.parks.vic.gov.au/places-to-see/parks/mount-macedon-regional-park/things-to-do/walking',
    waypoints: [
      { name: 'Mount Macedon Summit Car Park', description: 'Start from the summit area with views over Port Phillip Bay on clear days.', lat: -37.373, lng: 144.574 },
      { name: 'Camels Hump Summit', description: 'Rocky volcanic summit at 1010m with 360° views over the Macedon Ranges.', lat: -37.378, lng: 144.568 },
      { name: 'Rock Face', description: 'Distinctive granite outcrops popular with rock climbers and walkers.', lat: -37.382, lng: 144.565 },
    ],
    route_coords: [
      [144.574, -37.373], [144.571, -37.376], [144.568, -37.378],
      [144.565, -37.382], [144.568, -37.385], [144.572, -37.381],
      [144.574, -37.373],
    ] as [number, number][],
  },
  {
    slug: 'kinglake-mason-falls-walk',
    name: 'Mason Falls Walk',
    type: 'walk' as const,
    region: 'Kinglake',
    distance_km: 2,
    kml_url: 'https://www.parks.vic.gov.au/places-to-see/parks/kinglake-national-park/things-to-do/walking',
    waypoints: [
      { name: 'Mason Falls Picnic Area', description: 'Car park and picnic ground — short walk to the waterfall.', lat: -37.516, lng: 145.366 },
      { name: 'Mason Falls', description: 'Picturesque 15m waterfall cascading into a fern-lined pool in Kinglake National Park.', lat: -37.519, lng: 145.363 },
    ],
    route_coords: [
      [145.366, -37.516], [145.364, -37.517], [145.363, -37.519],
      [145.364, -37.517], [145.366, -37.516],
    ] as [number, number][],
  },
  {
    slug: 'plenty-gorge-diamond-creek-walk',
    name: 'Diamond Creek to Yarrambat Walk',
    type: 'walk' as const,
    region: 'Melbourne North',
    distance_km: 7,
    kml_url: 'https://www.parks.vic.gov.au/places-to-see/parks/plenty-gorge-parklands/things-to-do/walking',
    waypoints: [
      { name: 'Diamond Creek Entry', description: 'Entrance to Plenty Gorge Parklands with car parking off Diamond Creek Road.', lat: -37.645, lng: 145.088 },
      { name: 'Plenty River Gorge', description: 'Deep basalt gorge carved by the Plenty River with cliffs up to 30m high.', lat: -37.655, lng: 145.078 },
      { name: 'Yarrambat Park', description: 'Peaceful parkland at the northern end of the gorge walk.', lat: -37.641, lng: 145.075 },
    ],
    route_coords: [
      [145.088, -37.645], [145.083, -37.649], [145.078, -37.655],
      [145.074, -37.650], [145.075, -37.641], [145.081, -37.640],
      [145.088, -37.645],
    ] as [number, number][],
  },
]

// ── KML parser ────────────────────────────────────────────────────────────────

interface Waypoint { name: string; description: string; lat: number; lng: number }

function parseKml(kml: string): { waypoints: Waypoint[]; routeCoords: [number, number][]; distanceKm: number } {
  const waypoints: Waypoint[] = []
  const routeCoords: [number, number][] = []

  // Parse Placemark points (waypoints)
  const placemarkRe = /<Placemark>([\s\S]*?)<\/Placemark>/g
  let pm: RegExpExecArray | null
  while ((pm = placemarkRe.exec(kml)) !== null) {
    const block = pm[1]
    const name = (/<name>([\s\S]*?)<\/name>/.exec(block)?.[1] ?? '').trim()
    const desc = (/<description>([\s\S]*?)<\/description>/.exec(block)?.[1] ?? '')
      .replace(/<[^>]+>/g, '').trim()
    const coordMatch = /<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/s.exec(block)
    if (coordMatch) {
      const [lng, lat] = coordMatch[1].trim().split(',').map(Number)
      if (!isNaN(lat) && !isNaN(lng)) waypoints.push({ name, description: desc.slice(0, 600), lat, lng })
    }
  }

  // Parse LineString coordinates (trail route)
  const lineRe = /<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/gs
  let lm: RegExpExecArray | null
  while ((lm = lineRe.exec(kml)) !== null) {
    const points = lm[1].trim().split(/\s+/)
    for (const pt of points) {
      const [lng, lat] = pt.split(',').map(Number)
      if (!isNaN(lat) && !isNaN(lng)) routeCoords.push([lng, lat])
    }
  }

  // Estimate distance from route coords using haversine
  let distanceKm = 0
  for (let i = 1; i < routeCoords.length; i++) {
    const [lng1, lat1] = routeCoords[i - 1]
    const [lng2, lat2] = routeCoords[i]
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    distanceKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  return { waypoints, routeCoords, distanceKm: Math.round(distanceKm * 10) / 10 }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function loadTrails(forceAll = false): Promise<{ updated: number; skipped: number; errors: number }> {
  let updated = 0, skipped = 0, errors = 0

  // Fetch existing hashes so we can skip unchanged trails
  const { data: existing } = await db.from('trails').select('slug, content_hash')
  const existingHash: Record<string, string> = {}
  for (const row of existing ?? []) existingHash[row.slug] = row.content_hash ?? ''

  for (const trail of TRAILS) {
    try {
      console.log(`[trails] fetching ${trail.name}…`)
      const res = await fetch(trail.url, { signal: AbortSignal.timeout(15_000) })
      if (!res.ok) { console.warn(`[trails] ${trail.slug} HTTP ${res.status}`); errors++; continue }

      const kml = await res.text()
      const hash = crypto.createHash('sha256').update(kml).digest('hex').slice(0, 16)

      if (!forceAll && existingHash[trail.slug] === hash) {
        console.log(`[trails] ${trail.slug} unchanged — skipping`)
        skipped++
        continue
      }

      const { waypoints, routeCoords, distanceKm } = parseKml(kml)
      console.log(`[trails] ${trail.slug} — ${waypoints.length} waypoints, ${routeCoords.length} route pts, ~${distanceKm}km`)

      const { error } = await db.from('trails').upsert({
        slug: trail.slug,
        name: trail.name,
        type: trail.type,
        region: trail.region,
        kml_url: trail.url,
        content_hash: hash,
        waypoints,
        route_coords: routeCoords,
        distance_km: distanceKm,
        last_fetched_at: new Date().toISOString(),
      }, { onConflict: 'slug' })

      if (error) { console.error(`[trails] upsert error for ${trail.slug}:`, error); errors++; continue }
      updated++
    } catch (err) {
      console.error(`[trails] error for ${trail.slug}:`, err)
      errors++
    }
  }

  // Upsert static trails (no KML fetch — waypoints hardcoded)
  for (const trail of STATIC_TRAILS) {
    const staticHash = `static-${trail.slug}`
    if (!forceAll && existingHash[trail.slug] === staticHash) {
      console.log(`[trails] ${trail.slug} static — skipping`)
      skipped++
      continue
    }
    const { error } = await db.from('trails').upsert({
      slug: trail.slug,
      name: trail.name,
      type: trail.type,
      region: trail.region,
      kml_url: trail.kml_url,
      content_hash: staticHash,
      waypoints: trail.waypoints,
      route_coords: trail.route_coords,
      distance_km: trail.distance_km,
      last_fetched_at: new Date().toISOString(),
    }, { onConflict: 'slug' })
    if (error) { console.error(`[trails] static upsert error for ${trail.slug}:`, error); errors++; continue }
    console.log(`[trails] ${trail.slug} static — upserted`)
    updated++
  }

  console.log(`[trails] done — ${updated} updated, ${skipped} skipped, ${errors} errors`)
  return { updated, skipped, errors }
}

// Run directly
if (process.argv[1]?.includes('load-trails')) {
  const force = process.argv.includes('--force')
  loadTrails(force).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
}
