// Adds all missing Victorian national parks + two new clusters to Supabase
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

// ── Step 1: fetch existing cluster IDs ───────────────────────────────
const { data: clusters } = await sb.from('clusters').select('cluster_id,slug')
const cid = Object.fromEntries((clusters ?? []).map((c: { cluster_id: number; slug: string }) => [c.slug, c.cluster_id]))

console.log('Existing clusters:', Object.keys(cid).join(', '))

// ── Step 2: add missing clusters ─────────────────────────────────────
const newClusters = [
  {
    slug: 'wimmera',
    name: 'Wimmera & Little Desert',
    tagline: 'Ancient desert, wildflowers and outback skies',
    seasonal_scores: { summer: 5, autumn: 8, winter: 7, spring: 10 },
    image_url: null,
  },
  {
    slug: 'mildura-sunraysia',
    name: 'Mildura & Sunraysia',
    tagline: 'Murray River, red-sand dunes and outback parks',
    seasonal_scores: { summer: 4, autumn: 8, winter: 7, spring: 8 },
    image_url: null,
  },
]

for (const c of newClusters) {
  if (cid[c.slug]) { console.log(`Cluster ${c.slug} already exists`); continue }
  const { data, error } = await sb.from('clusters').insert(c).select('cluster_id,slug').single()
  if (error) { console.error(`Failed to insert cluster ${c.slug}:`, error.message); continue }
  cid[c.slug] = data.cluster_id
  console.log(`Created cluster: ${c.name} (id=${data.cluster_id})`)
}

// ── Step 3: fetch existing sub-dest slugs ─────────────────────────────
const { data: existing } = await sb.from('sub_destinations').select('slug')
const existingSlugs = new Set((existing ?? []).map((r: { slug: string }) => r.slug))
console.log(`\nExisting sub-destinations: ${existingSlugs.size}`)

// ── Step 4: define all missing parks ─────────────────────────────────
const parks = [
  // ── Yarra Valley cluster ─────────────────────────────────────────────
  {
    slug: 'kinglake-national-park',
    name: 'Kinglake National Park',
    cluster: 'yarra-valley',
    lat: -37.52, lng: 145.35,
    drive_time_hours: 1.25, drive_km: 65,
    highlights: ['Masons Falls waterfall', 'Dense mountain ash forest', 'Wildlife recovery post-2009 fires', 'Jehosaphat Gully walk'],
    themes: ['Nature', 'Waterfalls', 'Hiking', 'Wildlife'],
  },
  {
    slug: 'yarra-ranges-national-park',
    name: 'Yarra Ranges National Park',
    cluster: 'yarra-valley',
    lat: -37.65, lng: 145.82,
    drive_time_hours: 1.5, drive_km: 90,
    highlights: ['Tall mountain ash — tallest flowering plants on Earth', 'Lake Mountain snow gums', 'Cumberland River gorge walks', 'Bicentennial Trail access'],
    themes: ['Nature', 'Hiking', 'Waterfalls', 'Alpine'],
  },

  // ── Dandenong Ranges cluster ──────────────────────────────────────────
  {
    slug: 'plenty-gorge',
    name: 'Plenty Gorge Parklands',
    cluster: 'dandenongs',
    lat: -37.65, lng: 145.07,
    drive_time_hours: 0.5, drive_km: 30,
    highlights: ['Deep river gorge 30 minutes from the CBD', 'Kangaroos at dusk', 'Riverside walking trails', 'Platypus sightings at dawn'],
    themes: ['Nature', 'Wildlife', 'Walking', 'Free Entry'],
  },

  // ── Geelong cluster ───────────────────────────────────────────────────
  {
    slug: 'brisbane-ranges',
    name: 'Brisbane Ranges National Park',
    cluster: 'geelong',
    lat: -37.93, lng: 144.28,
    drive_time_hours: 1.0, drive_km: 65,
    highlights: ['Rock wallabies and echidnas', 'Anakie Gorge walk', 'Spring wildflowers', 'One of the best close-to-Melbourne bushwalks'],
    themes: ['Nature', 'Wildlife', 'Hiking', 'Wildflowers'],
  },
  {
    slug: 'you-yangs',
    name: 'You Yangs Regional Park',
    cluster: 'geelong',
    lat: -37.93, lng: 144.38,
    drive_time_hours: 0.75, drive_km: 55,
    highlights: ['Flinders Peak panorama — Melbourne to bay to ranges', 'Koalas in the granite outcrops', 'Mountain bike trails', 'Echidnas and kangaroos'],
    themes: ['Nature', 'Wildlife', 'Hiking', 'Cycling'],
  },
  {
    slug: 'werribee-gorge',
    name: 'Werribee Gorge State Park',
    cluster: 'geelong',
    lat: -37.65, lng: 144.3,
    drive_time_hours: 1.0, drive_km: 65,
    highlights: ['Dramatic 30m sandstone gorge walls', 'The Slot canyon scramble', 'Riverside swim holes', 'Rock climbing routes'],
    themes: ['Nature', 'Hiking', 'Rock Climbing', 'Swimming'],
  },

  // ── Bright & Alpine cluster ───────────────────────────────────────────
  {
    slug: 'mount-buffalo-national-park',
    name: 'Mount Buffalo National Park',
    cluster: 'bright-alpine',
    lat: -36.73, lng: 146.82,
    drive_time_hours: 3.5, drive_km: 310,
    highlights: ['The Horn — Victoria\'s most accessible alpine summit', 'Lake Catani camping above the clouds', 'Eurobin Falls and Cathedral', 'Snow in winter, wildflowers in spring'],
    themes: ['Alpine', 'Hiking', 'Snow', 'Wildflowers', 'National Park'],
  },

  // ── Mansfield & Lake Eildon cluster ──────────────────────────────────
  {
    slug: 'fraser-national-park',
    name: 'Fraser National Park',
    cluster: 'mansfield-high-country',
    lat: -37.02, lng: 145.93,
    drive_time_hours: 2.0, drive_km: 150,
    highlights: ['Lake Eildon shoreline access', 'Blowhard fire tower views', 'Wombats, kangaroos and echidnas', 'Remote camping on the lakeshore'],
    themes: ['Nature', 'Hiking', 'Wildlife', 'Camping', 'National Park'],
  },

  // ── Bass Coast & South Gippsland cluster ─────────────────────────────
  {
    slug: 'tarra-bulga-national-park',
    name: 'Tarra-Bulga National Park',
    cluster: 'bass-coast',
    lat: -38.42, lng: 146.57,
    drive_time_hours: 2.5, drive_km: 200,
    highlights: ['Ancient temperate rainforest — tree ferns as tall as houses', 'Suspension bridge over the Tarra River gorge', 'Lyrebird calls echoing through the gullies', 'One of Victoria\'s most underrated wilderness gems'],
    themes: ['Rainforest', 'Hiking', 'Waterfalls', 'National Park', 'Wildlife'],
  },
  {
    slug: 'baw-baw-national-park',
    name: 'Baw Baw National Park',
    cluster: 'bass-coast',
    lat: -37.85, lng: 146.27,
    drive_time_hours: 2.0, drive_km: 130,
    highlights: ['Baw Baw Plateau — alpine meadows at 1,500m', 'Baw Baw Frog (critically endangered, found nowhere else)', 'Noojee trestle bridge walk', 'Snow in winter, wildflowers December–February'],
    themes: ['Alpine', 'Hiking', 'Snow', 'Wildlife', 'National Park'],
  },
  {
    slug: 'morwell-national-park',
    name: 'Morwell National Park',
    cluster: 'bass-coast',
    lat: -38.28, lng: 146.38,
    drive_time_hours: 2.0, drive_km: 155,
    highlights: ['Victoria\'s smallest national park — just 400ha of towering mountain ash', 'Fern gullies and crystal-clear streams', 'Kookaburras, crimson rosellas and lyrebirds', 'Peaceful half-day escape near the Latrobe Valley'],
    themes: ['Nature', 'Walking', 'Birdwatching', 'National Park'],
  },

  // ── East Gippsland cluster ────────────────────────────────────────────
  {
    slug: 'snowy-river-national-park',
    name: 'Snowy River National Park',
    cluster: 'east-gippsland',
    lat: -37.35, lng: 148.42,
    drive_time_hours: 4.5, drive_km: 390,
    highlights: ['Little River Gorge — Victoria\'s deepest gorge at 250m', 'Wild camping beside the Snowy River', 'McKillops Bridge and the river canyon views', 'One of Victoria\'s last truly wild rivers'],
    themes: ['National Park', 'Gorge', 'Camping', 'Hiking', 'Rivers'],
  },
  {
    slug: 'cape-conran',
    name: 'Cape Conran Coastal Park',
    cluster: 'east-gippsland',
    lat: -37.8, lng: 148.72,
    drive_time_hours: 4.5, drive_km: 390,
    highlights: ['Unspoiled wilderness beach stretching for miles', 'Banksia woodland walk to the cape', 'Rock pools at low tide', 'Offshore whale and dolphin sightings'],
    themes: ['Beach', 'Camping', 'Nature', 'National Park'],
  },
  {
    slug: 'mitchell-river-national-park',
    name: 'Mitchell River National Park',
    cluster: 'east-gippsland',
    lat: -37.55, lng: 147.35,
    drive_time_hours: 3.25, drive_km: 280,
    highlights: ['The Den of Nargun — a sacred cave in the river gorge', 'Blue Hole swimming spot — ice-cold and turquoise', 'Tall eucalyptus over 80m — among the tallest trees in the world', 'River gorge walks with sheer sandstone walls'],
    themes: ['Gorge', 'Hiking', 'Swimming', 'National Park', 'Indigenous Culture'],
  },
  {
    slug: 'coopracambra-national-park',
    name: 'Coopracambra National Park',
    cluster: 'east-gippsland',
    lat: -37.32, lng: 149.05,
    drive_time_hours: 5.5, drive_km: 480,
    highlights: ['Rugged wilderness — one of Victoria\'s least-visited parks', 'Ancient rainforest pockets in deep valleys', 'Rock art sites and significant Aboriginal heritage', 'Remote 4WD tracks through spectacular terrain'],
    themes: ['Remote', 'Rainforest', '4WD', 'National Park', 'Indigenous Culture'],
  },
  {
    slug: 'the-lakes-national-park',
    name: 'The Lakes National Park',
    cluster: 'east-gippsland',
    lat: -37.9, lng: 147.93,
    drive_time_hours: 3.5, drive_km: 310,
    highlights: ['Ninety Mile Beach — most remote surf beach in Victoria', 'Rotamah Island bird sanctuary', 'Kangaroos grazing on the dunes at sunset', 'Calm Gippsland Lakes side vs wild surf beach — same park'],
    themes: ['Beach', 'Wildlife', 'National Park', 'Birdwatching', 'Fishing'],
  },

  // ── Great Ocean Road cluster ──────────────────────────────────────────
  {
    slug: 'lower-glenelg-national-park',
    name: 'Lower Glenelg National Park',
    cluster: 'great-ocean-road',
    lat: -38.05, lng: 141.35,
    drive_time_hours: 4.5, drive_km: 430,
    highlights: ['Princess Margaret Rose Cave — stunning limestone formations', 'Canoe the Glenelg River gorge through red-limestone cliffs', 'Remote camping under river redgums', 'Nelson — Australia\'s smallest town with a pub'],
    themes: ['Caves', 'Canoeing', 'Camping', 'National Park', 'Rivers'],
  },
  {
    slug: 'mount-eccles-national-park',
    name: 'Mount Eccles (Budj Bim) National Park',
    cluster: 'great-ocean-road',
    lat: -38.08, lng: 141.9,
    drive_time_hours: 3.5, drive_km: 305,
    highlights: ['Budj Bim — UNESCO World Heritage eel traps, 6,600 years old', 'Crater lake inside a dormant volcano', 'Lava tubes and caves', 'Kangaroos grazing around the volcanic crater'],
    themes: ['UNESCO', 'Volcano', 'Indigenous Culture', 'National Park', 'Unique'],
  },
  {
    slug: 'mount-richmond-national-park',
    name: 'Mount Richmond National Park',
    cluster: 'great-ocean-road',
    lat: -38.38, lng: 141.47,
    drive_time_hours: 4.0, drive_km: 360,
    highlights: ['Spring orchids — over 250 species of native plants', 'Coastal heath with sweeping Southern Ocean views', 'Heathland walks through undisturbed scrub', 'Adjacent to Portland — whale watching capital of Australia'],
    themes: ['Wildflowers', 'Coastal', 'Walking', 'National Park'],
  },

  // ── Grampians cluster ─────────────────────────────────────────────────
  {
    slug: 'little-desert-national-park',
    name: 'Little Desert National Park',
    cluster: 'grampians',
    lat: -36.55, lng: 141.65,
    drive_time_hours: 4.0, drive_km: 360,
    highlights: ['Spring wildflower bloom — mallee heath erupting with colour', 'Malleefowl — rare mound-building birds', 'Endless night sky with zero light pollution', 'Camping under the stars in true outback peace'],
    themes: ['Wildflowers', 'Wildlife', 'Camping', 'National Park', 'Outback'],
  },

  // ── Wimmera cluster (new) ─────────────────────────────────────────────
  {
    slug: 'wyperfeld-national-park',
    name: 'Wyperfeld National Park',
    cluster: 'wimmera',
    lat: -35.5, lng: 142.03,
    drive_time_hours: 4.5, drive_km: 430,
    highlights: ['Pink Lake at Dimboola — flamingo-pink when algae blooms', 'Outback mallee scrub and red sand dunes', 'Emus, kangaroos and Major Mitchell cockatoos', 'One of Victoria\'s most remote and spectacular parks'],
    themes: ['Outback', 'Wildlife', 'National Park', 'Remote', 'Photography'],
  },
  {
    slug: 'horsham',
    name: 'Horsham & Natimuk',
    cluster: 'wimmera',
    lat: -36.712, lng: 142.199,
    drive_time_hours: 3.0, drive_km: 300,
    highlights: ['Natimuk — world-class bouldering on volcanic rock', 'Mount Arapiles — legendary climbing destination', 'Horsham Art Gallery — best regional gallery in western Victoria', 'Gateway to the Wimmera parks'],
    themes: ['Rock Climbing', 'Art', 'Outdoors', 'Wimmera'],
  },

  // ── Mildura & Sunraysia cluster (new) ────────────────────────────────
  {
    slug: 'mildura',
    name: 'Mildura',
    cluster: 'mildura-sunraysia',
    lat: -34.185, lng: 142.15,
    drive_time_hours: 5.5, drive_km: 550,
    highlights: ['Houseboat holidays on the Murray — iconic Australian bucket list', 'PS Melbourne — the oldest operational paddle steamer in the world', 'Rio Vista historic house', 'Sunraysia table grapes and citrus straight from the farm'],
    themes: ['Murray River', 'Houseboats', 'Wine', 'History', 'Outback'],
  },
  {
    slug: 'murray-sunset-national-park',
    name: 'Murray-Sunset National Park',
    cluster: 'mildura-sunraysia',
    lat: -35.02, lng: 141.5,
    drive_time_hours: 5.0, drive_km: 490,
    highlights: ['Pink Lakes — naturally brilliant pink from salt-tolerant algae', 'Red sand dunes in a sea of mallee scrub', 'Dingoes, emus and wedge-tailed eagles', 'Victoria\'s largest national park at 633,000 hectares'],
    themes: ['Pink Lakes', 'Outback', 'Wildlife', 'National Park', 'Photography'],
  },
  {
    slug: 'hattah-kulkyne-national-park',
    name: 'Hattah-Kulkyne National Park',
    cluster: 'mildura-sunraysia',
    lat: -34.75, lng: 142.3,
    drive_time_hours: 4.5, drive_km: 430,
    highlights: ['Lake Hattah — floods every few years, transforming the landscape overnight', 'Vast Murray pine woodland — a rare ecosystem', 'Kangaroos, emus and waterbirds in huge numbers', 'Remote 4WD tracks through pristine mallee country'],
    themes: ['Lakes', 'Wildlife', '4WD', 'National Park', 'Remote'],
  },
]

// ── Step 5: insert missing parks ──────────────────────────────────────
let added = 0
let skipped = 0

for (const p of parks) {
  if (existingSlugs.has(p.slug)) {
    console.log(`  SKIP (exists): ${p.name}`)
    skipped++
    continue
  }
  const clusterId = cid[p.cluster]
  if (!clusterId) {
    console.error(`  ERROR: cluster '${p.cluster}' not found for ${p.name}`)
    continue
  }
  const { error } = await sb.from('sub_destinations').insert({
    slug: p.slug,
    name: p.name,
    cluster_id: clusterId,
    lat: p.lat,
    lng: p.lng,
    drive_time_hours: p.drive_time_hours,
    drive_km: p.drive_km,
    highlights: p.highlights,
    themes: p.themes,
    display_order: 10,
  })
  if (error) {
    console.error(`  ERROR inserting ${p.name}: ${error.message}`)
  } else {
    console.log(`  ADDED: ${p.name} → ${p.cluster}`)
    added++
  }
}

console.log(`\nDone. Added: ${added}, Skipped (already exist): ${skipped}`)
