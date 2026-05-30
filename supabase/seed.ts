/**
 * Seed script — migrates all static data into Supabase.
 * Run with:  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx supabase/seed.ts
 *
 * Uses the SERVICE KEY (not anon key) so RLS write policies are satisfied.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── All cluster + sub-destination data ───────────────────────────

const CLUSTERS = [
  {
    id: 'yarra-valley', name: 'Yarra Valley',
    tagline: 'World-class wine, misty vineyards, and brunch worth the drive.',
    drive_time_range: '45 min – 1.5 hrs', themes: ['Wine','Food','Scenic drives','Day trip'],
    seasonal_scores: { summer:7, autumn:10, winter:7, spring:8 },
    image_emoji: '🍷', image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3',
    gradient_from: '#4a1c40', gradient_to: '#7c3a28', display_order: 1,
  },
  {
    id: 'dandenongs', name: 'Dandenong Ranges',
    tagline: 'Ancient fern gullies, Puffing Billy, and very good coffee.',
    drive_time_range: '45 min – 1 hr', themes: ['Rainforest','Cafes','Walking','Wildlife'],
    seasonal_scores: { summer:6, autumn:8, winter:7, spring:9 },
    image_emoji: '🌿', image_url: 'https://images.unsplash.com/photo-1516912481808-3406841bd33c',
    gradient_from: '#1a3a1a', gradient_to: '#2a5a2a', display_order: 2,
  },
  {
    id: 'mornington', name: 'Mornington Peninsula',
    tagline: 'Hot springs, ocean beaches, and cellar doors fifteen minutes apart.',
    drive_time_range: '1 – 1.5 hrs', themes: ['Beach','Hot springs','Wine','Relaxation'],
    seasonal_scores: { summer:10, autumn:7, winter:8, spring:8 },
    image_emoji: '♨️', image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b',
    gradient_from: '#0a3a5a', gradient_to: '#1a6a7a', display_order: 3,
  },
  {
    id: 'daylesford', name: 'Daylesford & Macedon',
    tagline: "Victoria's spa capital — mineral springs, slow food, and weekend bliss.",
    drive_time_range: '1 – 1.5 hrs', themes: ['Spa','Food','Gardens','Wellness'],
    seasonal_scores: { summer:6, autumn:8, winter:10, spring:8 },
    image_emoji: '🛁', image_url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b',
    gradient_from: '#2a4a2a', gradient_to: '#4a6a3a', display_order: 4,
  },
  {
    id: 'phillip-island', name: 'Phillip Island',
    tagline: "The penguin parade at sunset. Surf beaches by day. One of Victoria's greats.",
    drive_time_range: '1.5 – 2 hrs', themes: ['Wildlife','Beach','Surfing','Family'],
    seasonal_scores: { summer:9, autumn:7, winter:6, spring:8 },
    image_emoji: '🐧', image_url: 'https://images.unsplash.com/photo-1468581264429-2548ef9eb732',
    gradient_from: '#0a2a4a', gradient_to: '#0a4a6a', display_order: 5,
  },
  {
    id: 'great-ocean-road', name: 'Great Ocean Road',
    tagline: 'Choose your stop — each is a different trip. Torquay is 1.5 hrs, the Apostles are 3.5.',
    drive_time_range: '1.5 – 3.5 hrs', themes: ['Coastal','Cliffs','Surf','Rainforest'],
    seasonal_scores: { summer:8, autumn:8, winter:7, spring:9 },
    image_emoji: '🌊', image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    gradient_from: '#0c3460', gradient_to: '#0b5e47', display_order: 6,
  },
  {
    id: 'bass-coast', name: 'Bass Coast & South Gippsland',
    tagline: 'Surf beaches 1.5 hrs from Melbourne, a genuine underground mine tour, and quiet coastal villages.',
    drive_time_range: '1.5 – 2.5 hrs', themes: ['Beach','History','Surfing','Coastal'],
    seasonal_scores: { summer:9, autumn:6, winter:5, spring:8 },
    image_emoji: '🏖️', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    gradient_from: '#0a3a6a', gradient_to: '#1a6a5a', display_order: 7,
  },
  {
    id: 'grampians', name: 'Grampians (Gariwerd)',
    tagline: 'Wildflowers, ancient rock art, kangaroos, and hikes with views that earn them.',
    drive_time_range: '3 – 3.5 hrs', themes: ['Hiking','Wildlife','Wildflowers','Camping'],
    seasonal_scores: { summer:5, autumn:7, winter:6, spring:10 },
    image_emoji: '🌸', image_url: 'https://images.unsplash.com/photo-1511497584788-876760111969',
    gradient_from: '#3a1a5a', gradient_to: '#5a3a2a', display_order: 8,
  },
  {
    id: 'bright-alpine', name: 'Bright & Alpine',
    tagline: 'Famous autumn colours, ski villages in winter, and cycling trails all year.',
    drive_time_range: '3 – 4.5 hrs', themes: ['Autumn colours','Skiing','Cycling','Villages'],
    seasonal_scores: { summer:7, autumn:10, winter:9, spring:7 },
    image_emoji: '🍂', image_url: 'https://images.unsplash.com/photo-1477322524744-0eece9e79640',
    gradient_from: '#7c2d12', gradient_to: '#c2410c', display_order: 9,
  },
  {
    id: 'mansfield-high-country', name: 'Mansfield & Lake Eildon',
    tagline: 'Mount Buller for snow, Lake Eildon for houseboats, and a town that lives the Man from Snowy River.',
    drive_time_range: '2.5 – 3 hrs', themes: ['Skiing','Water sports','Hiking','Village'],
    seasonal_scores: { summer:8, autumn:7, winter:10, spring:7 },
    image_emoji: '⛷️', image_url: 'https://images.unsplash.com/photo-1551698618-1dde5ef4d9d0',
    gradient_from: '#1a2a4a', gradient_to: '#3a5a7a', display_order: 10,
  },
  {
    id: 'murray-river', name: 'Murray River',
    tagline: 'Paddle steamers, Victorian-era ports, and the kind of river life you only find up north.',
    drive_time_range: '2.5 – 3.5 hrs', themes: ['History','River','Paddle steamers','Wine'],
    seasonal_scores: { summer:6, autumn:8, winter:7, spring:8 },
    image_emoji: '⛵', image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64',
    gradient_from: '#2a4a5a', gradient_to: '#4a6a3a', display_order: 11,
  },
  {
    id: 'ballarat', name: 'Ballarat & Goldfields',
    tagline: 'Gold rush history, incredible bakeries, and galleries that surprise you.',
    drive_time_range: '1.5 hrs', themes: ['History','Food','Art','Family'],
    seasonal_scores: { summer:6, autumn:7, winter:7, spring:7 },
    image_emoji: '⚙️', image_url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df',
    gradient_from: '#3a2a0a', gradient_to: '#6a4a1a', display_order: 12,
  },
  {
    id: 'bendigo', name: 'Bendigo & Central Victoria',
    tagline: "Elegant gold-era streetscapes, serious wineries, and Australia's best regional art gallery.",
    drive_time_range: '1.5 – 2 hrs', themes: ['Wine','Art','History','Food'],
    seasonal_scores: { summer:5, autumn:8, winter:7, spring:7 },
    image_emoji: '🏛️', image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96',
    gradient_from: '#2a1a3a', gradient_to: '#4a2a5a', display_order: 13,
  },
  {
    id: 'wilsons-prom', name: "Wilson's Promontory",
    tagline: 'The southernmost point of mainland Australia — empty beaches, wombats, serious hiking.',
    drive_time_range: '2.5 – 3 hrs', themes: ['Hiking','Camping','Wildlife','Beaches'],
    seasonal_scores: { summer:8, autumn:7, winter:5, spring:9 },
    image_emoji: '🏕️', image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
    gradient_from: '#0a3a2a', gradient_to: '#1a5a3a', display_order: 14,
  },
  {
    id: 'east-gippsland', name: 'East Gippsland & Lakes',
    tagline: 'The Gippsland Lakes, ancient rainforest, and 90 Mile Beach — entirely off the tourist trail.',
    drive_time_range: '3 – 5 hrs', themes: ['Lakes','Fishing','Wilderness','Kayaking'],
    seasonal_scores: { summer:9, autumn:7, winter:5, spring:7 },
    image_emoji: '🛶', image_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
    gradient_from: '#0a2a4a', gradient_to: '#1a4a3a', display_order: 15,
  },
  {
    id: 'melbourne', name: 'Melbourne',
    tagline: "World-class food, laneways, galleries, and live sport — Victoria's capital has more than enough for a full day or weekend.",
    drive_time_range: '0 – 1.5 hrs', themes: ['Food','Culture','Art','Sport','Nightlife'],
    seasonal_scores: { summer:8, autumn:9, winter:7, spring:9 },
    image_emoji: '🏙️', image_url: 'https://images.unsplash.com/photo-1545044846-351ba102b6d5',
    gradient_from: '#1a1a2a', gradient_to: '#2a3a5a', display_order: 16,
  },
  {
    id: 'geelong', name: 'Geelong & Surf Coast Gateway',
    tagline: "Victoria's second city punches well above its weight — waterfront dining, a world-class art gallery, and surf beaches minutes away.",
    drive_time_range: '1 – 1.5 hrs', themes: ['Food','Art','Surf','Waterfront'],
    seasonal_scores: { summer:8, autumn:7, winter:6, spring:8 },
    image_emoji: '⚓', image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    gradient_from: '#0a2a4a', gradient_to: '#1a4a6a', display_order: 17,
  },
  {
    id: 'shepparton', name: 'Shepparton & Goulburn Valley',
    tagline: "Australia's fruit bowl — stone fruit orchards, a remarkable art museum, and Murray country hospitality.",
    drive_time_range: '2 – 2.5 hrs', themes: ['Food','Art','Nature','History'],
    seasonal_scores: { summer:6, autumn:8, winter:6, spring:7 },
    image_emoji: '🍑', image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef',
    gradient_from: '#3a2a0a', gradient_to: '#5a4a1a', display_order: 18,
  },
  {
    id: 'wodonga', name: 'Wodonga & Albury',
    tagline: "Twin border cities on the Murray — great food scene, the Snowy Mountains on the doorstep, and Australia's best rail trail.",
    drive_time_range: '3 – 3.5 hrs', themes: ['Food','Cycling','History','Nature'],
    seasonal_scores: { summer:6, autumn:7, winter:6, spring:7 },
    image_emoji: '🚲', image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
    gradient_from: '#1a2a1a', gradient_to: '#2a4a2a', display_order: 19,
  },
]

const SUB_DESTINATIONS = [
  // Yarra Valley
  { id:'yarra-glen', cluster_id:'yarra-valley', name:'Yarra Glen', drive_time_hours:0.75, drive_km:50, lat:-37.655, lng:145.383, themes:['Wine','Art','History'], highlights:['Gulf Station Historic Farm','Tarrawarra Museum of Art','Cellar doors on Melba Hwy','Giant Steps & Innocent Bystander'], display_order:1 },
  { id:'healesville', cluster_id:'yarra-valley', name:'Healesville', drive_time_hours:1.0, drive_km:65, lat:-37.654, lng:145.520, themes:['Wildlife','Wine','Walking'], highlights:['Healesville Sanctuary (native wildlife)','Coombe Estate winery','Badger Weir rainforest walk','Cafes on Don Road'], display_order:2 },
  { id:'marysville', cluster_id:'yarra-valley', name:'Marysville', drive_time_hours:1.3, drive_km:90, lat:-37.513, lng:145.745, themes:['Nature','Snow','Walking','Waterfalls'], highlights:["Steavenson Falls — Victoria's highest accessible waterfall (lit at night)",'Lake Mountain snow (Jul–Sep, closest snow to Melbourne)',"Bruno's Art & Sculpture Garden",'Marysville Bakery and township cafes'], display_order:3 },
  { id:'warburton', cluster_id:'yarra-valley', name:'Warburton', drive_time_hours:1.3, drive_km:75, lat:-37.753, lng:145.685, themes:['Hiking','Cycling','Nature'], highlights:["O'Shannassy Aqueduct Trail (rail trail)",'Ada Tree — 300-yr-old mountain ash','Upper Yarra dam views','Warburton township bakeries'], display_order:4 },

  // Dandenong Ranges
  { id:'belgrave', cluster_id:'dandenongs', name:'Belgrave (Puffing Billy)', drive_time_hours:0.75, drive_km:42, lat:-37.902, lng:145.355, themes:['Family','Walking','Wildlife'], highlights:['Puffing Billy steam train to Gembrook','Sherbrooke Forest walk','Grants Picnic Ground (king parrots & cockatoos)','Mist over the ranges at dawn'], display_order:1 },
  { id:'sassafras-olinda', cluster_id:'dandenongs', name:'Sassafras & Olinda', drive_time_hours:0.9, drive_km:50, lat:-37.847, lng:145.368, themes:['Cafes','Gardens','Scenic'], highlights:["Miss Marple's Tearoom (famous Devonshire tea)",'Cloudehill Gardens','National Rhododendron Garden (Oct peak)','Hanging rock viewpoint'], display_order:2 },
  { id:'emerald', cluster_id:'dandenongs', name:'Emerald & Monbulk', drive_time_hours:0.9, drive_km:50, lat:-37.937, lng:145.445, themes:['Family','Walking','Nature'], highlights:['Nobelius Heritage Nursery Park','Puffing Billy stops at Lakeside and Emerald Lake','Cardinia Reservoir Park walking tracks','Strawberry picking in season (Nov–Feb)'], display_order:3 },
  { id:'mount-dandenong', cluster_id:'dandenongs', name:'Mount Dandenong', drive_time_hours:1.0, drive_km:55, lat:-37.832, lng:145.359, themes:['Views','Gardens','Walking'], highlights:['Sky High restaurant — panoramic views over Melbourne at night','George Tindale Memorial Garden','William Ricketts Sanctuary (forest sculptures)','Doongalla Reserve walking tracks'], display_order:4 },

  // Mornington Peninsula
  { id:'mornington-town', cluster_id:'mornington', name:'Mornington', drive_time_hours:1.0, drive_km:60, lat:-38.219, lng:145.037, themes:['Beach','Food','Relaxation'], highlights:['Mornington Main Street cafes','Mills Beach and pier','Peninsula Hot Springs (25 min further)',"Arthur's Seat Eagle gondola"], display_order:1 },
  { id:'red-hill', cluster_id:'mornington', name:'Red Hill & Merricks', drive_time_hours:1.3, drive_km:80, lat:-38.360, lng:145.115, themes:['Wine','Food','Scenic'], highlights:['Ten Minutes by Tractor winery','Merricks General Wine Store','Red Hill Brewery','Rolling vineyard views'], display_order:2 },
  { id:'sorrento', cluster_id:'mornington', name:'Sorrento & Portsea', drive_time_hours:1.5, drive_km:95, lat:-38.338, lng:144.740, themes:['Beach','Walking','Wildlife'], highlights:['Back Beach surf and rock pools','Sorrento village boutiques','Dolphin & seal cruise departures','Ferry to Queenscliff'], display_order:3 },
  { id:'peninsula-hot-springs', cluster_id:'mornington', name:'Peninsula Hot Springs', drive_time_hours:1.4, drive_km:90, lat:-38.416, lng:144.954, themes:['Wellness','Relaxation','Hot springs'], highlights:['Open-air geothermal pools','Cave pool and hillside bathing','Café Salso on-site dining','Bathhouse and spa treatments'], display_order:4 },
  { id:'flinders', cluster_id:'mornington', name:'Flinders & Cape Schanck', drive_time_hours:1.7, drive_km:110, lat:-38.473, lng:145.296, themes:['Scenic','Food','Coastal','Walking'], highlights:['Cape Schanck Lighthouse — dramatic boardwalk over volcanic rock','Flinders Hotel (great pub, clifftop views)','Bass & Flinders Distillery','Wild ocean beaches with almost no crowds'], display_order:5 },
  { id:'dromana', cluster_id:'mornington', name:'Dromana & Arthurs Seat', drive_time_hours:1.1, drive_km:70, lat:-38.334, lng:144.967, themes:['Scenic','Wildlife','Walking'], highlights:["Arthur's Seat Eagle gondola (views across Port Phillip Bay)",'State park hiking loops','High-density farm-gate wine, cider, and farm produce','Heronswood House and heirloom gardens'], display_order:6 },

  // Daylesford & Macedon
  { id:'kyneton', cluster_id:'daylesford', name:'Kyneton', drive_time_hours:0.9, drive_km:75, lat:-37.244, lng:144.452, themes:['Food','History','Walking'], highlights:["Piper Street — one of Victoria's best food streets",'Campaspe River walk','Kyneton Botanical Gardens','Local art galleries and antique shops'], display_order:1 },
  { id:'macedon', cluster_id:'daylesford', name:'Macedon & Woodend', drive_time_hours:1.0, drive_km:65, lat:-37.424, lng:144.568, themes:['History','Wine','Walking'], highlights:['Hanging Rock Reserve','Macedon Ranges wineries','Woodend High Street cafes','Mount Macedon gardens (April peak)'], display_order:2 },
  { id:'trentham', cluster_id:'daylesford', name:'Trentham', drive_time_hours:1.3, drive_km:80, lat:-37.388, lng:144.319, themes:['Nature','Food','Day trip'], highlights:['Trentham Falls (largest single-drop in Victoria)','Cosmo Brewery','Serendipity bakery & deli','Rolling hill farming country'], display_order:3 },
  { id:'daylesford-town', cluster_id:'daylesford', name:'Daylesford', drive_time_hours:1.5, drive_km:110, lat:-37.344, lng:144.143, themes:['Wellness','Art','Spa','Food'], highlights:['Convent Gallery and gardens','Lake Daylesford walk','Mineral springs (free, roadside)','Wombat Hill Botanic Gardens'], display_order:4 },
  { id:'hepburn-springs', cluster_id:'daylesford', name:'Hepburn Springs', drive_time_hours:1.5, drive_km:115, lat:-37.318, lng:144.143, themes:['Wellness','Spa','Relaxation'], highlights:['Hepburn Bathhouse & Spa — Victorian-era mineral baths','Mineral Springs Reserve (free tasting from the ground)','Lavandula Swiss Italian Farm (Jan–Mar lavender peak)','Cosy B&Bs and retreat accommodation'], display_order:5 },

  // Phillip Island
  { id:'san-remo', cluster_id:'phillip-island', name:'San Remo', drive_time_hours:1.5, drive_km:120, lat:-38.525, lng:145.477, themes:['Food','Wildlife','Relaxation'], highlights:['Fresh fish & chips at the pelican pontoon','Pelicans fed daily at noon','San Remo Hotel on the water','Gateway to Phillip Island bridge views'], display_order:1 },
  { id:'cowes', cluster_id:'phillip-island', name:'Cowes', drive_time_hours:1.8, drive_km:140, lat:-38.455, lng:145.238, themes:['Beach','Food','Family'], highlights:['Thompson Avenue cafes and restaurants','Cowes beach (calm, family-friendly)','Koala Conservation Reserve','Ferry to Stony Point (Mornington Peninsula)'], display_order:2 },
  { id:'penguin-parade', cluster_id:'phillip-island', name:'Penguin Parade & Nobbies', drive_time_hours:2.0, drive_km:145, lat:-38.515, lng:144.998, themes:['Wildlife','Coastal','Iconic'], highlights:['Little penguin parade (nightly at dusk)','Nobbies Centre and fur seal viewing','Boardwalk over rugged coastal landscape','Sunset at Cape Woolamai (surf beach)'], display_order:3 },
  { id:'rhyll', cluster_id:'phillip-island', name:'Rhyll & Churchill Island', drive_time_hours:1.9, drive_km:142, lat:-38.467, lng:145.304, themes:['History','Wildlife','Family'], highlights:["Churchill Island Heritage Farm — Victoria's first farm",'Rhyll Inlet — mangroves and wading birds','Rhyll Trout & Bush Tucker Farm','Quiet alternative to busy Cowes'], display_order:4 },

  // Great Ocean Road
  { id:'torquay', cluster_id:'great-ocean-road', name:'Torquay & Bells Beach', drive_time_hours:1.3, drive_km:95, lat:-38.335, lng:144.319, themes:['Surf','Beach','Walking'], highlights:['Bells Beach — world-famous surf break','Surf World Museum','Point Addis coastal walk','Jan Juc rock pools'], display_order:1 },
  { id:'anglesea', cluster_id:'great-ocean-road', name:'Anglesea', drive_time_hours:1.3, drive_km:105, lat:-38.405, lng:144.185, themes:['Wildlife','Beach','Family','Walking'], highlights:['Kangaroos on the golf course — wild mobs, free to watch','Anglesea River mouth beach (calm, perfect for kids)','Point Roadknight beach (sheltered swimming)','Great Ocean Eats food trail'], display_order:2 },
  { id:'aireys-inlet', cluster_id:'great-ocean-road', name:'Aireys Inlet & Fairhaven', drive_time_hours:1.5, drive_km:115, lat:-38.461, lng:144.094, themes:['Coastal','Scenic','Walking','Art'], highlights:['Split Point Lighthouse — iconic white tower on the cliff','Surf beach and rock shelves at Fairhaven','Moggs Creek Picnic Ground (forested gully)','Artists Walk — local galleries and studios'], display_order:3 },
  { id:'lorne', cluster_id:'great-ocean-road', name:'Lorne', drive_time_hours:1.8, drive_km:140, lat:-38.541, lng:143.980, themes:['Beach','Waterfalls','Food'], highlights:['Erskine Falls (30-min walk)','Lorne Beach and pier','Great Ocean Road Chocolaterie','Kafe Kahlua and Lorne Hotel'], display_order:4 },
  { id:'kennett-river', cluster_id:'great-ocean-road', name:'Kennett River & Grey River', drive_time_hours:1.8, drive_km:145, lat:-38.618, lng:143.870, themes:['Wildlife','Camping','Coastal'], highlights:['Wild koalas in the eucalypts on Grey River Road — hundreds of them','Café Koala and caravan park (camping)','Wye River beach (small, beautiful)','One of the best wildlife encounters on the GOR'], display_order:5 },
  { id:'apollo-bay', cluster_id:'great-ocean-road', name:'Apollo Bay', drive_time_hours:2.3, drive_km:190, lat:-38.759, lng:143.672, themes:['Food','Rainforest','Coastal'], highlights:['Apollo Bay foreshore market (Sat morning)','Mariners Lookout walk (45 min return)','Wild Dog Road — rainforest detour to Otways','Fresh crayfish at the harbour'], display_order:6 },
  { id:'great-otway', cluster_id:'great-ocean-road', name:'Great Otway National Park', drive_time_hours:2.5, drive_km:210, lat:-38.868, lng:143.550, themes:['Rainforest','Wildlife','Lighthouse','Hiking'], highlights:['Triplet Falls — ancient temperate rainforest','Cape Otway Lighthouse (oldest on mainland)','Koalas wild in the roadside gums','Aire River camping ground'], display_order:7 },
  { id:'twelve-apostles', cluster_id:'great-ocean-road', name:'Port Campbell & 12 Apostles', drive_time_hours:3.5, drive_km:275, lat:-38.663, lng:142.996, themes:['Iconic','Coastal','Photography'], highlights:['Twelve Apostles at sunrise or golden hour','Loch Ard Gorge — shipwreck history and beach','The Arch and London Bridge rock stacks','Overnight in Port Campbell township'], display_order:8 },
  { id:'warrnambool', cluster_id:'great-ocean-road', name:'Warrnambool', drive_time_hours:3.3, drive_km:265, lat:-38.381, lng:142.484, themes:['Wildlife','History','Coastal','Family'], highlights:['Southern right whales nurse calves at Logans Beach (Jun–Sep)','Flagstaff Hill Maritime Village — live shipwreck theatre','Lake Pertobe Adventure Playground','Tower Hill Wildlife Reserve — emus, koalas, kangaroos'], display_order:9 },
  { id:'port-fairy', cluster_id:'great-ocean-road', name:'Port Fairy', drive_time_hours:3.5, drive_km:285, lat:-38.385, lng:142.233, themes:['History','Food','Coastal','Music'], highlights:['Port Fairy Folk Festival — one of Australia\'s largest (March)','Griffiths Island — short-tailed shearwater colony at dusk','Historic fishing wharf along the Moyne River','National Trust classified town with 50+ heritage buildings'], display_order:10 },
  { id:'portland', cluster_id:'great-ocean-road', name:'Portland & Cape Bridgewater', drive_time_hours:4.0, drive_km:360, lat:-38.343, lng:141.604, themes:['Wildlife','History','Coastal'], highlights:["Cape Bridgewater fur seal colony — Australia's largest accessible colony",'Bridgewater Blowholes and the Petrified Forest',"Victoria's oldest permanent European settlement (1834)",'Cape Nelson Lighthouse walks'], display_order:11 },

  // Bass Coast
  { id:'inverloch', cluster_id:'bass-coast', name:'Inverloch', drive_time_hours:1.5, drive_km:145, lat:-38.632, lng:145.724, themes:['Beach','Nature','Family','Walking'], highlights:['Inverloch surf beach and blowhole','Flat Rocks — dinosaur fossil site (world-class)','Venus Bay (wild, uncrowded beach 15 min away)','Inverloch township cafes and fish & chips'], display_order:1 },
  { id:'wonthaggi', cluster_id:'bass-coast', name:'Wonthaggi & Cape Paterson', drive_time_hours:1.7, drive_km:140, lat:-38.607, lng:145.597, themes:['History','Beach','Walking'], highlights:['State Coal Mine — genuinely fascinating underground tour','Cape Paterson surf beach (locals\' favourite)','Bunurong Marine and Coastal Park',"Cape Paterson Blowhole and Eagle's Nest walk"], display_order:2 },
  { id:'walhalla', cluster_id:'bass-coast', name:'Walhalla', drive_time_hours:2.5, drive_km:185, lat:-37.931, lng:146.448, themes:['History','Hiking','Heritage'], highlights:["One of Victoria's best preserved gold-rush towns",'Long Tunnel Extended Mine tour (underground, very atmospheric)','Walhalla Goldfields Railway — restored narrow gauge','Cricket Ground — must be Victoria\'s steepest'], display_order:3 },
  { id:'korumburra', cluster_id:'bass-coast', name:'Korumburra & Leongatha', drive_time_hours:1.5, drive_km:120, lat:-38.434, lng:145.828, themes:['History','Cycling','Scenic'], highlights:['Coal Creek Heritage Village (outdoor museum)','South Gippsland Rail Trail (cycling)','Rolling green dairy country','Leongatha country town bakeries'], display_order:4 },

  // Grampians
  { id:'halls-gap', cluster_id:'grampians', name:'Halls Gap', drive_time_hours:3.0, drive_km:235, lat:-37.138, lng:142.518, themes:['Wildlife','Hiking','Base camp'], highlights:['Kangaroos on the oval at dawn','Silverband Falls walk (easy, 30 min)','Halls Gap Zoo','Base for all Grampians hikes'], display_order:1 },
  { id:'boroka-pinnacle', cluster_id:'grampians', name:'Boroka & The Pinnacle', drive_time_hours:3.2, drive_km:240, lat:-37.207, lng:142.531, themes:['Hiking','Views','Wildflowers'], highlights:['Boroka Lookout — best panoramic view in the Grampians','The Pinnacle hike (2 hrs return, moderate)','Reid Lookout and The Balconies (easy walk)','Wildflowers Sep–Nov'], display_order:2 },
  { id:'brambuk', cluster_id:'grampians', name:'Brambuk Cultural Centre', drive_time_hours:3.0, drive_km:235, lat:-37.133, lng:142.520, themes:['Culture','History','Indigenous','Walking'], highlights:['Brambuk — Aboriginal cultural centre, owned and run by Djab wurrung and Jardwadjali','Ancient rock art sites (guided tours available)',"Bunjil's Shelter — sacred site nearby",'Context for what Gariwerd means to Country'], display_order:3 },
  { id:'dunkeld', cluster_id:'grampians', name:'Dunkeld', drive_time_hours:3.5, drive_km:260, lat:-37.653, lng:142.362, themes:['Dining','Hiking','Wildlife'], highlights:['Royal Mail Hotel — best regional restaurant in VIC','Mount Sturgeon and Mount Abrupt hikes','Southern Grampians visitor centre','Kangaroos and emus at the foothills'], display_order:4 },
  { id:'stawell', cluster_id:'grampians', name:'Stawell & Great Western', drive_time_hours:3.0, drive_km:240, lat:-37.058, lng:142.777, themes:['History','Wine','Heritage'], highlights:["Stawell Gift (Australia's oldest professional footrace, since 1878)",'Seppelt Great Western underground sparkling wine drives','Best\'s Wines — Victoria\'s oldest family winery (1866)','Bunjil\'s Shelter Aboriginal rock art site (40 min away)'], display_order:5 },

  // Bright & Alpine
  { id:'wangaratta', cluster_id:'bright-alpine', name:'Wangaratta', drive_time_hours:2.5, drive_km:235, lat:-36.357, lng:146.312, themes:['Food','Wine','Music','Gateway'], highlights:['Wangaratta Jazz & Blues Festival (October/November, world-class)','Milawa Cheese Factory (30 min away, must stop)','Brown Brothers winery (Milawa — classic Victoria)','Gateway to King Valley cycling trails and Beechworth'], display_order:1 },
  { id:'rutherglen', cluster_id:'bright-alpine', name:'Rutherglen', drive_time_hours:2.8, drive_km:275, lat:-36.054, lng:146.459, themes:['Wine','History','Food'], highlights:['Morris Wines and Chambers Rosewood — fortified wines unlike anywhere else in Australia','Rutherglen Wine Walk (cellar doors walking distance)','All Saints Estate homestead and gardens','Tastes of Rutherglen festival (March)'], display_order:2 },
  { id:'beechworth', cluster_id:'bright-alpine', name:'Beechworth', drive_time_hours:3.0, drive_km:270, lat:-36.357, lng:146.688, themes:['History','Food','Craft beer'], highlights:['Beechworth Honey (museum + tasting)','Historic granite precinct (gold rush era)','Bridge Road Brewers','Ned Kelly was tried here — courthouse still standing'], display_order:3 },
  { id:'bright-town', cluster_id:'bright-alpine', name:'Bright', drive_time_hours:3.5, drive_km:320, lat:-36.727, lng:146.957, themes:['Autumn colours','Cycling','Food'], highlights:['Ovens River walk — peak autumn colour May','Canyon Brewery and Eatery','Mystic Mountains cycling trails','Hang gliding and paragliding launch site'], display_order:4 },
  { id:'mount-hotham', cluster_id:'bright-alpine', name:'Mount Hotham', drive_time_hours:4.0, drive_km:370, lat:-36.990, lng:147.200, themes:['Skiing','Snow','Hiking','Village'], highlights:["Victoria's highest ski resort — steep terrain, serious skiing",'Dinner Plain village (architecturally remarkable, 9 km away)','Alpine walking tracks in summer','Hotham–Falls Creek ski-through (longest in Australia)'], display_order:5 },
  { id:'falls-creek', cluster_id:'bright-alpine', name:'Falls Creek', drive_time_hours:4.5, drive_km:380, lat:-36.863, lng:147.274, themes:['Skiing','Snow','Village'], highlights:['Ski-in ski-out village (Jun–Sep)','Snowshoe and cross-country trails','Falls Creek walking tracks in summer','Village square — good food year-round'], display_order:6 },
  { id:'yackandandah', cluster_id:'bright-alpine', name:'Yackandandah', drive_time_hours:3.2, drive_km:300, lat:-36.311, lng:146.847, themes:['History','Walking','Heritage'], highlights:["Victoria's best preserved 19th-century gold rush streetscape",'Native forest walking loops and gold-era creek systems','Veranda-clad country cafes and classic old-style sweet shops','Yackandandah Market (third Sunday of the month)'], display_order:7 },

  // Mansfield & High Country
  { id:'mansfield-town', cluster_id:'mansfield-high-country', name:'Mansfield', drive_time_hours:2.5, drive_km:200, lat:-37.054, lng:146.088, themes:['History','Food','Gateway'], highlights:['Man from Snowy River history — horse country','Mansfield High Country Visitor Centre','Mansfield brewery and local restaurants','Gateway to Mount Buller and the Victorian High Country'], display_order:1 },
  { id:'mount-buller', cluster_id:'mansfield-high-country', name:'Mount Buller', drive_time_hours:3.0, drive_km:240, lat:-37.153, lng:146.440, themes:['Skiing','Snow','Hiking','Village'], highlights:["Victoria's most visited ski resort (Jun–Sep)",'Mountain biking and hiking trails (Oct–May)','Village atmosphere with year-round accommodation','Views from the summit (1805 m) in any season'], display_order:2 },
  { id:'lake-eildon', cluster_id:'mansfield-high-country', name:'Lake Eildon', drive_time_hours:2.5, drive_km:180, lat:-37.233, lng:145.920, themes:['Water sports','Fishing','Nature','Camping'], highlights:['Houseboat hire — a very Victorian holiday institution','Fishing for golden perch and trout','Fraser National Park walking tracks around the lake','Bonnie Doon and Eildon townships on the water'], display_order:3 },

  // Murray River
  { id:'echuca', cluster_id:'murray-river', name:'Echuca', drive_time_hours:2.5, drive_km:210, lat:-36.139, lng:144.753, themes:['History','River','Food','Family'], highlights:["Port of Echuca — best preserved Victorian-era river port in Australia",'Paddle steamer trips on the Murray',"Historic High Street and Star Hotel (Victoria's oldest licensed hotel)",'Murray Esplanade restaurants and the old wharf precinct'], display_order:1 },
  { id:'yarrawonga', cluster_id:'murray-river', name:'Yarrawonga & Mulwala', drive_time_hours:3.0, drive_km:290, lat:-36.021, lng:146.002, themes:['Water sports','Golf','Relaxation'], highlights:['Lake Mulwala — water skiing, jetskis, houseboats','Yarrawonga Mulwala Golf Club (36 holes, two states)','Boat hire on the Murray','Holiday-town energy without the crowds of Echuca'], display_order:2 },
  { id:'cobram', cluster_id:'murray-river', name:'Cobram', drive_time_hours:3.0, drive_km:285, lat:-35.924, lng:145.649, themes:['Nature','Food','Swimming','Family'], highlights:['Peach and nectarine picking in season (Jan–Feb)','Murray River beaches — white sand, calm swimming','Cobram peach festival and orchards','Thompsons Beach on the Murray (free, beautiful)'], display_order:3 },
  { id:'swan-hill', cluster_id:'murray-river', name:'Swan Hill', drive_time_hours:3.5, drive_km:340, lat:-35.338, lng:143.554, themes:['History','River','Food'], highlights:['Pioneer Settlement open-air museum (river life history)','PS Pyap paddle steamer day cruises','Heartbeat of the Murray night laser show','Murray Downs Golf Course'], display_order:4 },

  // Ballarat & Goldfields
  { id:'sovereign-hill', cluster_id:'ballarat', name:'Sovereign Hill', drive_time_hours:1.5, drive_km:115, lat:-37.574, lng:143.839, themes:['History','Family','Immersive'], highlights:['Living history gold rush precinct','Pan for real gold','Underground mine tour','Blood on the Southern Cross night show'], display_order:1 },
  { id:'ballarat-town', cluster_id:'ballarat', name:'Ballarat CBD', drive_time_hours:1.5, drive_km:115, lat:-37.562, lng:143.864, themes:['Art','History','Food'], highlights:['Art Gallery of Ballarat — best regional gallery in VIC','Lydiard Street heritage architecture','The Mill Markets (massive antiques)','Lake Wendouree parklands'], display_order:2 },
  { id:'clunes', cluster_id:'ballarat', name:'Clunes', drive_time_hours:1.8, drive_km:140, lat:-37.296, lng:143.786, themes:['History','Books','Walking'], highlights:['Clunes Booktown Festival (May)','Intact 1850s goldfield streetscape','Cornish Hill walking track','Clunes Museum — first place gold found in VIC'], display_order:3 },
  { id:'ararat', cluster_id:'ballarat', name:'Ararat & Great Western', drive_time_hours:2.0, drive_km:200, lat:-37.284, lng:143.014, themes:['Wine','History','Heritage'], highlights:["Best's Wines — Victoria's oldest family winery (1866)",'Seppelt Great Western cellar (underground drives, extraordinary)','J Ward — former asylum, heritage tours','Pyrenees wine region cellar doors'], display_order:4 },
  { id:'creswick', cluster_id:'ballarat', name:'Creswick', drive_time_hours:1.7, drive_km:130, lat:-37.425, lng:143.895, themes:['History','Nature','Walking'], highlights:['Creswick Woollen Mills — last commercial coloured wool spinner in Australia','St George Lake walking trails','Creswick Regional Park forest walks','Historic mining and pastoral town architecture'], display_order:5 },

  // Bendigo & Central Victoria
  { id:'castlemaine', cluster_id:'bendigo', name:'Castlemaine', drive_time_hours:1.5, drive_km:120, lat:-37.062, lng:144.213, themes:['Art','History','Food'], highlights:['Castlemaine Art Museum (stunning heritage building)','The Taproom and Theatre Royal','Mount Alexander Fruit Gardens','Castlemaine Diggings National Heritage Park'], display_order:1 },
  { id:'maldon', cluster_id:'bendigo', name:'Maldon', drive_time_hours:1.7, drive_km:145, lat:-36.993, lng:144.067, themes:['History','Heritage','Scenic'], highlights:["Australia's first Notable Town (intact goldfields)",'Victorian Goldfields Railway steam train','Mount Tarrangower lookout','Tea rooms and antique shops on Main St'], display_order:2 },
  { id:'heathcote', cluster_id:'bendigo', name:'Heathcote', drive_time_hours:1.5, drive_km:130, lat:-36.915, lng:144.706, themes:['Wine','Nature','Food'], highlights:['Heathcote wine region — 100% Cambrian red soil, unique in Australia','Paul Osicka Winery and Tellurian Wines','McIvor Creek and McIvor Forest walks','Heathcote township with local deli and galleries'], display_order:3 },
  { id:'bendigo-town', cluster_id:'bendigo', name:'Bendigo', drive_time_hours:1.8, drive_km:150, lat:-36.758, lng:144.280, themes:['Art','History','Food'], highlights:['Bendigo Art Gallery (major national exhibitions)','Central Deborah Gold Mine tour','Golden Dragon Museum','Rosalind Park and fountain'], display_order:4 },

  // Wilson's Promontory
  { id:'fish-creek', cluster_id:'wilsons-prom', name:"Fish Creek & Foster", drive_time_hours:2.3, drive_km:180, lat:-38.687, lng:146.086, themes:['Food','Scenic','Gateway'], highlights:['Fish Creek Hotel (excellent pub food)','Rolling green South Gippsland hills','Foster — gateway town for the Prom, good bakeries','Waratah Bay and Sandy Point beach nearby'], display_order:1 },
  { id:'tidal-river', cluster_id:'wilsons-prom', name:'Tidal River', drive_time_hours:2.8, drive_km:230, lat:-38.984, lng:146.316, themes:['Camping','Beaches','Wildlife','Hiking'], highlights:['Squeaky Beach — literally squeaks underfoot','Lilly Pilly Gully nature walk (2.5 hrs)','Wombats around campsites at dusk','Norman Beach — clear and calm swimming'], display_order:2 },
  { id:'wilsons-lighthouse', cluster_id:'wilsons-prom', name:'South Point & Lighthouse', drive_time_hours:3.5, drive_km:250, lat:-39.136, lng:146.380, themes:['Hiking','Remote','Iconic'], highlights:['Southernmost point of mainland Australia','Lighthouse overnight stays (book ahead)','Waterloo Bay — wild and remote','Multi-day Great Prom Walk'], display_order:3 },

  // East Gippsland
  { id:'bairnsdale', cluster_id:'east-gippsland', name:'Bairnsdale & Paynesville', drive_time_hours:3.0, drive_km:280, lat:-37.830, lng:147.607, themes:['Culture','Wildlife','Waterfront'], highlights:["St Mary's Church murals (the Sistine Chapel of Gippsland)",'Paynesville waterfront dining','Raymond Island koala colony (free ferry)','Gippsland Lakes Coastal Park'], display_order:1 },
  { id:'metung', cluster_id:'east-gippsland', name:'Metung', drive_time_hours:3.5, drive_km:310, lat:-37.906, lng:147.883, themes:['Lakes','Relaxation','Food','Boating'], highlights:["One of Victoria's most beautiful lakeside villages",'Kayaking on Bancroft Bay — calm, clear water','Metung Hotel and Gallery Metung','Houseboat hire on the Gippsland Lakes'], display_order:2 },
  { id:'lakes-entrance', cluster_id:'east-gippsland', name:'Lakes Entrance', drive_time_hours:3.5, drive_km:320, lat:-37.881, lng:147.980, themes:['Lakes','Food','Boating'], highlights:['Footbridge over the entrance to Ninety Mile Beach','Metung — relaxed village on the lake','Houseboat hire on the Gippsland Lakes','Fresh oysters at the Fishermen\'s Co-op'], display_order:3 },
  { id:'buchan', cluster_id:'east-gippsland', name:'Buchan Caves', drive_time_hours:4.0, drive_km:360, lat:-37.500, lng:148.167, themes:['Nature','Wildlife','Camping','Hiking'], highlights:['Buchan Caves — remarkable limestone formations, guided tours daily','Kangaroos and wallabies at the reserve at dusk','Buchan Valley camping ground (riverside)','Snowy River National Park entry point'], display_order:4 },
  { id:'mallacoota', cluster_id:'east-gippsland', name:'Mallacoota', drive_time_hours:5.0, drive_km:530, lat:-37.563, lng:149.745, themes:['Nature','Remote','Wildlife','Beaches'], highlights:['Croajingolong National Park (UNESCO listed biosphere reserve)','Top and Bottom Lakes kayaking','Gipsy Point — kangaroos at dusk on the waterfront','Gabo Island Lighthouse boat excursions'], display_order:5 },
  { id:'errinundra', cluster_id:'east-gippsland', name:'Errinundra Plateau', drive_time_hours:4.5, drive_km:390, lat:-37.435, lng:148.840, themes:['Rainforest','Remote','Nature'], highlights:['Oldest cool-temperate rainforest in Victoria','Big Tree — a 300-yr mountain ash','Adams Creek walk through cathedral-like ferns','Virtually no other tourists'], display_order:6 },

  // Melbourne
  { id:'melbourne-cbd', cluster_id:'melbourne', name:'Melbourne CBD', drive_time_hours:0, drive_km:0, lat:-37.813, lng:144.963, themes:['Food','Culture','Art','Sport','Laneways'], highlights:['Federation Square & NGV (free entry)','Queen Victoria Market (Tue–Sun)','Iconic laneways — Hosier, Degraves, Centre Place','Rooftop bars and world-class dining'], display_order:1 },
  { id:'fitzroy-collingwood', cluster_id:'melbourne', name:'Fitzroy & Collingwood', drive_time_hours:0.2, drive_km:3, lat:-37.798, lng:144.978, themes:['Cafes','Art','Bars','Shopping'], highlights:['Brunswick Street cafes and restaurants','Smith Street — boutiques, bars, and live music','Gertrude Contemporary and local galleries','Slow Lane coffee and the Fitzroy bottle shop scene'], display_order:2 },
  { id:'st-kilda', cluster_id:'melbourne', name:'St Kilda', drive_time_hours:0.3, drive_km:6, lat:-37.868, lng:144.981, themes:['Beach','Food','Nightlife','Art'], highlights:['St Kilda beach and foreshore promenade','Luna Park (iconic heritage fun park)','Acland Street cake shops and restaurants','Sunday market at the Esplanade'], display_order:3 },
  { id:'south-yarra-prahran', cluster_id:'melbourne', name:'South Yarra & Prahran', drive_time_hours:0.2, drive_km:4, lat:-37.840, lng:144.991, themes:['Shopping','Food','Bars','Fashion'], highlights:['Chapel Street — fashion, dining, and nightlife','Hawksburn Village and local deli scene','Greville Street boutiques and record stores','The Prahran Market (fresh produce, gourmet food)'], display_order:4 },
  { id:'carlton', cluster_id:'melbourne', name:'Carlton & Lygon Street', drive_time_hours:0.2, drive_km:2, lat:-37.801, lng:144.968, themes:['Food','History','Culture','Gardens'], highlights:['Lygon Street — Melbourne\'s Italian precinct','Royal Exhibition Building (UNESCO World Heritage)','Melbourne Museum and Bunjilaka Cultural Centre','Royal Botanic Gardens (free, extraordinary)'], display_order:5 },
  { id:'southbank', cluster_id:'melbourne', name:'Southbank & Docklands', drive_time_hours:0.1, drive_km:1, lat:-37.824, lng:144.960, themes:['Arts','Food','Waterfront','Entertainment'], highlights:['Arts Centre Melbourne — concerts, theatre, ballet','Crown precinct — restaurants and entertainment','Southbank promenade and Yarra riverside dining','Melbourne Star observation wheel (Docklands)'], display_order:6 },
  { id:'richmond', cluster_id:'melbourne', name:'Richmond & Cremorne', drive_time_hours:0.2, drive_km:4, lat:-37.823, lng:144.999, themes:['Food','Sport','Culture'], highlights:['Bridge Road antiques and fashion','Victoria Street — Melbourne\'s Vietnamese precinct','MCG and Melbourne Park (tennis, AFL)','Swan Street restaurants and wine bars'], display_order:7 },
  { id:'williamstown', cluster_id:'melbourne', name:'Williamstown', drive_time_hours:0.5, drive_km:14, lat:-37.861, lng:144.896, themes:['Heritage','Waterfront','Food','Walking'], highlights:['Historic maritime precinct and heritage streetscape','Williamstown Beach and foreshore walk','Nelson Place restaurants and cafes with bay views','HMAS Castlemaine — WWII naval museum ship'], display_order:8 },
  { id:'brunswick', cluster_id:'melbourne', name:'Brunswick & Coburg', drive_time_hours:0.3, drive_km:6, lat:-37.769, lng:144.961, themes:['Cafes','Music','Art','Food'], highlights:['Sydney Road — multicultural food and music strip','Brunswick Mechanics Institute and local art spaces','Coburg Lake Reserve and Coburg Market','Best Lebanese, Ethiopian, and Turkish food in Melbourne'], display_order:9 },

  // Geelong
  { id:'geelong-waterfront', cluster_id:'geelong', name:'Geelong CBD & Waterfront', drive_time_hours:1.1, drive_km:75, lat:-38.148, lng:144.361, themes:['Art','Food','Waterfront','History'], highlights:['Geelong Art Gallery — major regional collection','Geelong waterfront carousel and boardwalk','Little Malop Street food and bar precinct','National Wool Museum in the heritage Wool Store'], display_order:1 },
  { id:'geelong-newtown', cluster_id:'geelong', name:'Newtown & Pakington Street', drive_time_hours:1.1, drive_km:77, lat:-38.141, lng:144.346, themes:['Cafes','Shopping','Relaxation'], highlights:['Pakington Street — Geelong\'s best cafes and boutiques','Geelong Botanic Gardens (free, beautiful)','Local wine bars and craft beer spots','Tree-lined heritage streetscape'], display_order:2 },
  { id:'bellarine-peninsula', cluster_id:'geelong', name:'Bellarine Peninsula', drive_time_hours:1.3, drive_km:95, lat:-38.200, lng:144.500, themes:['Wine','Beach','Food','Scenic'], highlights:['Oakdene and Scotchman\'s Hill wineries','Ocean Grove and Barwon Heads beaches','Queenscliff maritime town and ferry terminal','Jack Rabbit Vineyard panoramic views'], display_order:3 },

  // Shepparton
  { id:'shepparton-cbd', cluster_id:'shepparton', name:'Shepparton', drive_time_hours:2.2, drive_km:185, lat:-36.383, lng:145.399, themes:['Art','Food','Nature','History'], highlights:['Shepparton Art Museum (SAM) — extraordinary regional gallery','Lake Victoria and the Goulburn River walk','Murray to Mountains Rail Trail starting point','Stone fruit orchards and pick-your-own (Dec–Feb)'], display_order:1 },
  { id:'nagambie', cluster_id:'shepparton', name:'Nagambie & Tahbilk', drive_time_hours:2.0, drive_km:160, lat:-36.788, lng:145.153, themes:['Wine','Nature','History'], highlights:['Tahbilk Winery — one of Australia\'s oldest (1860)','Lake Nagambie water sports and boat hire','Mitchelton Wines and art gallery','Goulburn River paddle and kayak tours'], display_order:2 },

  // Wodonga
  { id:'albury-wodonga', cluster_id:'wodonga', name:'Albury–Wodonga', drive_time_hours:3.2, drive_km:305, lat:-36.121, lng:146.916, themes:['Food','Cycling','History','Nature'], highlights:['Murray River Precinct — swimming, cycling, cafes','Albury LibraryMuseum and Monument Hill','Hume and Hovell Track (world-class hiking)','Ettamogah Pub and Wodonga arts precinct'], display_order:1 },
  { id:'mount-beauty', cluster_id:'wodonga', name:'Mount Beauty & Falls Creek', drive_time_hours:4.0, drive_km:380, lat:-36.748, lng:147.175, themes:['Skiing','Cycling','Nature','Village'], highlights:['Falls Creek ski resort (winter)','Kiewa Valley Highway — one of Victoria\'s great scenic drives','Mount Beauty township — good food and craft beer','Alpine cycling — Murray to Mountains and rail trails'], display_order:2 },
]

// ── Activities (core set from existing database) ───────────────────
// Pulled from victorianActivities.ts — abbreviated here for seed; full data in the static file until migration complete

const ACTIVITIES = [
  // Healesville
  { id:'hv-sanctuary', sub_dest_id:'healesville', name:'Healesville Sanctuary', category:'wildlife', emoji:'🦘', description:'Walk among native Australian animals — platypus, dingoes, Tasmanian devils, and wedge-tailed eagles in a bushland setting.', duration:'2–3 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Healesville+Sanctuary+Victoria', tags:['wildlife','family','iconic'] },
  { id:'hv-coombe', sub_dest_id:'healesville', name:'Coombe Estate Winery', category:'drink', emoji:'🍷', description:"The historic estate of Dame Nellie Melba, now a stunning winery with cellar door, restaurant, and rose gardens.", duration:'2 hrs', cost:'$$', kids_ok:false, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Coombe+Estate+Healesville', tags:['wine','history','food'] },
  { id:'hv-badger', sub_dest_id:'healesville', name:'Badger Weir Picnic Ground', category:'nature', emoji:'🌿', description:'Walk through mountain ash and tree fern gullies on the Rainforest Gallery trail — one of the most accessible rainforest walks in Victoria.', duration:'1–2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Badger+Weir+Picnic+Ground', tags:['walking','nature','rainforest'] },
  { id:'hv-fourchapel', sub_dest_id:'healesville', name:'Four Pillars Gin Distillery', category:'drink', emoji:'🍸', description:"Australia's most awarded gin distillery — free tours on weekends, fabulous cocktails, and a food menu that actually earns its place.", duration:'1.5 hrs', cost:'$$', kids_ok:false, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Four+Pillars+Gin+Healesville', tags:['gin','food','craft'] },
  { id:'hv-maroondah', sub_dest_id:'healesville', name:'Maroondah Reservoir Park', category:'nature', emoji:'🌳', description:'Peaceful walk around the historic reservoir through cool-temperate rainforest. Tall mountain ash, tree ferns, and silence.', duration:'1–1.5 hrs', cost:'free', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Maroondah+Reservoir+Park', tags:['walking','nature','hidden'] },

  // Yarra Glen
  { id:'yg-tarrawarra', sub_dest_id:'yarra-glen', name:'Tarrawarra Museum of Art', category:'art', emoji:'🎨', description:'Serious contemporary Australian art in a stunning building set among vineyards. World-class for a regional gallery.', duration:'1.5 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Tarrawarra+Museum+of+Art', tags:['art','culture','architecture'] },
  { id:'yg-gulfstation', sub_dest_id:'yarra-glen', name:'Gulf Station Historic Farm', category:'history', emoji:'🏛️', description:"A National Trust-listed 1850s farming property — genuine working farm of the era, not a replica. Kids love the animals.", duration:'2 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Gulf+Station+Yarra+Glen', tags:['history','family','farm'] },
  { id:'yg-giantsteps', sub_dest_id:'yarra-glen', name:'Giant Steps & Innocent Bystander', category:'drink', emoji:'🍷', description:'One winery, two labels, great food. Giant Steps makes some of the best single-vineyard Pinot in the valley. Walk-in friendly.', duration:'2 hrs', cost:'$$', kids_ok:false, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Giant+Steps+Winery+Healesville', tags:['wine','food','pinot'] },

  // Warburton
  { id:'wb-aqueduct', sub_dest_id:'warburton', name:"O'Shannassy Aqueduct Trail", category:'active', emoji:'🚵', description:'A flat, scenic trail along the historic aqueduct through tall mountain ash forest. Excellent for cycling families or easy walks.', duration:'1–4 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:"https://maps.google.com/?q=O'Shannassy+Aqueduct+Trail+Warburton", tags:['cycling','walking','nature'] },
  { id:'wb-adatree', sub_dest_id:'warburton', name:'Ada Tree', category:'nature', emoji:'🌳', description:"A 300-year-old mountain ash standing 76 metres tall — one of Victoria's largest trees. Short walk through fern gully.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Ada+Tree+Warburton', tags:['nature','walking','hidden'] },

  // Marysville
  { id:'ms-steavenson', sub_dest_id:'marysville', name:'Steavenson Falls', category:'nature', emoji:'💧', description:"Victoria's highest accessible waterfall (84m) — lit up at night, spectacular in winter. Easy 30-min walk from the township.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Steavenson+Falls+Marysville', tags:['waterfall','walking','night'] },
  { id:'ms-lakemtn', sub_dest_id:'marysville', name:'Lake Mountain Alpine Resort', category:'active', emoji:'⛷️', description:"Victoria's closest snow resort to Melbourne — cross-country skiing, tobogganing, and snowshoe walks in winter. Hiking in summer.", duration:'Half day', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Lake+Mountain+Alpine+Resort', tags:['snow','skiing','family'] },
  { id:'ms-brunos', sub_dest_id:'marysville', name:"Bruno's Art & Sculpture Garden", category:'art', emoji:'🗿', description:'Eccentric and enchanting outdoor sculpture garden created by a local artist — 140+ works among the forest. Unmissable.', duration:'1.5 hrs', cost:'$', kids_ok:true, is_hidden_gem:true, maps_url:"https://maps.google.com/?q=Bruno's+Art+Sculpture+Garden+Marysville", tags:['art','sculpture','garden'] },

  // Belgrave / Puffing Billy
  { id:'bg-puffingbilly', sub_dest_id:'belgrave', name:'Puffing Billy Steam Railway', category:'family', emoji:'🚂', description:'The iconic narrow-gauge steam train winding through the Dandenong Ranges to Gembrook. Classic Victorian bucket-list experience.', duration:'Half day', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Puffing+Billy+Railway+Belgrave', tags:['family','train','iconic'] },
  { id:'bg-sherbrooke', sub_dest_id:'belgrave', name:'Sherbrooke Forest Walk', category:'nature', emoji:'🌿', description:'Tall mountain ash and lyrebird territory — one of the best places in Victoria to hear lyrebirds calling. Early morning is magical.', duration:'1–2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Sherbrooke+Forest+Belgrave', tags:['walking','wildlife','forest'] },
  { id:'bg-grants', sub_dest_id:'belgrave', name:'Grants Picnic Ground', category:'wildlife', emoji:'🦜', description:'Wild king parrots and crimson rosellas eat from your hands here. Cockatoos, gang-gangs — spectacular birdlife right up close.', duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Grants+Picnic+Ground+Dandenong+Ranges', tags:['wildlife','family','birds'] },

  // Sassafras & Olinda
  { id:'so-missmarple', sub_dest_id:'sassafras-olinda', name:"Miss Marple's Tearoom", category:'food', emoji:'☕', description:'Famous Devonshire teas in a genuine vintage tearoom. Long queues on weekends for good reason — the scones are genuinely excellent.', duration:'1 hr', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:"https://maps.google.com/?q=Miss+Marple's+Tearoom+Sassafras", tags:['cafe','devonshire','iconic'] },
  { id:'so-cloudehill', sub_dest_id:'sassafras-olinda', name:'Cloudehill Gardens', category:'nature', emoji:'🌸', description:'Formal and informal gardens with exceptional plantings across several distinct garden rooms — peak in spring and autumn.', duration:'1.5 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Cloudehill+Gardens+Olinda', tags:['garden','nature','seasonal'] },
  { id:'so-rhododendron', sub_dest_id:'sassafras-olinda', name:'National Rhododendron Garden', category:'nature', emoji:'🌺', description:'100 hectares of established rhododendrons and azaleas at their spectacular best in October. Free entry most of the year.', duration:'1.5 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=National+Rhododendron+Garden+Olinda', tags:['garden','spring','flowers'] },

  // Mornington town
  { id:'mt-mills', sub_dest_id:'mornington-town', name:'Mills Beach & Main Street', category:'relaxation', emoji:'🏖️', description:'Colourful bathing boxes, calm bay water, and a genuinely good cafe strip. Great starting point for the Peninsula.', duration:'2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Mills+Beach+Mornington', tags:['beach','cafe','relaxation'] },
  { id:'mt-arthursseat', sub_dest_id:'mornington-town', name:"Arthur's Seat Eagle Gondola", category:'viewpoint', emoji:'🌄', description:'Gondola ride over vineyards and Westernport Bay from the top of the Ranges — panoramic views of both bays on a clear day.', duration:'1.5 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:"https://maps.google.com/?q=Arthur's+Seat+Eagle+Mornington+Peninsula", tags:['views','gondola','scenic'] },

  // Red Hill
  { id:'rh-tenmins', sub_dest_id:'red-hill', name:'Ten Minutes by Tractor Winery', category:'drink', emoji:'🍷', description:'Three distinct vineyards, each within ten minutes of each other by tractor — tasting menus that rival Melbourne fine dining.', duration:'2–3 hrs', cost:'$$$', kids_ok:false, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Ten+Minutes+by+Tractor+Red+Hill', tags:['wine','finedining','pinot'] },
  { id:'rh-brewery', sub_dest_id:'red-hill', name:'Red Hill Brewery', category:'drink', emoji:'🍺', description:'Craft brewery in a converted dairy farm. Great views over the Peninsula, seasonal releases, and simple but good food.', duration:'1.5 hrs', cost:'$$', kids_ok:false, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Red+Hill+Brewery', tags:['craft beer','scenic','casual'] },
  { id:'rh-cheese', sub_dest_id:'red-hill', name:'Red Hill Cheese', category:'food', emoji:'🧀', description:"Award-winning farmhouse cheeses made on-site. Try the Portsea Brie and the aged cheddar — some of Victoria's best.", duration:'45 min', cost:'$$', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Red+Hill+Cheese', tags:['cheese','local','hidden'] },

  // Sorrento
  { id:'sr-backbeach', sub_dest_id:'sorrento', name:'Back Beach & Rock Pools', category:'nature', emoji:'🌊', description:"Ocean-facing beach with dramatic rock shelves and surf. Very different from the calm bay side — one of Victoria's most beautiful beaches.", duration:'2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Sorrento+Back+Beach', tags:['beach','rock pools','ocean'] },
  { id:'sr-dolphin', sub_dest_id:'sorrento', name:'Dolphin & Seal Cruises', category:'wildlife', emoji:'🐬', description:'Swim with wild dolphins in Port Phillip Bay — operators depart from Sorrento Pier. Fur seals on the rocks near the Heads.', duration:'3 hrs', cost:'$$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Sorrento+Pier+Dolphin+Cruise', tags:['wildlife','ocean','swimming'] },

  // Peninsula Hot Springs
  { id:'phs-pools', sub_dest_id:'peninsula-hot-springs', name:'Geothermal Bathing Pools', category:'relaxation', emoji:'♨️', description:"Open-air mineral pools ranging from cool to very hot, including a cave pool and hilltop pool overlooking Bass Strait. Book ahead — Victoria's most popular spa destination.", duration:'3–4 hrs', cost:'$$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Peninsula+Hot+Springs', tags:['spa','wellness','relaxation'] },

  // Macedon & Woodend
  { id:'mac-hangingrock', sub_dest_id:'macedon', name:'Hanging Rock Reserve', category:'nature', emoji:'🪨', description:"The volcanic mamelon from Picnic at Hanging Rock — walk to the summit through extraordinary geology. Best in morning light.", duration:'1.5 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Hanging+Rock+Reserve+Woodend', tags:['nature','walking','iconic','history'] },
  { id:'mac-holgatebrewery', sub_dest_id:'macedon', name:'Holgate Brewhouse', category:'drink', emoji:'🍺', description:"Woodend's award-winning craft brewery — relaxed pub setting, excellent seasonal ales, and simple counter meals.", duration:'1.5 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Holgate+Brewhouse+Woodend', tags:['craft beer','pub','casual'] },

  // Daylesford
  { id:'df-convent', sub_dest_id:'daylesford-town', name:'The Convent Gallery', category:'art', emoji:'🏛️', description:"A magnificent 1860s former convent transformed into a multi-level art gallery, museum, and restaurant. The gardens alone are worth the visit.", duration:'2 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Convent+Gallery+Daylesford', tags:['art','history','garden'] },
  { id:'df-lake', sub_dest_id:'daylesford-town', name:'Lake Daylesford Walk', category:'nature', emoji:'🌊', description:'Easy 3km lake circuit through bushland — good birdwatching, and the boathouse at the far end has excellent food.', duration:'1.5 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Lake+Daylesford', tags:['walking','nature','lake'] },
  { id:'df-wombathill', sub_dest_id:'daylesford-town', name:'Wombat Hill Botanic Gardens', category:'nature', emoji:'🌿', description:'Hillside gardens built on an extinct volcano with panoramic views. Towering conifers, heritage plantings, and a genuine sense of peace.', duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Wombat+Hill+Botanic+Gardens+Daylesford', tags:['garden','views','nature'] },

  // Hepburn Springs
  { id:'hs-bathhouse', sub_dest_id:'hepburn-springs', name:'Hepburn Bathhouse & Spa', category:'relaxation', emoji:'🛁', description:"Drawing from natural mineral springs since 1895 — the original pools are still there, now complemented by modern wellness facilities. Book well ahead.", duration:'2–4 hrs', cost:'$$$', kids_ok:false, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Hepburn+Bathhouse+and+Spa', tags:['spa','wellness','historic'] },
  { id:'hs-springs', sub_dest_id:'hepburn-springs', name:'Mineral Springs Reserve', category:'nature', emoji:'💧', description:'Dozens of individual springs you can taste for free along a bush walk — each with distinct mineral content. Take a bottle.', duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Hepburn+Mineral+Springs+Reserve', tags:['nature','wellness','free'] },

  // Phillip Island — Cowes
  { id:'pi-koala', sub_dest_id:'cowes', name:'Koala Conservation Reserve', category:'wildlife', emoji:'🐨', description:'Walk elevated boardwalks through natural habitat with koalas at eye level — no cages, genuinely wild. The best way to see koalas outside a zoo.', duration:'1.5 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Koala+Conservation+Reserve+Phillip+Island', tags:['wildlife','koalas','family'] },
  { id:'pi-beach', sub_dest_id:'cowes', name:'Cowes Beach', category:'relaxation', emoji:'🏖️', description:'Calm, protected bay beach — good for swimming, stand-up paddleboarding, and the annual penguin swim.', duration:'2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Cowes+Beach+Phillip+Island', tags:['beach','swimming','family'] },

  // Penguin Parade
  { id:'pp-penguins', sub_dest_id:'penguin-parade', name:'Little Penguin Parade', category:'wildlife', emoji:'🐧', description:"Every night at dusk, hundreds of little penguins waddle from the ocean to their burrows. One of Victoria's most iconic wildlife experiences.", duration:'2 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Penguin+Parade+Phillip+Island', tags:['wildlife','penguins','iconic','evening'] },
  { id:'pp-nobbies', sub_dest_id:'penguin-parade', name:'The Nobbies & Seal Rocks', category:'wildlife', emoji:'🦭', description:"Dramatic coastal boardwalk with views of Australia's largest fur seal colony on Seal Rocks. Spectacular in rough weather.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=The+Nobbies+Phillip+Island', tags:['wildlife','coastal','views'] },

  // Torquay
  { id:'tq-bellsbeach', sub_dest_id:'torquay', name:'Bells Beach', category:'viewpoint', emoji:'🏄', description:"World's longest-running surfing competition site. Dramatic cliffs, powerful ocean, and extraordinary for watching pro surfers.Even non-surfers love it.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Bells+Beach+Torquay', tags:['surf','views','iconic'] },
  { id:'tq-surfworld', sub_dest_id:'torquay', name:'Surf World Museum', category:'history', emoji:'🏄', description:"Australia's largest surfing museum — the history of Australian surf culture, boards, and legends. Free for kids.", duration:'1 hr', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Surf+World+Museum+Torquay', tags:['history','surf','museum'] },

  // Anglesea
  { id:'ag-kangaroos', sub_dest_id:'anglesea', name:'Anglesea Golf Course Kangaroos', category:'wildlife', emoji:'🦘', description:"Hundreds of wild eastern grey kangaroos live permanently on the fairways — a surreal and completely free wildlife experience. Bring your camera.", duration:'45 min', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Anglesea+Golf+Club+Kangaroos', tags:['wildlife','free','kangaroos','iconic'] },
  { id:'ag-roadknight', sub_dest_id:'anglesea', name:'Point Roadknight Beach', category:'relaxation', emoji:'🏖️', description:'Protected cove beach with calm, clear water — ideal for kids. The cafes behind the dunes are actually good.', duration:'2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Point+Roadknight+Beach+Anglesea', tags:['beach','family','swimming'] },

  // Aireys Inlet
  { id:'ai-lighthouse', sub_dest_id:'aireys-inlet', name:'Split Point Lighthouse', category:'viewpoint', emoji:'🗼', description:"The 1891 lighthouse from the Round the Twist TV series — white tower on the cliff above crashing surf. Guided tours available.", duration:'1 hr', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Split+Point+Lighthouse+Aireys+Inlet', tags:['lighthouse','views','history','iconic'] },

  // Lorne
  { id:'lo-erskine', sub_dest_id:'lorne', name:'Erskine Falls', category:'nature', emoji:'💧', description:"30-minute return walk to a beautiful 30-metre waterfall through tree ferns. One of GOR's most accessible and rewarding walks.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Erskine+Falls+Lorne', tags:['waterfall','walking','nature'] },
  { id:'lo-beach', sub_dest_id:'lorne', name:'Lorne Beach & Pier', category:'relaxation', emoji:'🏖️', description:'The classic Great Ocean Road beach town — good surf, great cafes on the main strip, and a protected beach for swimming.', duration:'2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Lorne+Beach', tags:['beach','cafe','relaxation'] },

  // Kennett River
  { id:'kr-koalas', sub_dest_id:'kennett-river', name:'Wild Koalas on Grey River Road', category:'wildlife', emoji:'🐨', description:"Pull over on Grey River Road — koalas everywhere in the roadside gum trees. One of the most reliable wild koala sightings in Victoria.", duration:'45 min', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Grey+River+Road+Kennett+River', tags:['wildlife','koalas','free','roadside'] },

  // Apollo Bay
  { id:'ab-market', sub_dest_id:'apollo-bay', name:'Apollo Bay Farmers Market', category:'markets', emoji:'🛒', description:'Saturday morning market on the foreshore — fresh produce, local seafood, woodfired bread, and live music. The best reason to arrive Friday night.', duration:'1.5 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Apollo+Bay+Farmers+Market', tags:['market','food','local','weekend'] },
  { id:'ab-mariners', sub_dest_id:'apollo-bay', name:"Mariners Lookout", category:'viewpoint', emoji:'🌄', description:'45-minute return walk above the town with views of the coastline in both directions — the best free view on the Great Ocean Road.', duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Mariners+Lookout+Apollo+Bay', tags:['views','walking','free'] },

  // Great Otway
  { id:'go-otwaylighthouse', sub_dest_id:'great-otway', name:'Cape Otway Lightstation', category:'history', emoji:'🗼', description:"Australia's oldest surviving mainland lighthouse (1848). Koalas in the trees on the access road — often dozens visible.", duration:'2 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Cape+Otway+Lightstation', tags:['lighthouse','history','wildlife'] },
  { id:'go-triplet', sub_dest_id:'great-otway', name:'Triplet Falls', category:'nature', emoji:'💧', description:'Walk through ancient temperate rainforest to three tiers of waterfalls — one of the most beautiful short walks in Victoria.', duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Triplet+Falls+Otways', tags:['waterfall','rainforest','walking'] },

  // 12 Apostles
  { id:'ta-apostles', sub_dest_id:'twelve-apostles', name:'Twelve Apostles', category:'viewpoint', emoji:'🪨', description:"Victoria's most iconic landmark — golden limestone stacks rising from the Southern Ocean. Dawn and golden hour are when the light is extraordinary.", duration:'1–2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Twelve+Apostles+Victoria', tags:['iconic','views','photography','coastal'] },
  { id:'ta-lochard', sub_dest_id:'twelve-apostles', name:'Loch Ard Gorge', category:'history', emoji:'⛵', description:"Dramatic gorge where two survivors of the 1878 Loch Ard shipwreck came ashore. Walk to the beach through the gorge — extraordinary scenery.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Loch+Ard+Gorge+Port+Campbell', tags:['history','coastal','walking','photography'] },

  // Warrnambool
  { id:'wb-logansbeach', sub_dest_id:'warrnambool', name:"Logans Beach Whale Nursery", category:'wildlife', emoji:'🐋', description:"Southern right whales calve here from June to September — viewing platform right on the cliff above them. Victoria's best free wildlife experience.", duration:'1–2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:"https://maps.google.com/?q=Logan's+Beach+Whale+Nursery+Warrnambool", tags:['wildlife','whales','seasonal','free'] },
  { id:'wb-flagstaff', sub_dest_id:'warrnambool', name:'Flagstaff Hill Maritime Village', category:'history', emoji:'⚓', description:'Recreated 1870s port village with a superb sound-and-light show telling the story of the Loch Ard shipwreck. Genuinely impressive.', duration:'2–3 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Flagstaff+Hill+Warrnambool', tags:['history','maritime','family'] },
  { id:'wb-towerhill', sub_dest_id:'warrnambool', name:'Tower Hill Wildlife Reserve', category:'wildlife', emoji:'🦘', description:"An ancient volcanic crater full of emus, koalas, and kangaroos — genuinely wild and entirely free. One of Victoria's best wildlife drives.", duration:'2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Tower+Hill+Wildlife+Reserve', tags:['wildlife','volcanic','free','emus'] },

  // Halls Gap
  { id:'hg-kangaroos', sub_dest_id:'halls-gap', name:'Kangaroos at Dusk', category:'wildlife', emoji:'🦘', description:'At dusk, dozens of kangaroos graze the oval in the township. Bring a drink from the pub and watch.', duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Halls+Gap+Victoria', tags:['wildlife','free','kangaroos','evening'] },
  { id:'hg-silverband', sub_dest_id:'halls-gap', name:'Silverband Falls Walk', category:'nature', emoji:'💧', description:'Easy 30-minute return walk through ferns to a beautiful tiered waterfall — good all-year option and accessible for most fitness levels.', duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Silverband+Falls+Grampians', tags:['waterfall','walking','easy'] },
  { id:'hg-pinnacle', sub_dest_id:'boroka-pinnacle', name:'The Pinnacle Hike', category:'active', emoji:'🥾', description:'Moderate 2-hour return hike to a sandstone summit with sweeping views across the Grampians ranges. Worth every step.', duration:'2 hrs', cost:'free', kids_ok:false, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=The+Pinnacle+Grampians', tags:['hiking','views','moderate'] },
  { id:'hg-boroka', sub_dest_id:'boroka-pinnacle', name:'Boroka Lookout', category:'viewpoint', emoji:'🌄', description:"Drive to Victoria's best panoramic lookout — the entire Grampians spread before you, with Halls Gap below and the valley beyond.", duration:'45 min', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Boroka+Lookout+Grampians', tags:['views','lookout','drive'] },

  // Beechworth
  { id:'bw-honey', sub_dest_id:'beechworth', name:'Beechworth Honey Experience', category:'food', emoji:'🍯', description:"Interactive museum and tasting experience at Australia's most awarded honey producer. Free entry, fascinating for kids and adults alike.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Beechworth+Honey', tags:['food','museum','free','family'] },
  { id:'bw-bridgeroad', sub_dest_id:'beechworth', name:'Bridge Road Brewers', category:'drink', emoji:'🍺', description:"Award-winning craft brewery in a converted 1860s carriage factory — some of Australia's best ales and a good kitchen.", duration:'2 hrs', cost:'$$', kids_ok:false, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Bridge+Road+Brewers+Beechworth', tags:['craft beer','heritage','food'] },
  { id:'bw-courthouse', sub_dest_id:'beechworth', name:'Beechworth Historic Precinct', category:'history', emoji:'🏛️', description:"Ned Kelly stood trial here. The intact granite courthouse, gaol, and bank buildings make Beechworth one of Victoria's finest goldfield towns.", duration:'1.5 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Beechworth+Historic+Precinct', tags:['history','goldfields','heritage'] },

  // Bright
  { id:'br-ovens', sub_dest_id:'bright-town', name:'Ovens River Walk', category:'nature', emoji:'🍂', description:"The river walk through Bright's European trees peaks in May — Japanese maples, elms, and poplars turning red and gold. Victoria's best autumn colour.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Ovens+River+Bright', tags:['autumn','walking','nature','seasonal'] },
  { id:'br-canyon', sub_dest_id:'bright-town', name:'Canyon Brewery & Eatery', category:'drink', emoji:'🍺', description:"Craft brewery with a riverside setting and a menu that earns its own trip. The alpine lager is particularly good.", duration:'2 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Canyon+Brewery+Bright', tags:['craft beer','food','riverside'] },

  // Echuca
  { id:'ec-portwharf', sub_dest_id:'echuca', name:'Port of Echuca Historic Wharf', category:'history', emoji:'⛵', description:"Australia's largest intact Victorian-era river port — three levels of red gum wharf, working paddle steamers, and pubs that have been open since the gold rush.", duration:'2 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Port+of+Echuca+Historic+Wharf', tags:['history','heritage','river'] },
  { id:'ec-steamers', sub_dest_id:'echuca', name:'Paddle Steamer Cruise', category:'active', emoji:'⛵', description:'Board a genuine 1860s paddle steamer for a 1-hour Murray River cruise — the PS Adelaide is the oldest operating paddle steamer in the world.', duration:'1 hr', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Echuca+Paddle+Steamer', tags:['river','heritage','family','cruise'] },

  // Sovereign Hill
  { id:'sh-goldpanning', sub_dest_id:'sovereign-hill', name:'Pan for Gold', category:'family', emoji:'✨', description:'Swirl a pan in the stream and actually find gold — the thrill is real even if the yield is small. Kids absolutely love this.', duration:'45 min', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Sovereign+Hill+Ballarat', tags:['family','gold','interactive','history'] },
  { id:'sh-mine', sub_dest_id:'sovereign-hill', name:'Underground Mine Tour', category:'history', emoji:'⛏️', description:"Descend into a recreated 1850s underground mine — authentic working conditions, candle light, the works. Genuinely impressive.", duration:'1 hr', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Sovereign+Hill+Mine+Tour', tags:['history','underground','family'] },

  // Ballarat
  { id:'bt-artgallery', sub_dest_id:'ballarat-town', name:'Art Gallery of Ballarat', category:'art', emoji:'🎨', description:"Australia's oldest and largest regional art gallery — major national collections and surprising contemporary work. Free entry.", duration:'1.5 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Art+Gallery+of+Ballarat', tags:['art','free','gallery'] },
  { id:'bt-lydiard', sub_dest_id:'ballarat-town', name:'Lydiard Street Heritage Walk', category:'history', emoji:'🏛️', description:"Victoria's finest gold rush streetscape — banks, hotels, theatres, and civic buildings from the 1850s-1870s standing intact.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Lydiard+Street+Ballarat', tags:['history','architecture','walking'] },

  // Bendigo
  { id:'bg-artgallery', sub_dest_id:'bendigo-town', name:'Bendigo Art Gallery', category:'art', emoji:'🎨', description:"Regularly hosts major international travelling exhibitions that Melbourne galleries don't get. Genuinely world-class for a regional city.", duration:'2 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Bendigo+Art+Gallery', tags:['art','gallery','international'] },
  { id:'bg-goldmine', sub_dest_id:'bendigo-town', name:'Central Deborah Gold Mine', category:'history', emoji:'⛏️', description:'Descend 85m underground into a working 1940s gold mine — the most authentic underground mine experience in Victoria.', duration:'2 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Central+Deborah+Gold+Mine+Bendigo', tags:['history','underground','family'] },
  { id:'bg-goldendragon', sub_dest_id:'bendigo-town', name:'Golden Dragon Museum', category:'history', emoji:'🐉', description:"Home to the world's oldest Chinese processional dragon — Loong, from 1879. Extraordinary cultural history and a beautiful building.", duration:'1.5 hrs', cost:'$', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Golden+Dragon+Museum+Bendigo', tags:['history','chinese','culture','hidden'] },

  // Tidal River (Wilsons Prom)
  { id:'tr-squeaky', sub_dest_id:'tidal-river', name:'Squeaky Beach', category:'nature', emoji:'🏖️', description:"Pure white quartz sand that literally squeaks underfoot — one of Victoria's most beautiful and unusual beaches. Worth every step of the walk.", duration:'1.5 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Squeaky+Beach+Wilsons+Promontory', tags:['beach','nature','walking','free'] },
  { id:'tr-wombats', sub_dest_id:'tidal-river', name:'Wombats at Dusk', category:'wildlife', emoji:'🦔', description:"At dusk around the campsite, wild wombats graze fearlessly within a metre. Most visitors have never been this close to one.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Tidal+River+Wilsons+Promontory', tags:['wildlife','wombats','evening','free'] },

  // Bairnsdale / Paynesville
  { id:'bp-raymond', sub_dest_id:'bairnsdale', name:'Raymond Island Koala Walk', category:'wildlife', emoji:'🐨', description:'Free 5-minute ferry to an island where koalas outnumber people on most days. Walk the 3km trail and spot dozens in the trees.', duration:'2 hrs', cost:'free', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Raymond+Island+Koala+Walk', tags:['wildlife','koalas','free','ferry'] },

  // Metung
  { id:'mg-kayak', sub_dest_id:'metung', name:'Kayaking on Bancroft Bay', category:'active', emoji:'🚣', description:"Paddle the calm, clear waters of Bancroft Bay with views of Metung village — one of Victoria's most beautiful lake paddling routes.", duration:'2 hrs', cost:'$$', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Metung+Kayak+Hire', tags:['kayaking','lake','peaceful'] },

  // Inverloch
  { id:'il-flatrocks', sub_dest_id:'inverloch', name:'Flat Rocks Dinosaur Site', category:'history', emoji:'🦕', description:"World-class polar dinosaur fossil site — genuine fossils have been found here. The interpretive boards explain what was found and where.", duration:'1 hr', cost:'free', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Flat+Rocks+Inverloch+Dinosaur', tags:['history','fossil','walking','free'] },
  { id:'il-surf', sub_dest_id:'inverloch', name:'Inverloch Surf Beach', category:'relaxation', emoji:'🌊', description:'A proper surf beach with good consistent waves — safe for beginners on the right day, with a sheltered estuary for kids nearby.', duration:'2 hrs', cost:'free', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Inverloch+Surf+Beach', tags:['beach','surf','relaxation'] },

  // Wonthaggi
  { id:'wt-coalmine', sub_dest_id:'wonthaggi', name:'State Coal Mine Tour', category:'history', emoji:'⛏️', description:'Go underground into a genuine 1909 coal mine — excellent guided tours that give a real sense of the conditions miners worked in.', duration:'2 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=State+Coal+Mine+Wonthaggi', tags:['history','underground','family'] },

  // Walhalla
  { id:'wl-mine', sub_dest_id:'walhalla', name:'Long Tunnel Extended Mine', category:'history', emoji:'⛏️', description:"Underground tour into one of the richest gold mines of the 1860s — atmospheric, excellent guides, and the town itself barely exists above.", duration:'1 hr', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Long+Tunnel+Extended+Mine+Walhalla', tags:['history','underground','goldfields'] },
  { id:'wl-railway', sub_dest_id:'walhalla', name:'Walhalla Goldfields Railway', category:'family', emoji:'🚂', description:'Restored narrow-gauge steam train through the mountains — the gorge scenery is spectacular and the trip is short enough for kids.', duration:'1 hr', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Walhalla+Goldfields+Railway', tags:['family','train','heritage'] },

  // Kyneton
  { id:'ky-piperst', sub_dest_id:'kyneton', name:'Piper Street Food Precinct', category:'food', emoji:'🍽️', description:"One of regional Victoria's best eating streets — a converted heritage precinct with genuinely good restaurants, a brilliant deli, and local wine.", duration:'2 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Piper+Street+Kyneton', tags:['food','dining','heritage'] },

  // Rutherglen
  { id:'rg-fortified', sub_dest_id:'rutherglen', name:'Rutherglen Fortified Wine Cellars', category:'drink', emoji:'🍷', description:"Morris Wines and Chambers Rosewood produce muscat and tokay unlike anything else in Australia — 150 years of solera blending. Free tastings.", duration:'2 hrs', cost:'free', kids_ok:false, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Rutherglen+Wine+Region', tags:['wine','fortified','tasting','free'] },

  // Castlemaine
  { id:'cm-artmuseum', sub_dest_id:'castlemaine', name:'Castlemaine Art Museum', category:'art', emoji:'🎨', description:"Remarkable 1930s heritage building housing a quality permanent collection and strong temporary shows. One of the surprises of Central Victoria.", duration:'1.5 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Castlemaine+Art+Museum', tags:['art','heritage','gallery'] },
  { id:'cm-diggings', sub_dest_id:'castlemaine', name:'Castlemaine Diggings Heritage Park', category:'history', emoji:'⛏️', description:"The largest area of 1850s alluvial goldfields in Australia — untouched landscape with pockmarked terrain, shafts, and heritage interpretation.", duration:'2 hrs', cost:'free', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Castlemaine+Diggings+National+Heritage+Park', tags:['history','goldfields','walking','free'] },

  // Maldon
  { id:'ml-goldrailway', sub_dest_id:'maldon', name:'Victorian Goldfields Railway', category:'family', emoji:'🚂', description:'Weekend steam train between Maldon and Castlemaine through goldfields country — classic historic train experience.', duration:'2 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Victorian+Goldfields+Railway+Maldon', tags:['train','family','heritage'] },
  { id:'ml-tarrangower', sub_dest_id:'maldon', name:'Mount Tarrangower Lookout', category:'viewpoint', emoji:'🌄', description:'Short drive to a beautiful lookout tower over the Central Victorian countryside — the restored water tower at the summit.', duration:'45 min', cost:'free', kids_ok:true, is_hidden_gem:true, maps_url:'https://maps.google.com/?q=Mount+Tarrangower+Maldon', tags:['views','tower','free'] },

  // Mansfield
  { id:'mf-brewery', sub_dest_id:'mansfield-town', name:'Mansfield Brewery', category:'drink', emoji:'🍺', description:'Good craft beers in a relaxed setting — the High Country Lager is a perfect post-hike drink and the food is solid.', duration:'1.5 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Mansfield+Brewery', tags:['craft beer','food','highcountry'] },

  // Mount Buller
  { id:'mb-skiing', sub_dest_id:'mount-buller', name:'Skiing & Snowboarding', category:'active', emoji:'⛷️', description:"Victoria's most visited ski resort — 25 lifts, 180 hectares of terrain. Village at the summit means ski-in ski-out from most accommodation.", duration:'Full day', cost:'$$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Mount+Buller+Ski+Resort', tags:['skiing','snow','winter','resort'] },
  { id:'mb-summit', sub_dest_id:'mount-buller', name:'Summit Walk (Summer)', category:'viewpoint', emoji:'🌄', description:'Hike or take the chairlift to 1805m — views from the Alps to Port Phillip Bay on a clear day. Alpine wildflowers in December.', duration:'2 hrs', cost:'$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Mount+Buller+Summit', tags:['views','hiking','summer','alpine'] },

  // Lake Eildon
  { id:'le-houseboat', sub_dest_id:'lake-eildon', name:'Houseboat Hire', category:'relaxation', emoji:'⛵', description:"A genuine Victorian holiday institution — hire a houseboat for a night or a weekend on the vast lake. No boating licence required for most operators.", duration:'Overnight+', cost:'$$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Lake+Eildon+Houseboat+Hire', tags:['houseboat','lake','family','overnight'] },

  // Buchan
  { id:'bc-caves', sub_dest_id:'buchan', name:'Buchan Caves', category:'nature', emoji:'🦇', description:'Victoria\'s most spectacular limestone caves — guided tours daily through extraordinary formations. Bring a jumper (14°C underground).', duration:'1.5 hrs', cost:'$$', kids_ok:true, is_hidden_gem:false, maps_url:'https://maps.google.com/?q=Buchan+Caves', tags:['caves','nature','family','guided'] },
]

// ── Insert functions ────────────────────────────────────────────────
// Schema uses integer PKs (cluster_id, sub_dest_id) with slug as unique TEXT key.
// Seed data uses string `id` fields — we rename to `slug` and resolve FK slugs to integers.

async function seedClusters(): Promise<Map<string, number>> {
  console.log('Seeding clusters…')
  const rows = CLUSTERS.map(({ id, name, tagline, image_url, gradient_from, gradient_to, seasonal_scores, display_order }) => ({
    slug: id, name, tagline, image_url, gradient_from, gradient_to, seasonal_scores, display_order,
  }))
  const { error } = await supabase.from('clusters').upsert(rows, { onConflict: 'slug' })
  if (error) throw error

  const { data, error: fetchErr } = await supabase.from('clusters').select('cluster_id, slug')
  if (fetchErr) throw fetchErr

  const slugToId = new Map<string, number>()
  for (const row of data ?? []) slugToId.set(row.slug, row.cluster_id)
  console.log(`  ${CLUSTERS.length} clusters — slug map built (${slugToId.size} entries)`)
  return slugToId
}

async function seedSubDests(clusterSlugToId: Map<string, number>): Promise<Map<string, number>> {
  console.log('Seeding sub-destinations…')
  const rows = SUB_DESTINATIONS.map(({ id, cluster_id: clusterSlug, ...rest }) => {
    const cluster_id = clusterSlugToId.get(clusterSlug)
    if (!cluster_id) throw new Error(`Unknown cluster slug: ${clusterSlug}`)
    return { slug: id, cluster_id, ...rest }
  })
  const { error } = await supabase.from('sub_destinations').upsert(rows, { onConflict: 'slug' })
  if (error) throw error

  const { data, error: fetchErr } = await supabase.from('sub_destinations').select('sub_dest_id, slug')
  if (fetchErr) throw fetchErr

  const slugToId = new Map<string, number>()
  for (const row of data ?? []) slugToId.set(row.slug, row.sub_dest_id)
  console.log(`  ${SUB_DESTINATIONS.length} sub-destinations — slug map built (${slugToId.size} entries)`)
  return slugToId
}

async function seedActivities(subDestSlugToId: Map<string, number>) {
  console.log('Seeding activities…')
  const rows = ACTIVITIES.map(({ id, sub_dest_id: subDestSlug, ...rest }) => {
    const sub_dest_id = subDestSlugToId.get(subDestSlug)
    if (!sub_dest_id) throw new Error(`Unknown sub_dest slug: ${subDestSlug} (activity: ${id})`)
    return { slug: id, sub_dest_id, ...rest }
  })
  const { error } = await supabase.from('activities').upsert(rows, { onConflict: 'slug' })
  if (error) throw error
  console.log(`  ${ACTIVITIES.length} activities inserted`)
}

async function main() {
  console.log('Starting seed…')
  const clusterMap = await seedClusters()
  const subDestMap = await seedSubDests(clusterMap)
  await seedActivities(subDestMap)
  console.log('Seed complete')
}

main().catch((e) => { console.error(e); process.exit(1) })
