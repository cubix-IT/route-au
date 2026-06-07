import type { Coordinate } from '@/types'
import type { Season } from '@/utils/season'

export interface SubDest {
  id: string
  name: string
  driveTimeHours: number  // from Melbourne CBD
  driveKm: number
  highlights: string[]    // 3–5 specific things it's known for
  themes: string[]
  seasonalThemes?: Partial<Record<Season, string[]>>  // overrides themes for specific seasons
  coord: Coordinate
  imageUrl?: string       // optional override; falls back to cluster imageUrl
  nearbyIds?: string[]    // IDs of nearby sub-dests worth suggesting as add-ons
}

export interface VicCluster {
  id: string
  name: string
  tagline: string
  driveTimeRange: string
  themes: string[]
  seasonalScores: Record<Season, number>
  image: string
  imageUrl: string
  gradientFrom: string
  gradientTo: string
  subDests: SubDest[]
}

export const VICTORIAN_CLUSTERS: VicCluster[] = [
  // ── 1. Yarra Valley ──────────────────────────────────────────────
  {
    id: 'yarra-valley',
    name: 'Yarra Valley',
    tagline: 'World-class wine, misty vineyards, and brunch worth the drive.',
    driveTimeRange: '45 min – 1.5 hrs',
    themes: ['Wine', 'Food', 'Scenic drives', 'Day trip'],
    seasonalScores: { summer: 7, autumn: 10, winter: 7, spring: 8 },
    image: '🍷',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&q=80',
    gradientFrom: '#4a1c40',
    gradientTo: '#7c3a28',
    subDests: [
      {
        id: 'yarra-glen',
        name: 'Yarra Glen',
        driveTimeHours: 0.75,
        driveKm: 50,
        highlights: ['Gulf Station Historic Farm', 'Tarrawarra Museum of Art', 'Giant Steps & Innocent Bystander', 'Cellar doors lining Melba Hwy'],
        themes: ['Dining', 'Winery', 'Brewery'],
        coord: { lng: 145.383, lat: -37.655 },
        nearbyIds: ['healesville', 'marysville'],
      },
      {
        id: 'healesville',
        name: 'Healesville',
        driveTimeHours: 1.0,
        driveKm: 65,
        highlights: ['Healesville Sanctuary — platypus, echidnas, Tasmanian devils', 'Coombe Estate winery lunch', 'Badger Weir rainforest walk', 'Cafes on Don Road'],
        themes: ['Nature', 'History', 'Winery'],
        coord: { lng: 145.520, lat: -37.654 },
        nearbyIds: ['yarra-glen', 'warburton'],
      },
      {
        id: 'marysville',
        name: 'Marysville',
        driveTimeHours: 1.3,
        driveKm: 90,
        highlights: ['Steavenson Falls — Victoria\'s highest accessible waterfall (lit at night)', 'Lake Mountain snow (Jul–Sep, closest alpine resort to Melbourne)', 'Bruno\'s Art & Sculpture Garden', 'Marysville Bakery and village walks'],
        themes: ['Nature', 'Viewpoint', 'Hiking'],
        seasonalThemes: { winter: ['Snow', 'Nature', 'Scenic'] },
        coord: { lng: 145.745, lat: -37.513 },
        nearbyIds: ['warburton', 'yarra-glen'],
      },
      {
        id: 'warburton',
        name: 'Warburton & Redwood Forest',
        driveTimeHours: 1.3,
        driveKm: 75,
        highlights: ['Cement Creek Redwood Forest — towering Californian redwoods, 10 min from town', 'O\'Shannassy Aqueduct Trail (cycling/walking)', 'Ada Tree — 300-yr-old mountain ash', 'Upper Yarra dam and Black\'s Spur scenic drive'],
        themes: ['History', 'Nature', 'Viewpoint'],
        coord: { lng: 145.685, lat: -37.753 },
        nearbyIds: ['marysville', 'healesville'],
      },
    ],
  },

  // ── 2. Dandenong Ranges ──────────────────────────────────────────
  {
    id: 'dandenongs',
    name: 'Dandenong Ranges',
    tagline: 'Ancient fern gullies, forest sculptures, and very good coffee.',
    driveTimeRange: '45 min – 1 hr',
    themes: ['Rainforest', 'Cafes', 'Walking', 'Wildlife'],
    seasonalScores: { summer: 6, autumn: 8, winter: 7, spring: 9 },
    image: '🌿',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80',
    gradientFrom: '#1a3a1a',
    gradientTo: '#2a5a2a',
    subDests: [
      {
        id: 'belgrave',
        name: 'Belgrave (Puffing Billy)',
        driveTimeHours: 0.75,
        driveKm: 42,
        highlights: ['Puffing Billy steam train to Gembrook', 'Sherbrooke Forest walk (massive mountain ash)', 'Grants Picnic Ground — king parrots eat from your hand', 'Mist over the ranges at dawn'],
        themes: ['History', 'Nature', 'Active'],
        coord: { lng: 145.355, lat: -37.902 },
        nearbyIds: ['sassafras-olinda', 'emerald'],
      },
      {
        id: 'sassafras-olinda',
        name: 'Sassafras & Olinda',
        driveTimeHours: 0.9,
        driveKm: 50,
        highlights: ['Miss Marple\'s Tearoom — famous Devonshire tea since 1985', 'Cloudehill Gardens', 'National Rhododendron Garden (Oct peak)', 'Sky High lookout — 270° view over Melbourne'],
        themes: ['Cafes', 'Gardens', 'Scenic'],
        coord: { lng: 145.368, lat: -37.847 },
        nearbyIds: ['belgrave', 'mount-dandenong'],
      },
      {
        id: 'mount-dandenong',
        name: 'Mount Dandenong',
        driveTimeHours: 1.0,
        driveKm: 55,
        highlights: ['Sky High restaurant — panoramic views over Melbourne at night', 'William Ricketts Sanctuary (forest sculptures)', 'George Tindale Memorial Garden', 'Doongalla Reserve walking tracks'],
        themes: ['Dining', 'Viewpoint', 'Nature'],
        coord: { lng: 145.359, lat: -37.832 },
        nearbyIds: ['sassafras-olinda', 'belgrave'],
      },
      {
        id: 'emerald',
        name: 'Emerald & Monbulk',
        driveTimeHours: 0.9,
        driveKm: 50,
        highlights: ['Nobelius Heritage Nursery Park', 'Puffing Billy stops at Lakeside and Emerald Lake', 'Cardinia Reservoir Park trails', 'Strawberry picking in season (Nov–Feb)'],
        themes: ['Family', 'Walking', 'Nature'],
        coord: { lng: 145.445, lat: -37.937 },
        nearbyIds: ['belgrave', 'sassafras-olinda'],
      },
    ],
  },

  // ── 3. Mornington Peninsula ──────────────────────────────────────
  {
    id: 'mornington',
    name: 'Mornington Peninsula',
    tagline: 'Hot springs, ocean beaches, and cellar doors fifteen minutes apart.',
    driveTimeRange: '1 – 1.5 hrs',
    themes: ['Beach', 'Hot springs', 'Wine', 'Relaxation'],
    seasonalScores: { summer: 10, autumn: 7, winter: 8, spring: 8 },
    image: '♨️',
    imageUrl: 'https://images.unsplash.com/photo-1551460763-4ed53b44ae6d?w=1200&q=80',
    gradientFrom: '#0a3a5a',
    gradientTo: '#1a6a7a',
    subDests: [
      {
        id: 'mornington-town',
        name: 'Mornington',
        driveTimeHours: 1.0,
        driveKm: 60,
        highlights: ['Mornington Main Street — cafes, galleries, and boutiques on a classic bayside strip', 'Mills Beach and pier — calm swimming, sunsets, and fish & chips nearby', 'Mornington Racecourse Market (Wednesdays & Saturdays)', 'Gateway to Red Hill wineries and Peninsula Hot Springs 20 min south'],
        themes: ['Dining', 'Cafes', 'Nature'],
        coord: { lng: 145.037, lat: -38.219 },
        nearbyIds: ['dromana', 'red-hill'],
      },
      {
        id: 'dromana',
        name: 'Dromana, Arthurs Seat & Hot Springs',
        driveTimeHours: 1.2,
        driveKm: 75,
        highlights: ['Peninsula Hot Springs — open-air geothermal pools with bay views', 'Arthurs Seat Eagle gondola and treetop adventure', 'Alba Thermal Springs — adults-only, quieter alternative to Peninsula', 'Dromana waterfront and McCrae Lighthouse walk'],
        themes: ['Dining', 'Winery', 'Cafes'],
        coord: { lng: 144.954, lat: -38.416 },
        nearbyIds: ['red-hill', 'sorrento'],
      },
      {
        id: 'red-hill',
        name: 'Red Hill & Merricks',
        driveTimeHours: 1.3,
        driveKm: 80,
        highlights: ['Ten Minutes by Tractor winery', 'Merricks General Wine Store', 'Red Hill Brewery and taproom', 'Rolling vineyard views across the Peninsula'],
        themes: ['Wine', 'Food', 'Scenic'],
        coord: { lng: 145.115, lat: -38.360 },
        nearbyIds: ['dromana', 'flinders'],
      },
      {
        id: 'sorrento',
        name: 'Sorrento, Portsea & Fort Nepean',
        driveTimeHours: 1.5,
        driveKm: 95,
        highlights: ['Fort Nepean — WWII tunnels and gun emplacements at the tip of the Peninsula', 'Back Beach surf and wild rock pools', 'Dolphin & seal swimming cruises from Sorrento Pier', 'Ferry to Queenscliff across The Rip'],
        themes: ['Beach', 'Walking', 'Wildlife'],
        coord: { lng: 144.740, lat: -38.338 },
        nearbyIds: ['flinders', 'queenscliff'],
      },
      {
        id: 'flinders',
        name: 'Flinders & Cape Schanck',
        driveTimeHours: 1.7,
        driveKm: 110,
        highlights: ['Cape Schanck Lighthouse — dramatic boardwalk over volcanic rock', 'Flinders Hotel (great pub, clifftop views)', 'Bass & Flinders Distillery', 'Wild ocean beaches with almost no crowds'],
        themes: ['Dining', 'Pub', 'Winery'],
        coord: { lng: 145.296, lat: -38.473 },
        nearbyIds: ['red-hill', 'dromana'],
      },
    ],
  },

  // ── 4. Bellarine Peninsula ───────────────────────────────────────
  {
    id: 'bellarine',
    name: 'Bellarine Peninsula',
    tagline: 'Beaches, Victorian forts, and a ferry crossing that gives you two coasts in one day.',
    driveTimeRange: '1 – 1.5 hrs',
    themes: ['Beach', 'History', 'Wine', 'Coastal'],
    seasonalScores: { summer: 9, autumn: 6, winter: 5, spring: 7 },
    image: '⛵',
    imageUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80',
    gradientFrom: '#0a3a6a',
    gradientTo: '#1a6a8a',
    subDests: [
      {
        id: 'ocean-grove',
        name: 'Ocean Grove & Barwon Heads',
        driveTimeHours: 1.2,
        driveKm: 95,
        highlights: ['Ocean Grove Main Beach — surf and calm bay beach in one', 'Barwon Heads bridge and river estuary (filmed in Seachange)', 'Barwon Club Hotel — great pub food', 'Barwon River trail (walking and cycling)'],
        themes: ['Beach', 'Walking', 'Food'],
        coord: { lng: 144.522, lat: -38.270 },
        nearbyIds: ['queenscliff', 'point-lonsdale'],
      },
      {
        id: 'queenscliff',
        name: 'Queenscliff',
        driveTimeHours: 1.5,
        driveKm: 110,
        highlights: ['Fort Queenscliff — 1880s coastal artillery, excellent tours', 'Ferry to Sorrento and Mornington Peninsula', 'Marine Discovery Centre (penguins, touch pool)', 'Queenscliff Hotel (National Trust listed)'],
        themes: ['History', 'Nature', 'Viewpoint'],
        coord: { lng: 144.661, lat: -38.268 },
        nearbyIds: ['ocean-grove', 'point-lonsdale'],
      },
      {
        id: 'point-lonsdale',
        name: 'Point Lonsdale',
        driveTimeHours: 1.5,
        driveKm: 108,
        highlights: ['Point Lonsdale Lighthouse — watching ships navigate The Rip', 'Front Beach (sheltered, family-friendly)', 'Bluff Track coastal walk', 'Excellent fish and chips at the point'],
        themes: ['Coastal', 'Scenic', 'Walking'],
        coord: { lng: 144.615, lat: -38.278 },
        nearbyIds: ['queenscliff', 'ocean-grove'],
      },
      {
        id: 'portarlington',
        name: 'Portarlington & St Leonards',
        driveTimeHours: 1.0,
        driveKm: 80,
        highlights: ['Fresh mussels straight from the pier', 'Portarlington Mill (restored 1857 windmill)', 'Portarlington Mussel Festival (summer)', 'Geelong Wine Region cellar doors nearby'],
        themes: ['Nature', 'Dining', 'Winery'],
        coord: { lng: 144.648, lat: -38.114 },
        nearbyIds: ['queenscliff', 'ocean-grove'],
      },
    ],
  },

  // ── 5. Daylesford & Macedon ──────────────────────────────────────
  {
    id: 'daylesford',
    name: 'Daylesford & Macedon',
    tagline: "Victoria's spa capital — mineral springs, slow food, and weekend bliss.",
    driveTimeRange: '1 – 1.5 hrs',
    themes: ['Spa', 'Food', 'Gardens', 'Wellness'],
    seasonalScores: { summer: 6, autumn: 8, winter: 10, spring: 8 },
    image: '🛁',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    gradientFrom: '#2a4a2a',
    gradientTo: '#4a6a3a',
    subDests: [
      {
        id: 'kyneton',
        name: 'Kyneton',
        driveTimeHours: 0.9,
        driveKm: 75,
        highlights: ['Piper Street — one of Victoria\'s best food streets', 'Campaspe River walk and stone bridges', 'Kyneton Botanical Gardens', 'Local art galleries and antique shops'],
        themes: ['History', 'Nature', 'Viewpoint'],
        coord: { lng: 144.452, lat: -37.244 },
        nearbyIds: ['macedon', 'daylesford-town'],
      },
      {
        id: 'macedon',
        name: 'Macedon & Woodend',
        driveTimeHours: 1.0,
        driveKm: 65,
        highlights: ['Hanging Rock Reserve', 'Macedon Ranges wineries', 'Woodend High Street bakeries and cafes', 'Mount Macedon gardens (stunning in April)'],
        themes: ['History', 'Cafes', 'Dining'],
        coord: { lng: 144.568, lat: -37.424 },
        nearbyIds: ['kyneton', 'trentham'],
      },
      {
        id: 'trentham',
        name: 'Trentham',
        driveTimeHours: 1.3,
        driveKm: 80,
        highlights: ['Trentham Falls — largest single-drop falls in Victoria', 'Cosmo Brewery', 'Serendipity bakery and deli', 'Rolling hill farming country all around'],
        themes: ['Nature', 'Food', 'Day trip'],
        coord: { lng: 144.319, lat: -37.388 },
        nearbyIds: ['daylesford-town'],
      },
      {
        id: 'daylesford-town',
        name: 'Daylesford & Hepburn Springs',
        driveTimeHours: 1.5,
        driveKm: 110,
        highlights: ['Hepburn Bathhouse & Spa — Victorian-era mineral baths', 'Lake Daylesford walk', 'Free mineral springs — drink straight from roadside pumps', 'Convent Gallery and Wombat Hill Botanic Gardens'],
        themes: ['Nature', 'History', 'Dining'],
        coord: { lng: 144.143, lat: -37.344 },
        nearbyIds: ['trentham', 'macedon'],
      },
    ],
  },

  // ── 6. Phillip Island ────────────────────────────────────────────
  {
    id: 'phillip-island',
    name: 'Phillip Island',
    tagline: "The penguin parade at sunset. Surf beaches by day. One of Victoria's greats.",
    driveTimeRange: '1.5 – 2 hrs',
    themes: ['Nature', 'Viewpoint', 'History'],
    seasonalScores: { summer: 9, autumn: 7, winter: 6, spring: 8 },
    image: '🐧',
    imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80',
    gradientFrom: '#0a2a4a',
    gradientTo: '#0a4a6a',
    subDests: [
      {
        id: 'cowes',
        name: 'Cowes',
        driveTimeHours: 1.8,
        driveKm: 140,
        highlights: ['Thompson Avenue cafes and restaurants', 'Cowes Beach (calm, family-friendly)', 'Koala Conservation Reserve', 'Ferry to Stony Point (Mornington Peninsula)'],
        themes: ['Nature', 'Active', 'Viewpoint'],
        coord: { lng: 145.238, lat: -38.455 },
        nearbyIds: ['penguin-parade', 'rhyll'],
      },
      {
        id: 'penguin-parade',
        name: 'Penguin Parade & Nobbies',
        driveTimeHours: 2.0,
        driveKm: 145,
        highlights: ['Little penguin parade — nightly at dusk, year-round', 'Nobbies Centre and fur seal colony viewing', 'Boardwalk over rugged coastal landscape', 'Sunset at Cape Woolamai surf beach'],
        themes: ['Nature', 'Active', 'History'],
        coord: { lng: 144.998, lat: -38.515 },
        nearbyIds: ['cowes', 'rhyll'],
      },
      {
        id: 'rhyll',
        name: 'Rhyll & Churchill Island',
        driveTimeHours: 1.9,
        driveKm: 142,
        highlights: ['Churchill Island Heritage Farm — Victoria\'s first farm (1801)', 'Rhyll Inlet mangroves and wading birds', 'Rhyll Trout & Bush Tucker Farm', 'Quiet alternative to busy Cowes'],
        themes: ['History', 'Wildlife', 'Family'],
        coord: { lng: 145.304, lat: -38.467 },
        nearbyIds: ['cowes', 'penguin-parade'],
      },
    ],
  },

  // ── 7. Great Ocean Road ──────────────────────────────────────────
  {
    id: 'great-ocean-road',
    name: 'Great Ocean Road',
    tagline: 'Torquay is 1.5 hrs, the Apostles are 3.5. Every kilometre between is different.',
    driveTimeRange: '1.5 – 3.5 hrs',
    themes: ['Coastal', 'Cliffs', 'Surf', 'Rainforest'],
    seasonalScores: { summer: 8, autumn: 8, winter: 7, spring: 9 },
    image: '🌊',
    imageUrl: 'https://plus.unsplash.com/premium_photo-1706517229039-3e0a3eeb27ef?w=1200&q=80',
    gradientFrom: '#0c3460',
    gradientTo: '#0b5e47',
    subDests: [
      {
        id: 'torquay',
        name: 'Torquay & Bells Beach',
        driveTimeHours: 1.3,
        driveKm: 95,
        highlights: ['Bells Beach — world-famous surf break, Rip Curl Pro each Easter', 'Surf World Museum', 'Point Addis coastal walk', 'Jan Juc rock pools'],
        themes: ['Surf', 'Beach', 'Walking'],
        coord: { lng: 144.319, lat: -38.335 },
        nearbyIds: ['anglesea', 'aireys-inlet'],
      },
      {
        id: 'anglesea',
        name: 'Anglesea',
        driveTimeHours: 1.3,
        driveKm: 105,
        highlights: ['Wild kangaroos on the golf course — free to watch, hundreds of them', 'Anglesea River mouth beach (calm, perfect for kids)', 'Point Roadknight beach (sheltered swimming)', 'Great Ocean Eats food trail'],
        themes: ['Wildlife', 'Beach', 'Family', 'Walking'],
        coord: { lng: 144.185, lat: -38.405 },
        nearbyIds: ['torquay', 'aireys-inlet'],
      },
      {
        id: 'aireys-inlet',
        name: 'Aireys Inlet & Fairhaven',
        driveTimeHours: 1.5,
        driveKm: 115,
        highlights: ['Split Point Lighthouse — iconic white tower on the cliff (used in Round the Twist)', 'Fairhaven surf beach and rock shelves', 'Moggs Creek Picnic Ground', 'Local galleries and studios on the Artists Walk'],
        themes: ['Dining', 'Cafes', 'Pub'],
        coord: { lng: 144.094, lat: -38.461 },
        nearbyIds: ['anglesea', 'lorne'],
      },
      {
        id: 'lorne',
        name: 'Lorne',
        driveTimeHours: 1.8,
        driveKm: 140,
        highlights: ['Erskine Falls (30-min walk through ferns)', 'Lorne Beach and pier', 'Great Ocean Road Chocolaterie', 'Kafe Kahlua and Lorne Hotel'],
        themes: ['Beach', 'Waterfalls', 'Food'],
        coord: { lng: 143.980, lat: -38.541 },
        nearbyIds: ['aireys-inlet', 'kennett-river'],
      },
      {
        id: 'kennett-river',
        name: 'Kennett River & Wye River',
        driveTimeHours: 1.8,
        driveKm: 145,
        highlights: ['Wild koalas in the eucalypts on Grey River Road — dozens visible', 'Wye River Beach (small, beautiful)', 'Café Koala caravan park', 'One of the best free wildlife encounters on the GOR'],
        themes: ['Nature', 'Viewpoint', 'History'],
        coord: { lng: 143.870, lat: -38.618 },
        nearbyIds: ['lorne', 'apollo-bay'],
      },
      {
        id: 'apollo-bay',
        name: 'Apollo Bay',
        driveTimeHours: 2.3,
        driveKm: 190,
        highlights: ['Saturday foreshore market', 'Mariners Lookout walk (45 min)', 'Wild Dog Road detour into Otways rainforest', 'Fresh crayfish at the harbour'],
        themes: ['Dining', 'Cafes', 'Distillery'],
        coord: { lng: 143.672, lat: -38.759 },
        nearbyIds: ['great-otway', 'kennett-river'],
      },
      {
        id: 'great-otway',
        name: 'Great Otway National Park',
        driveTimeHours: 2.5,
        driveKm: 210,
        highlights: ['Triplet Falls — ancient temperate rainforest walk', 'Cape Otway Lighthouse (oldest on mainland Australia, 1848)', 'Wild koalas in the roadside gums near the lighthouse', 'Aire River camping ground'],
        themes: ['Nature', 'Viewpoint', 'Wildlife'],
        coord: { lng: 143.550, lat: -38.868 },
        nearbyIds: ['apollo-bay', 'twelve-apostles'],
      },
      {
        id: 'twelve-apostles',
        name: 'Port Campbell & 12 Apostles',
        driveTimeHours: 3.5,
        driveKm: 275,
        highlights: ['Twelve Apostles at sunrise or golden hour', 'Loch Ard Gorge — shipwreck history and hidden beach', 'The Arch and London Bridge rock stacks', 'Port Campbell township for overnight stays'],
        themes: ['Viewpoint', 'Dining', 'Nature'],
        coord: { lng: 142.996, lat: -38.663 },
        nearbyIds: ['warrnambool', 'great-otway'],
      },
      {
        id: 'warrnambool',
        name: 'Warrnambool',
        driveTimeHours: 3.3,
        driveKm: 265,
        highlights: ['Southern right whales at Logans Beach (Jun–Sep, platform viewing)', 'Flagstaff Hill Maritime Village — live shipwreck theatre', 'Lake Pertobe Adventure Playground', 'Tower Hill Wildlife Reserve — emus, koalas, kangaroos'],
        themes: ['History', 'Viewpoint', 'Dining'],
        coord: { lng: 142.484, lat: -38.381 },
        nearbyIds: ['port-fairy-town', 'twelve-apostles'],
      },
    ],
  },

  // ── 8. Port Fairy & Portland ─────────────────────────────────────
  {
    id: 'port-fairy',
    name: 'Port Fairy & Portland',
    tagline: "Victoria's oldest fishing village, the largest fur seal colony in Australia, and sea cliffs that define dramatic.",
    driveTimeRange: '3.5 – 4.5 hrs',
    themes: ['History', 'Wildlife', 'Coastal', 'Heritage'],
    seasonalScores: { summer: 7, autumn: 7, winter: 6, spring: 7 },
    image: '🦭',
    imageUrl: 'https://images.unsplash.com/photo-1622289356022-e71d31348959?w=1200&q=80',
    gradientFrom: '#1a3a5a',
    gradientTo: '#2a5a4a',
    subDests: [
      {
        id: 'port-fairy-town',
        name: 'Port Fairy',
        driveTimeHours: 3.5,
        driveKm: 290,
        highlights: ['One of Australia\'s best-preserved 19th-century port towns', 'Griffiths Island — mutton birds (Sep–Apr) and lighthouse walk', 'Port Fairy Folk Festival (March, world-class)', 'Caledonian Hotel — one of the oldest licensed pubs in Australia'],
        themes: ['Dining', 'Cafes'],
        coord: { lng: 142.232, lat: -38.383 },
        nearbyIds: ['portland', 'cape-bridgewater'],
      },
      {
        id: 'portland',
        name: 'Portland & Cape Nelson',
        driveTimeHours: 4.0,
        driveKm: 360,
        highlights: ['Cape Nelson Lighthouse and cliff walk', 'Discovery Bay Coastal Park — remote surf beaches', 'Portland Cable Trams (heritage)', 'Great South West Walk (250 km loop, start/end here)'],
        themes: ['Dining', 'Cafes'],
        coord: { lng: 141.604, lat: -38.344 },
        nearbyIds: ['cape-bridgewater', 'port-fairy-town'],
      },
      {
        id: 'cape-bridgewater',
        name: 'Cape Bridgewater',
        driveTimeHours: 4.2,
        driveKm: 380,
        highlights: ['Australia\'s largest accessible fur seal colony (250+ seals year-round)', 'Blowholes walk over dramatic volcanic coastline', 'Petrified forest — unique geological feature', 'Swan Lake (seasonal) behind the dunes'],
        themes: ['Viewpoint', 'Nature', 'History'],
        coord: { lng: 141.394, lat: -38.384 },
        nearbyIds: ['portland', 'port-fairy-town'],
      },
    ],
  },

  // ── 9. Bass Coast & South Gippsland ─────────────────────────────
  {
    id: 'bass-coast',
    name: 'Bass Coast & South Gippsland',
    tagline: "Surf beaches an hour and a half from Melbourne, a genuine underground mine tour, and Victoria's most intact gold-rush ghost town.",
    driveTimeRange: '1.5 – 2.5 hrs',
    themes: ['Beach', 'History', 'Surfing', 'Coastal'],
    seasonalScores: { summer: 9, autumn: 6, winter: 5, spring: 8 },
    image: '🏖️',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    gradientFrom: '#0a3a6a',
    gradientTo: '#1a6a5a',
    subDests: [
      {
        id: 'inverloch',
        name: 'Inverloch',
        driveTimeHours: 1.5,
        driveKm: 145,
        highlights: ['Inverloch surf beach and blowhole', 'Flat Rocks — world-class dinosaur fossil site', 'Venus Bay (wild, uncrowded beach 15 min away)', 'Inverloch township cafes and fish & chips'],
        themes: ['Beach', 'Nature', 'Family', 'Walking'],
        coord: { lng: 145.724, lat: -38.632 },
        nearbyIds: ['wonthaggi', 'wilsons-prom'],
      },
      {
        id: 'wonthaggi',
        name: 'Wonthaggi & Cape Paterson',
        driveTimeHours: 1.7,
        driveKm: 140,
        highlights: ['State Coal Mine — genuinely fascinating underground tour', 'Cape Paterson surf beach (locals\' favourite)', 'Bunurong Marine and Coastal Park', 'Cape Paterson Blowhole and Eagle\'s Nest walk'],
        themes: ['History', 'Beach', 'Walking'],
        coord: { lng: 145.597, lat: -38.607 },
        nearbyIds: ['inverloch', 'fish-creek'],
      },
      {
        id: 'fish-creek',
        name: 'Fish Creek & Foster',
        driveTimeHours: 2.3,
        driveKm: 180,
        highlights: ['Fish Creek Hotel (excellent pub food, arts community)', 'Rolling green South Gippsland hills', 'Foster — gateway town for the Prom, good bakeries', 'Agnes Falls (Victoria\'s highest single-drop waterfall)'],
        themes: ['Brewery', 'Cafes'],
        coord: { lng: 146.086, lat: -38.687 },
        nearbyIds: ['wilsons-prom', 'wonthaggi'],
      },
      {
        id: 'walhalla',
        name: 'Walhalla',
        driveTimeHours: 2.5,
        driveKm: 185,
        highlights: ['One of Victoria\'s best-preserved gold-rush towns — built in a steep valley', 'Long Tunnel Extended Mine tour (underground)', 'Walhalla Goldfields Railway — restored narrow gauge', 'The cricket ground: possibly Victoria\'s steepest'],
        themes: ['History', 'Hiking', 'Heritage'],
        coord: { lng: 146.448, lat: -37.931 },
        nearbyIds: ['fish-creek', 'bairnsdale'],
      },
    ],
  },

  // ── 10. Grampians ────────────────────────────────────────────────
  {
    id: 'grampians',
    name: 'Grampians (Gariwerd)',
    tagline: 'Wildflowers, ancient rock art, kangaroos in town, and hikes with views that earn them.',
    driveTimeRange: '3 – 3.5 hrs',
    themes: ['Hiking', 'Wildlife', 'Wildflowers', 'Camping'],
    seasonalScores: { summer: 5, autumn: 7, winter: 6, spring: 10 },
    image: '🌸',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    gradientFrom: '#3a1a5a',
    gradientTo: '#5a3a2a',
    subDests: [
      {
        id: 'halls-gap',
        name: 'Halls Gap',
        driveTimeHours: 3.0,
        driveKm: 235,
        highlights: ['Kangaroos on the oval at dawn — walk among them', 'Brambuk Cultural Centre — ancient rock art and Bunjil\'s Shelter', 'Silverband Falls walk (easy, 30 min)', 'Base camp for all major Grampians hikes'],
        themes: ['Dining', 'Winery', 'Nature'],
        coord: { lng: 142.518, lat: -37.138 },
        nearbyIds: ['boroka-pinnacle', 'dunkeld'],
      },
      {
        id: 'boroka-pinnacle',
        name: 'Boroka Lookout & The Pinnacle',
        driveTimeHours: 3.2,
        driveKm: 240,
        highlights: ['Boroka Lookout — best panoramic view in the Grampians', 'The Pinnacle hike (2 hrs return, moderate)', 'Reid Lookout and The Balconies (easy walk)', 'Wildflowers carpeting the slopes Sep–Nov'],
        themes: ['Hiking', 'Views', 'Wildflowers'],
        coord: { lng: 142.531, lat: -37.207 },
        nearbyIds: ['halls-gap', 'halls-gap'],
      },
      {
        id: 'dunkeld',
        name: 'Dunkeld',
        driveTimeHours: 3.5,
        driveKm: 260,
        highlights: ['Royal Mail Hotel — one of the finest regional restaurants in Australia', 'Mount Sturgeon and Mount Abrupt hikes', 'Southern Grampians visitor centre', 'Kangaroos and emus at the foothills'],
        themes: ['History', 'Viewpoint', 'Nature'],
        coord: { lng: 142.362, lat: -37.653 },
        nearbyIds: ['halls-gap', 'boroka-pinnacle'],
      },
      {
        id: 'wartook',
        name: 'Wartook & Northern Grampians',
        driveTimeHours: 3.3,
        driveKm: 290,
        highlights: ['MacKenzie Falls — Victoria\'s most powerful waterfall (free)', 'Zumsteins — hand-feed kangaroos at historic picnic ground', 'Mount Zero olive grove and farm door', 'Serra Range — quieter than southern Grampians'],
        themes: ['Hiking', 'Wildlife', 'Waterfalls', 'Nature'],
        coord: { lng: 142.405, lat: -37.000 },
        nearbyIds: ['halls-gap', 'natimuk-mt-arapiles'],
      },
    ],
  },

  // ── 11. Wimmera ──────────────────────────────────────────────────
  {
    id: 'wimmera',
    name: 'Wimmera',
    tagline: 'Big skies, ancient volcanoes, and the best rock climbing in Australia. Totally different to the rest of Victoria.',
    driveTimeRange: '3 – 4 hrs',
    themes: ['Nature', 'Climbing', 'Hiking', 'Remote'],
    seasonalScores: { summer: 4, autumn: 7, winter: 7, spring: 9 },
    image: '🧗',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
    gradientFrom: '#3a2a1a',
    gradientTo: '#5a3a1a',
    subDests: [
      {
        id: 'horsham',
        name: 'Horsham',
        driveTimeHours: 3.3,
        driveKm: 300,
        highlights: ['Horsham Regional Art Gallery (genuinely impressive)', 'Wimmera River parklands and wetlands', 'Green Lake and Spring Lake — migratory birds (winter)', 'Gateway to Grampians and Little Desert NP'],
        themes: ['Nature', 'History', 'Active'],
        coord: { lng: 142.199, lat: -36.710 },
        nearbyIds: ['natimuk-mt-arapiles', 'little-desert-national-park'],
      },
      {
        id: 'natimuk-mt-arapiles',
        name: 'Natimuk & Mount Arapiles',
        driveTimeHours: 3.5,
        driveKm: 325,
        highlights: ['Mount Arapiles — world-class rock climbing, 2,000+ routes on ancient quartzite', 'Natimuk Lake (flamingo-pink in summer from algae)', 'Natimuk township — quirky arts community', 'Summit walk-up (no climbing gear needed) for panoramic views'],
        themes: ['Climbing', 'Wildlife', 'Nature', 'Adventure'],
        coord: { lng: 141.832, lat: -36.757 },
        nearbyIds: ['horsham', 'little-desert-national-park'],
      },
      {
        id: 'little-desert-national-park',
        name: 'Little Desert National Park',
        driveTimeHours: 3.5,
        driveKm: 330,
        highlights: ['Mallee scrub wildflowers (Sep–Oct, extraordinary)', 'Malleefowl spotting — endangered, resident here', 'Brambuk Lodge camping (simple but beautiful)', 'Night sky — no light pollution, one of Victoria\'s best'],
        themes: ['Nature', 'Wildlife', 'Wildflowers', 'Camping'],
        coord: { lng: 141.847, lat: -36.575 },
        nearbyIds: ['natimuk-mt-arapiles', 'horsham'],
      },
    ],
  },

  // ── 12. Mallee & Pink Lakes ──────────────────────────────────────
  {
    id: 'mallee',
    name: 'Mallee & Pink Lakes',
    tagline: 'Naturally pink lakes, billion-star night skies, and a landscape that feels like another planet.',
    driveTimeRange: '3.5 – 5 hrs',
    themes: ['Nature', 'Wildlife', 'Photography', 'Remote'],
    seasonalScores: { summer: 3, autumn: 7, winter: 7, spring: 9 },
    image: '🌅',
    imageUrl: 'https://images.unsplash.com/photo-1446768500601-ac47e5ec3719?w=1200&q=80',
    gradientFrom: '#4a0a3a',
    gradientTo: '#6a2a5a',
    subDests: [
      {
        id: 'sea-lake',
        name: 'Lake Tyrrell & Sea Lake',
        driveTimeHours: 4.0,
        driveKm: 365,
        highlights: ['Lake Tyrrell — Victoria\'s largest salt lake, blazing pink at sunset', 'Mirror reflections of the Milky Way at night (no light pollution at all)', 'Sea Lake township bakery and Memorial', 'Ochre and violet Mallee sunsets that go on forever'],
        themes: ['Nature', 'Photography', 'Night sky', 'Remote'],
        coord: { lng: 142.849, lat: -35.487 },
        nearbyIds: ['hopetoun-pink-lake', 'wyperfeld-national-park'],
      },
      {
        id: 'hopetoun-pink-lake',
        name: 'Hopetoun & Pink Lake',
        driveTimeHours: 3.8,
        driveKm: 340,
        highlights: ['Pink Lake near Dimboola — flamingo-pink from halobacteria', 'Hopetoun Bakery (famous country pies)', 'Wyperfeld NP wildflowers in spring', 'Malleefowl spotting at dusk'],
        themes: ['Nature', 'Wildlife', 'Family'],
        coord: { lng: 142.373, lat: -35.723 },
        nearbyIds: ['sea-lake', 'wyperfeld-national-park'],
      },
      {
        id: 'wyperfeld-national-park',
        name: 'Wyperfeld National Park',
        driveTimeHours: 4.0,
        driveKm: 370,
        highlights: ['Vast mallee eucalypt woodland with virtually no other visitors', 'Spring wildflowers (Sep–Oct) carpeting the red sand', 'Emus, parrots and echidnas around the campground', 'Mallee spinifex and sandridges — feels like the outback'],
        themes: ['Nature', 'Wildlife', 'Hiking'],
        coord: { lng: 141.907, lat: -35.515 },
        nearbyIds: ['hopetoun-pink-lake', 'sea-lake'],
      },
      {
        id: 'hattah-kulkyne-national-park',
        name: 'Hattah-Kulkyne National Park',
        driveTimeHours: 4.5,
        driveKm: 430,
        highlights: ['Lake Hattah — wetland fills after Murray floods (dramatic)', 'Pelicans, egrets and spoonbills in extraordinary numbers', 'Mallee ringneck parrots and inland dotterels', 'Murray-Darling junction nearby — kayak hire in Mildura'],
        themes: ['Wildlife', 'Nature', 'Birdwatching', 'Remote'],
        coord: { lng: 142.302, lat: -34.754 },
        nearbyIds: ['wyperfeld-national-park', 'mildura'],
      },
    ],
  },

  // ── 13. Bright & Alpine ──────────────────────────────────────────
  {
    id: 'bright-alpine',
    name: 'Bright & Alpine',
    tagline: 'Famous autumn colours, ski villages in winter, and cycling trails all year.',
    driveTimeRange: '3 – 4.5 hrs',
    themes: ['Autumn colours', 'Skiing', 'Cycling', 'Villages'],
    seasonalScores: { summer: 7, autumn: 10, winter: 9, spring: 7 },
    image: '🍂',
    imageUrl: 'https://images.unsplash.com/photo-1477322524744-0eece9e79640?w=1200&q=80',
    gradientFrom: '#7c2d12',
    gradientTo: '#c2410c',
    subDests: [
      {
        id: 'wangaratta',
        name: 'Wangaratta',
        driveTimeHours: 2.5,
        driveKm: 235,
        highlights: ['Wangaratta Jazz & Blues Festival (October/November, world-class)', 'Gateway to Milawa Cheese and Brown Brothers winery', 'Ovens River parklands walk', 'Merriwa Park wetlands — birdwatching'],
        themes: ['Food', 'Wine', 'Music', 'Gateway'],
        coord: { lng: 146.312, lat: -36.357 },
        nearbyIds: ['milawa-gourmet', 'rutherglen'],
      },
      {
        id: 'rutherglen',
        name: 'Rutherglen',
        driveTimeHours: 2.8,
        driveKm: 275,
        highlights: ['Morris Wines and Chambers Rosewood — fortified wines unlike anywhere else in Australia', 'Rutherglen Wine Walk (cellar doors walking distance)', 'All Saints Estate homestead and gardens', 'Tastes of Rutherglen festival (March)'],
        themes: ['Wine', 'History', 'Food'],
        coord: { lng: 146.459, lat: -36.054 },
        nearbyIds: ['chiltern', 'wangaratta'],
      },
      {
        id: 'beechworth',
        name: 'Beechworth',
        driveTimeHours: 3.0,
        driveKm: 270,
        highlights: ['Beechworth Honey (museum + tasting)', 'Historic granite precinct — gold-rush era unchanged', 'Bridge Road Brewers craft beer', 'Ned Kelly was tried here — courthouse still standing'],
        themes: ['Pub', 'Brewery', 'Winery'],
        coord: { lng: 146.688, lat: -36.357 },
        nearbyIds: ['yackandandah', 'chiltern'],
      },
      {
        id: 'bright-town',
        name: 'Bright & Porepunkah',
        driveTimeHours: 3.5,
        driveKm: 320,
        highlights: ['Ovens River walk — peak autumn colour in May', 'Buffalo River swimming holes — crystal-clear mountain water', 'Canyon Brewery and Eatery', 'Ovens Valley Rail Trail (cycling, flat and beautiful)'],
        themes: ['Scenic', 'Hiking', 'Active'],
        seasonalThemes: { winter: ['Skiing', 'Snow', 'Scenic'] },
        coord: { lng: 146.957, lat: -36.727 },
        nearbyIds: ['harrietville', 'mount-buffalo-national-park'],
      },
      {
        id: 'mount-hotham',
        name: 'Mount Hotham',
        driveTimeHours: 4.0,
        driveKm: 370,
        highlights: ['Victoria\'s highest ski resort — steep terrain, serious skiing', 'Dinner Plain village (architecturally remarkable, 9 km away)', 'Alpine walking tracks in summer', 'Hotham–Falls Creek ski-through (longest in Australia)'],
        themes: ['Hiking', 'Nature', 'Scenic'],
        seasonalThemes: { winter: ['Skiing', 'Snow', 'Active'] },
        coord: { lng: 147.200, lat: -36.990 },
        nearbyIds: ['harrietville', 'falls-creek'],
      },
      {
        id: 'falls-creek',
        name: 'Falls Creek',
        driveTimeHours: 4.5,
        driveKm: 380,
        highlights: ['Ski-in ski-out village (Jun–Sep)', 'Snowshoe and cross-country trails in winter', 'Falls Creek walking tracks in summer', 'Village square — good food year-round'],
        themes: ['Hiking', 'Nature', 'Scenic'],
        seasonalThemes: { winter: ['Skiing', 'Snow', 'Active'] },
        coord: { lng: 147.274, lat: -36.863 },
        nearbyIds: ['mount-hotham', 'bright-town'],
      },
    ],
  },

  // ── 14. King Valley & NE Gourmet ────────────────────────────────
  {
    id: 'king-valley',
    name: 'King Valley & NE Gourmet',
    tagline: 'Italy in the Alps — Prosecco Road, artisan cheesemakers, and a landscape that stops you in your tracks.',
    driveTimeRange: '2.5 – 3.5 hrs',
    themes: ['Wine', 'Food', 'Cycling', 'Scenic'],
    seasonalScores: { summer: 6, autumn: 9, winter: 6, spring: 8 },
    image: '🍾',
    imageUrl: 'https://images.unsplash.com/photo-1637181156153-bedd1098f8c1?w=1200&q=80',
    gradientFrom: '#3a4a1a',
    gradientTo: '#5a6a2a',
    subDests: [
      {
        id: 'milawa-gourmet',
        name: 'King Valley & Milawa',
        driveTimeHours: 2.8,
        driveKm: 240,
        highlights: ['Dal Zotto — Australia\'s original prosecco producer', 'Milawa Cheese Factory — handmade brie and King River gold', 'Brown Brothers winery (Epicurean Centre lunch)', 'Glenrowan — Ned Kelly\'s last stand, 10 min south'],
        themes: ['Dining', 'Winery'],
        coord: { lng: 146.447, lat: -36.448 },
        nearbyIds: ['beechworth', 'bright-town'],
      },
      {
        id: 'yackandandah',
        name: 'Yackandandah',
        driveTimeHours: 3.2,
        driveKm: 295,
        highlights: ['One of Victoria\'s most intact 1850s gold-rush towns', 'Yackandandah Provenance Wines', 'The Butter Factory arts and culture hub', 'Yackandandah Creek swimming hole'],
        themes: ['History', 'Active'],
        coord: { lng: 146.839, lat: -36.313 },
        nearbyIds: ['beechworth', 'chiltern'],
      },
      {
        id: 'chiltern',
        name: 'Chiltern',
        driveTimeHours: 2.8,
        driveKm: 255,
        highlights: ['Chiltern-Mt Pilot NP — box-ironbark woodland, almost no visitors', 'Lake View homestead (Henry Handel Richardson\'s childhood home)', 'Federation-era main street virtually unchanged since 1890s', 'Superb parrots and regent honeyeaters in the woodland'],
        themes: ['Winery', 'History', 'Pub'],
        coord: { lng: 146.606, lat: -36.155 },
        nearbyIds: ['beechworth', 'rutherglen'],
      },
    ],
  },

  // ── 15. Mount Buffalo ────────────────────────────────────────────
  {
    id: 'mt-buffalo',
    name: 'Mount Buffalo',
    tagline: 'Ancient granite plateau, ice-carved gorges, and wildflowers above the clouds.',
    driveTimeRange: '3.5 – 4 hrs',
    themes: ['Hiking', 'Snow', 'Nature', 'Scenic'],
    seasonalScores: { summer: 8, autumn: 8, winter: 7, spring: 9 },
    image: '🏔️',
    imageUrl: 'https://images.unsplash.com/photo-1651045083441-528243165a98?w=1200&q=80',
    gradientFrom: '#1a3a5a',
    gradientTo: '#2a5a7a',
    subDests: [
      {
        id: 'harrietville',
        name: 'Harrietville',
        driveTimeHours: 3.5,
        driveKm: 310,
        highlights: ['Harrietville Brewery (craft beer, mountain views)', 'Snowline Hotel (gateway pub, cosy)', 'Hotham Creek trail — start of Mt Feathertop track (VIC\'s finest day hike)', 'Village market and B&Bs in autumn colours'],
        themes: ['Hiking', 'Food', 'Village', 'Nature'],
        coord: { lng: 147.054, lat: -36.891 },
        nearbyIds: ['mount-buffalo-national-park', 'bright-town'],
      },
      {
        id: 'mount-buffalo-national-park',
        name: 'Mount Buffalo National Park',
        driveTimeHours: 4.0,
        driveKm: 340,
        highlights: ['The Horn (1723 m) — summit views over four states', 'Lake Catani — camping among granite boulders', 'Crystal Brook and Eurobin Falls walks (wildflower-lined)', 'Mount Buffalo Chalet — 1910 heritage accommodation still operating'],
        themes: ['Hiking', 'Nature', 'Family'],
        seasonalThemes: { winter: ['Skiing', 'Snow', 'Hiking'] },
        coord: { lng: 146.817, lat: -36.721 },
        nearbyIds: ['harrietville', 'bright-town'],
      },
    ],
  },

  // ── 16. Mansfield & Lake Eildon ──────────────────────────────────
  {
    id: 'mansfield-high-country',
    name: 'Mansfield & Lake Eildon',
    tagline: 'Mount Buller for snow, Lake Eildon for houseboats, and a town that lives the Man from Snowy River.',
    driveTimeRange: '2.5 – 3 hrs',
    themes: ['Skiing', 'Water sports', 'Hiking', 'Village'],
    seasonalScores: { summer: 8, autumn: 7, winter: 10, spring: 7 },
    image: '⛷️',
    imageUrl: 'https://images.unsplash.com/photo-1713089782825-5d9a4c60f2f8?w=1200&q=80',
    gradientFrom: '#1a2a4a',
    gradientTo: '#3a5a7a',
    subDests: [
      {
        id: 'mansfield-town',
        name: 'Mansfield',
        driveTimeHours: 2.5,
        driveKm: 200,
        highlights: ['Man from Snowy River history — horse country, heritage rides', 'Mansfield Visitor Centre and Main Street cafes', 'Mansfield Brewery and local restaurants', 'Gateway to Mount Buller and the High Country'],
        themes: ['Nature', 'Dining', 'Brewery'],
        coord: { lng: 146.088, lat: -37.054 },
        nearbyIds: ['mount-buller', 'lake-eildon'],
      },
      {
        id: 'mount-buller',
        name: 'Mount Buller',
        driveTimeHours: 3.0,
        driveKm: 240,
        highlights: ['Victoria\'s most visited ski resort (Jun–Sep)', 'Mountain biking and hiking trails (Oct–May)', 'Village atmosphere with year-round accommodation', 'Summit views from 1805 m in any season'],
        themes: ['Hiking', 'Nature', 'Active'],
        seasonalThemes: { winter: ['Skiing', 'Snow', 'Active'] },
        coord: { lng: 146.440, lat: -37.153 },
        nearbyIds: ['mansfield-town', 'lake-eildon'],
      },
      {
        id: 'lake-eildon',
        name: 'Lake Eildon',
        driveTimeHours: 2.5,
        driveKm: 180,
        highlights: ['Houseboat hire — a distinctly Victorian holiday tradition', 'Fishing for golden perch and trout', 'Fraser National Park walking tracks around the lake', 'Bonnie Doon and Eildon townships on the water'],
        themes: ['Water sports', 'Fishing', 'Nature', 'Camping'],
        coord: { lng: 145.920, lat: -37.233 },
        nearbyIds: ['mansfield-town', 'marysville'],
      },
    ],
  },

  // ── 17. Murray River ─────────────────────────────────────────────
  {
    id: 'murray-river',
    name: 'Murray River',
    tagline: 'Paddle steamers, Victorian-era ports, and the kind of river life you only find up north.',
    driveTimeRange: '2.5 – 3.5 hrs',
    themes: ['History', 'River', 'Paddle steamers', 'Wine'],
    seasonalScores: { summer: 6, autumn: 8, winter: 7, spring: 8 },
    image: '⛵',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80',
    gradientFrom: '#2a4a5a',
    gradientTo: '#4a6a3a',
    subDests: [
      {
        id: 'echuca',
        name: 'Echuca',
        driveTimeHours: 2.5,
        driveKm: 210,
        highlights: ['Port of Echuca — best-preserved Victorian-era river port in Australia', 'Paddle steamer trips on the Murray', 'Historic High Street and Star Hotel (one of Victoria\'s oldest)', 'Murray Esplanade restaurants'],
        themes: ['History', 'Nature', 'Dining'],
        coord: { lng: 144.753, lat: -36.139 },
        nearbyIds: ['yarrawonga', 'cobram'],
      },
      {
        id: 'yarrawonga',
        name: 'Yarrawonga & Mulwala',
        driveTimeHours: 3.0,
        driveKm: 290,
        highlights: ['Lake Mulwala — water skiing, jetskis, houseboats', 'Yarrawonga Mulwala Golf Club (36 holes, two states)', 'Boat hire on the Murray', 'Holiday-town energy without the crowds of Echuca'],
        themes: ['History', 'Nature', 'Dining'],
        coord: { lng: 146.002, lat: -36.021 },
        nearbyIds: ['echuca', 'rutherglen'],
      },
      {
        id: 'cobram',
        name: 'Cobram',
        driveTimeHours: 3.0,
        driveKm: 285,
        highlights: ['Murray River beaches — white sand, calm swimming', 'Peach and nectarine picking in season (Jan–Feb)', 'Thompsons Beach on the Murray (free, beautiful)', 'Cobram peach festival'],
        themes: ['Nature', 'Active', 'Entertainment'],
        coord: { lng: 145.649, lat: -35.924 },
        nearbyIds: ['echuca', 'yarrawonga'],
      },
    ],
  },

  // ── 18. Swan Hill & Mildura ──────────────────────────────────────
  {
    id: 'murray-north',
    name: 'Swan Hill & Mildura',
    tagline: 'The Murray at its widest — paddle steamers, river beaches, and the best citrus in Australia.',
    driveTimeRange: '3.5 – 5.5 hrs',
    themes: ['History', 'River', 'Food', 'Relaxation'],
    seasonalScores: { summer: 5, autumn: 7, winter: 8, spring: 7 },
    image: '🍊',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    gradientFrom: '#5a3a0a',
    gradientTo: '#7a5a1a',
    subDests: [
      {
        id: 'swan-hill',
        name: 'Swan Hill',
        driveTimeHours: 3.5,
        driveKm: 335,
        highlights: ['Swan Hill Pioneer Settlement — living history museum with paddle steamer trips', 'Murray River beaches (free, beautiful)', 'Tyntynder Homestead (1846, gardens)', 'Murray River sunset from the pedestrian bridge'],
        themes: ['Nature', 'History', 'Dining'],
        coord: { lng: 143.554, lat: -35.338 },
        nearbyIds: ['robinvale', 'mildura'],
      },
      {
        id: 'robinvale',
        name: 'Robinvale & Euston',
        driveTimeHours: 4.5,
        driveKm: 430,
        highlights: ['Robinvale Wines — organic wines on the Murray', 'Murray River beaches at Euston (uncrowded)', 'Fresh table grapes and olive oil in season', 'NSW border crossing walk on the river'],
        themes: ['Nature', 'History', 'Active'],
        coord: { lng: 142.771, lat: -34.581 },
        nearbyIds: ['swan-hill', 'mildura'],
      },
      {
        id: 'mildura',
        name: 'Mildura',
        driveTimeHours: 5.5,
        driveKm: 555,
        highlights: ['Stefano\'s Restaurant — Italian fine dining in an unlikely setting', 'Murray River cruises and houseboat hire', 'Golden hour at the Mildura weir', 'Red Cliffs Psyche Bend pumping station (engineering marvel)'],
        themes: ['Brewery', 'Distillery', 'Dining'],
        coord: { lng: 142.155, lat: -34.188 },
        nearbyIds: ['robinvale', 'hattah-kulkyne-national-park'],
      },
    ],
  },

  // ── 19. Ballarat & Goldfields ────────────────────────────────────
  {
    id: 'ballarat',
    name: 'Ballarat & Goldfields',
    tagline: 'Gold rush history, incredible bakeries, and galleries that surprise you.',
    driveTimeRange: '1.5 hrs',
    themes: ['History', 'Food', 'Art', 'Family'],
    seasonalScores: { summer: 6, autumn: 7, winter: 7, spring: 7 },
    image: '⚙️',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
    gradientFrom: '#3a2a0a',
    gradientTo: '#6a4a1a',
    subDests: [
      {
        id: 'ballarat-town',
        name: 'Ballarat CBD',
        driveTimeHours: 1.5,
        driveKm: 115,
        highlights: ['Sovereign Hill — living gold rush precinct, pan for real gold', 'Art Gallery of Ballarat — best regional gallery in VIC', 'Lydiard Street heritage architecture', 'Lake Wendouree parklands and rowing'],
        themes: ['Dining', 'Cafes', 'Pub'],
        coord: { lng: 143.864, lat: -37.562 },
        nearbyIds: ['clunes', 'ararat'],
      },
      {
        id: 'clunes',
        name: 'Clunes',
        driveTimeHours: 1.8,
        driveKm: 140,
        highlights: ['Clunes Booktown Festival (May)', 'Intact 1850s goldfield streetscape', 'Cornish Hill walking track', 'Clunes Museum — first place gold found in Victoria'],
        themes: ['History', 'Dining'],
        coord: { lng: 143.786, lat: -37.296 },
        nearbyIds: ['ballarat-town', 'castlemaine'],
      },
      {
        id: 'ararat',
        name: 'Ararat & Great Western',
        driveTimeHours: 2.0,
        driveKm: 200,
        highlights: ['Best\'s Wines — Victoria\'s oldest family winery (1866)', 'Seppelt Great Western cellar (underground drives, extraordinary)', 'J Ward — former lunatic asylum, heritage tours', 'Pyrenees wine region cellar doors'],
        themes: ['History', 'Nature', 'Active'],
        coord: { lng: 143.014, lat: -37.284 },
        nearbyIds: ['ballarat-town', 'halls-gap'],
      },
    ],
  },

  // ── 20. Bendigo & Central Victoria ──────────────────────────────
  {
    id: 'bendigo',
    name: 'Bendigo & Central Victoria',
    tagline: "Elegant gold-era streetscapes, serious wineries, and Australia's best regional art gallery.",
    driveTimeRange: '1.5 – 2 hrs',
    themes: ['Wine', 'Art', 'History', 'Food'],
    seasonalScores: { summer: 5, autumn: 8, winter: 7, spring: 7 },
    image: '🏛️',
    imageUrl: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200&q=80',
    gradientFrom: '#2a1a3a',
    gradientTo: '#4a2a5a',
    subDests: [
      {
        id: 'castlemaine',
        name: 'Castlemaine',
        driveTimeHours: 1.5,
        driveKm: 120,
        highlights: ['Castlemaine Art Museum (stunning heritage building)', 'The Taproom and Theatre Royal', 'Mount Alexander Fruit Gardens', 'Castlemaine Diggings National Heritage Park'],
        themes: ['History', 'Dining', 'Winery'],
        coord: { lng: 144.213, lat: -37.062 },
        nearbyIds: ['maldon', 'bendigo-town'],
      },
      {
        id: 'maldon',
        name: 'Maldon',
        driveTimeHours: 1.7,
        driveKm: 145,
        highlights: ['Australia\'s first Notable Town — intact goldfields streetscape', 'Victorian Goldfields Railway steam train', 'Mount Tarrangower lookout', 'Tea rooms and antique shops on Main St'],
        themes: ['History', 'Heritage', 'Scenic'],
        coord: { lng: 144.067, lat: -36.993 },
        nearbyIds: ['castlemaine', 'bendigo-town'],
      },
      {
        id: 'heathcote',
        name: 'Heathcote',
        driveTimeHours: 1.5,
        driveKm: 130,
        highlights: ['Heathcote wine region — 100% Cambrian red soil, unique in Australia', 'Paul Osicka Winery and Tellurian Wines', 'McIvor Creek and McIvor Forest walks', 'Local deli and galleries on the main street'],
        themes: ['History', 'Nature', 'Viewpoint'],
        coord: { lng: 144.706, lat: -36.915 },
        nearbyIds: ['bendigo-town', 'castlemaine'],
      },
      {
        id: 'bendigo-town',
        name: 'Bendigo',
        driveTimeHours: 1.8,
        driveKm: 150,
        highlights: ['Bendigo Art Gallery (major national exhibitions)', 'Central Deborah Gold Mine tour', 'Golden Dragon Museum', 'Rosalind Park and heritage fountains'],
        themes: ['History', 'Dining', 'Nature'],
        coord: { lng: 144.280, lat: -36.758 },
        nearbyIds: ['castlemaine', 'heathcote'],
      },
    ],
  },

  // ── 21. Wilson's Promontory ──────────────────────────────────────
  {
    id: 'wilsons-prom',
    name: "Wilson's Promontory",
    tagline: 'The southernmost point of mainland Australia — empty beaches, wombats at dusk, serious hiking.',
    driveTimeRange: '2.5 – 3 hrs',
    themes: ['Hiking', 'Camping', 'Wildlife', 'Beaches'],
    seasonalScores: { summer: 8, autumn: 7, winter: 5, spring: 9 },
    image: '🏕️',
    imageUrl: 'https://images.unsplash.com/photo-1630627269807-7c9a2745f34c?w=1200&q=80',
    gradientFrom: '#0a3a2a',
    gradientTo: '#1a5a3a',
    subDests: [
      {
        id: 'wilsons-prom',
        name: "Wilson's Promontory",
        driveTimeHours: 2.8,
        driveKm: 230,
        highlights: ['Squeaky Beach — literally squeaks underfoot (pure silica sand)', 'Lilly Pilly Gully nature walk (2.5 hrs, ferns and forest)', 'Wombats roaming Tidal River campsite at dusk', 'Norman Beach — clear and calm swimming'],
        themes: ['Hiking', 'Wildlife', 'Family'],
        coord: { lng: 146.316, lat: -38.984 },
        nearbyIds: ['fish-creek', 'wilsons-lighthouse'],
      },
      {
        id: 'wilsons-lighthouse',
        name: 'South Point & Lighthouse',
        driveTimeHours: 3.5,
        driveKm: 250,
        highlights: ['Southernmost point of mainland Australia', 'Lighthouse overnight stays (book well ahead)', 'Waterloo Bay — wild and remote', 'Multi-day Great Prom Walk'],
        themes: ['Hiking', 'Nature', 'Scenic'],
        coord: { lng: 146.380, lat: -39.136 },
        nearbyIds: ['wilsons-prom'],
      },
    ],
  },

  // ── 22. East Gippsland & Lakes ───────────────────────────────────
  {
    id: 'east-gippsland',
    name: 'East Gippsland & Lakes',
    tagline: 'The Gippsland Lakes, ancient rainforest, and 90 Mile Beach — entirely off the tourist trail.',
    driveTimeRange: '3 – 5 hrs',
    themes: ['Lakes', 'Fishing', 'Wilderness', 'Kayaking'],
    seasonalScores: { summer: 9, autumn: 7, winter: 5, spring: 7 },
    image: '🛶',
    imageUrl: 'https://images.unsplash.com/photo-1637181156153-bedd1098f8c1?w=1200&q=80',
    gradientFrom: '#0a2a4a',
    gradientTo: '#1a4a3a',
    subDests: [
      {
        id: 'bairnsdale',
        name: 'Bairnsdale & Paynesville',
        driveTimeHours: 3.0,
        driveKm: 280,
        highlights: ['St Mary\'s Church murals (the Sistine Chapel of Gippsland)', 'Paynesville waterfront dining', 'Raymond Island koala colony (free 5-min ferry)', 'Gippsland Lakes Coastal Park'],
        themes: ['Culture', 'Wildlife', 'Waterfront'],
        coord: { lng: 147.607, lat: -37.830 },
        nearbyIds: ['metung', 'lakes-entrance'],
      },
      {
        id: 'metung',
        name: 'Metung',
        driveTimeHours: 3.5,
        driveKm: 310,
        highlights: ['One of Victoria\'s most beautiful lakeside villages', 'Kayaking on Bancroft Bay — calm, crystal-clear water', 'Metung Hotel and Gallery Metung', 'Houseboat hire on the Gippsland Lakes'],
        themes: ['Lakes', 'Relaxation', 'Food', 'Boating'],
        coord: { lng: 147.883, lat: -37.906 },
        nearbyIds: ['bairnsdale', 'lakes-entrance'],
      },
      {
        id: 'lakes-entrance',
        name: 'Lakes Entrance',
        driveTimeHours: 3.5,
        driveKm: 320,
        highlights: ['Footbridge over the Entrance to Ninety Mile Beach', 'Fresh oysters at the Fishermen\'s Co-op', 'Houseboat hire on the Gippsland Lakes', 'Kalimna Point walk — panoramic lake and ocean views'],
        themes: ['Lakes', 'Food', 'Boating'],
        coord: { lng: 147.980, lat: -37.881 },
        nearbyIds: ['metung', 'buchan'],
      },
      {
        id: 'buchan',
        name: 'Buchan Caves',
        driveTimeHours: 4.0,
        driveKm: 360,
        highlights: ['Buchan Caves — remarkable limestone formations, guided tours daily', 'Glow-worms in the Royal Cave ceiling like a galaxy', 'Kangaroos and wallabies at the reserve at dusk', 'Buchan Valley riverside camping ground'],
        themes: ['Nature', 'Wildlife', 'Camping', 'Hiking'],
        coord: { lng: 148.167, lat: -37.500 },
        nearbyIds: ['orbost', 'lakes-entrance'],
      },
      {
        id: 'errinundra',
        name: 'Errinundra Plateau',
        driveTimeHours: 4.5,
        driveKm: 390,
        highlights: ['Oldest cool-temperate rainforest in Victoria — cathedral-like ferns', 'Big Tree — a 300-yr ancient mountain ash', 'Adams Creek walk in total silence', 'Virtually no other tourists at any time of year'],
        themes: ['Nature', 'Hiking', 'Wildlife'],
        coord: { lng: 148.840, lat: -37.435 },
        nearbyIds: ['buchan', 'orbost'],
      },
    ],
  },

  // ── 23. Far East Gippsland ───────────────────────────────────────
  {
    id: 'far-east-gippsland',
    name: 'Far East Gippsland',
    tagline: "Victoria's wild eastern edge — ancient rainforest, empty beaches, and a fishing village that's barely changed.",
    driveTimeRange: '4.5 – 6 hrs',
    themes: ['Wilderness', 'Beaches', 'Fishing', 'Remote'],
    seasonalScores: { summer: 8, autumn: 6, winter: 4, spring: 6 },
    image: '🌊',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80',
    gradientFrom: '#0a2a1a',
    gradientTo: '#1a4a2a',
    subDests: [
      {
        id: 'cape-conran',
        name: 'Cape Conran',
        driveTimeHours: 4.5,
        driveKm: 410,
        highlights: ['Cape Conran Coastal Park — pristine beaches with almost no visitors', 'Banksia Bluff campground (walk to the beach in 2 minutes)', 'Snorkelling and rock fishing', 'Sea eagles overhead on almost every visit'],
        themes: ['Beaches', 'Camping', 'Nature', 'Wildlife'],
        coord: { lng: 148.707, lat: -37.896 },
        nearbyIds: ['orbost', 'mallacoota'],
      },
      {
        id: 'orbost',
        name: 'Orbost & Snowy River',
        driveTimeHours: 4.5,
        driveKm: 395,
        highlights: ['Snowy River NP — kayaking and swimming in pristine gorges', 'McKillops Bridge — spectacular gorge viewpoint', 'Corringle Picnic Area and Orbost rainforest', 'Junction of Snowy and Brodribb rivers'],
        themes: ['History', 'Viewpoint', 'Dining'],
        coord: { lng: 148.461, lat: -37.706 },
        nearbyIds: ['cape-conran', 'buchan'],
      },
      {
        id: 'mallacoota',
        name: 'Mallacoota',
        driveTimeHours: 6.0,
        driveKm: 520,
        highlights: ['Victoria\'s easternmost coastal town — worth every kilometre', 'Mallacoota Inlet (kayaking through stunning waterways)', 'Croajingolong NP — UNESCO Biosphere, ancient coastal wilderness', 'Betka Beach — empty, wild, and extraordinary'],
        themes: ['Remote', 'Wilderness', 'Kayaking', 'Beaches'],
        coord: { lng: 149.760, lat: -37.574 },
        nearbyIds: ['orbost', 'cape-conran'],
      },
    ],
  },

  // ── 25. Melbourne Inner Suburbs ──────────────────────────────────
  {
    id: 'melbourne-inner',
    name: 'Melbourne Inner Suburbs',
    tagline: 'Street art, world-class food, iconic sports venues, and beach suburbs — all within 30 min of the CBD.',
    driveTimeRange: '15 – 40 min',
    themes: ['Food', 'Culture', 'Art', 'Sports', 'Markets', 'Beach'],
    seasonalScores: { summer: 8, autumn: 8, winter: 7, spring: 8 },
    image: '🏙️',
    imageUrl: 'https://images.unsplash.com/photo-1594300070414-34b8021779bf?w=1200&q=80',
    gradientFrom: '#1a1a2e',
    gradientTo: '#16213e',
    subDests: [
      {
        id: 'melbourne-cbd',
        name: 'Melbourne CBD',
        driveTimeHours: 0.25,
        driveKm: 4,
        highlights: ['Federation Square and Birrarung Marr', 'St Paul\'s Cathedral and the Block Arcade', 'Melbourne laneways — Hosier, AC/DC, Degraves', 'Queen Victoria Market (open Tue–Sun)'],
        themes: ['Nature', 'Dining', 'History'],
        coord: { lng: 144.963, lat: -37.814 },
        nearbyIds: ['fitzroy', 'st-kilda'],
      },
      {
        id: 'st-kilda',
        name: 'St Kilda',
        driveTimeHours: 0.4,
        driveKm: 9,
        highlights: ['Luna Park (heritage amusement park, open weekends)', 'Acland Street cake shops and cafes', 'St Kilda Beach and pier with Little Penguins at dusk', 'The Espy and live music strip'],
        themes: ['Dining', 'Pub', 'Cafes'],
        coord: { lng: 144.979, lat: -37.868 },
        nearbyIds: ['melbourne-cbd', 'williamstown'],
      },
      {
        id: 'richmond',
        name: 'Richmond & MCG Precinct',
        driveTimeHours: 0.25,
        driveKm: 4,
        highlights: ['MCG — tours of Australia\'s most iconic stadium', 'Rod Laver Arena and Melbourne Park (Grand Slam tennis)', 'Yarra Park and Birrarung Marr riverside walks', 'Bridge Road cafe strip and boutique shopping'],
        themes: ['Sports', 'Food', 'Culture', 'Walking'],
        coord: { lng: 144.984, lat: -37.821 },
        nearbyIds: ['melbourne-cbd', 'fitzroy'],
      },
      {
        id: 'fitzroy-collingwood',
        name: 'Fitzroy & Collingwood',
        driveTimeHours: 0.25,
        driveKm: 4,
        highlights: ['Brunswick Street — galleries, vintage, and some of Melbourne\'s best cafes', 'Smith Street restaurants and bars', 'Gertrude Street boutiques', 'Collingwood Arts Precinct'],
        themes: ['Art', 'Food', 'Culture', 'Markets'],
        coord: { lng: 144.978, lat: -37.800 },
        nearbyIds: ['melbourne-cbd', 'brunswick'],
      },
      {
        id: 'brunswick',
        name: 'Brunswick',
        driveTimeHours: 0.3,
        driveKm: 6,
        highlights: ['Sydney Road — multicultural food strip with A1 Bakery', 'Marios Cafe (Melbourne icon)', 'Brunswick Ballroom and live music', 'Vintage stores and independent bookshops'],
        themes: ['Dining', 'Brewery', 'Pub'],
        coord: { lng: 144.960, lat: -37.770 },
        nearbyIds: ['fitzroy', 'melbourne-cbd'],
      },
      {
        id: 'williamstown',
        name: 'Williamstown',
        driveTimeHours: 0.4,
        driveKm: 14,
        highlights: ['Williamstown Beach and foreshore promenade', 'Craft beer at Robb Pier and Point Gellibrand', 'Ferry to Docklands across the bay', 'Nelson Place heritage streetscape and restaurants'],
        themes: ['Dining', 'Cafes', 'Pub'],
        coord: { lng: 144.900, lat: -37.866 },
        nearbyIds: ['st-kilda', 'melbourne-cbd'],
      },
    ],
  },

  // ── 26. Alpine Snowfields — Baw Baw ─────────────────────────────
  {
    id: 'baw-baw',
    name: 'Mount Baw Baw',
    tagline: 'Victoria\'s most accessible ski resort — snow in winter, wildflower walks and forest drives in summer.',
    driveTimeRange: '2 – 2.5 hrs',
    themes: ['Snow', 'Hiking', 'Nature', 'Wildlife', 'Scenic'],
    seasonalScores: { summer: 6, autumn: 7, winter: 9, spring: 7 },
    image: '⛷️',
    imageUrl: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80',
    gradientFrom: '#0d2137',
    gradientTo: '#1a3a5c',
    subDests: [
      {
        id: 'mount-baw-baw',
        name: 'Mount Baw Baw',
        driveTimeHours: 2.2,
        driveKm: 175,
        highlights: ['Ski and snowboard runs (June–September)', 'Mount Baw Baw Alpine Resort village', 'Cascades Nature Walk and alpine wildflowers (spring/summer)', 'Mountain ash forests and lyrebird habitat'],
        themes: ['Hiking', 'Nature', 'Wildlife'],
        seasonalThemes: { winter: ['Skiing', 'Snow', 'Active'] },
        coord: { lng: 146.270, lat: -37.838 },
        nearbyIds: ['walhalla', 'fish-creek'],
      },
      {
        id: 'rawson',
        name: 'Rawson & Thomson River',
        driveTimeHours: 2.0,
        driveKm: 165,
        highlights: ['Thomson River trout fishing', 'Rawson township with local cafe', 'Scenic drive through Tyers and Rawson', 'Gateway to Baw Baw National Park'],
        themes: ['Pub'],
        coord: { lng: 146.482, lat: -37.897 },
        nearbyIds: ['mount-baw-baw', 'walhalla'],
      },
    ],
  },
]

/** Return clusters sorted by seasonal score (desc) for the given season */
export function getClustersBySeason(season: Season): VicCluster[] {
  return [...VICTORIAN_CLUSTERS].sort(
    (a, b) => b.seasonalScores[season] - a.seasonalScores[season]
  )
}

export function findCluster(id: string): VicCluster | undefined {
  return VICTORIAN_CLUSTERS.find((c) => c.id === id)
}

/** Find all sub-dests that are nearby a given sub-dest (using nearbyIds) */
export function getNearbySubDests(sub: SubDest): Array<{ sub: SubDest; cluster: VicCluster }> {
  if (!sub.nearbyIds?.length) return []
  const results: Array<{ sub: SubDest; cluster: VicCluster }> = []
  for (const cluster of VICTORIAN_CLUSTERS) {
    for (const s of cluster.subDests) {
      if (sub.nearbyIds.includes(s.id) && s.id !== sub.id) {
        results.push({ sub: s, cluster })
      }
    }
  }
  return results.slice(0, 3)
}

// ── Discovery matching ────────────────────────────────────────────

export type TripInterest =
  | 'Wildlife'
  | 'Wine'
  | 'Hiking'
  | 'History'
  | 'Food'
  | 'Adventure'
  | 'Scenic'
  | 'Art'
  | 'Pubs'

const INTEREST_THEMES: Record<TripInterest, string[]> = {
  Wildlife:  ['Wildlife', 'Birdwatching', 'Animals', 'Penguins', 'Koalas', 'Seals'],
  Wine:      ['Wine', 'Cellar doors', 'Wineries', 'Winery'],
  Hiking:    ['Hiking', 'Walking', 'Trails', 'Nature', 'Remote', 'Bushwalking', 'Forests'],
  History:   ['History', 'Heritage', 'Historic', 'Immersive', 'Indigenous', 'Culture'],
  Food:      ['Food', 'Cafes', 'Bakeries', 'Dining', 'Markets', 'Restaurants'],
  Adventure: ['Adventure', 'Surf', 'Climbing', 'Kayaking', 'Mountain bike', 'Active', 'Skydiving', 'Abseiling', 'Skiing'],
  Scenic:    ['Scenic', 'Lookouts', 'Views', 'Coastal', 'Iconic', 'Photography', 'Night sky', 'Viewpoint'],
  Art:       ['Art', 'Culture', 'Entertainment', 'Creative', 'Gallery', 'Theatre', 'Indigenous'],
  Pubs:      ['Pub', 'Brewery', 'Beer', 'Distillery', 'Bar', 'Craft beer', 'Food', 'Drink'],
}

export interface MatchedDest {
  sub: SubDest
  cluster: VicCluster
  score: number
  matchReasons: string[]
  activityMatches: number
}

function haversineKm(a: Coordinate, b: Coordinate): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/** Maps sub-destination slug → interest category DB count (e.g. 'yarra-glen' → 5) */
export type InterestDbCounts = Record<string, number>

export function matchDestinations(opts: {
  maxDriveHours: number
  interests: TripInterest[]
  hasKids: boolean
  isOvernight: boolean
  season: Season
  originCoord?: Coordinate
  dbCounts?: InterestDbCounts
}): MatchedDest[] {
  const { maxDriveHours, interests, hasKids, isOvernight, season, originCoord, dbCounts } = opts
  const results: MatchedDest[] = []

  for (const cluster of VICTORIAN_CLUSTERS) {
    const seasonScore = cluster.seasonalScores[season]

    for (const sub of cluster.subDests) {
      const actualDriveHours = originCoord
        ? (haversineKm(originCoord, sub.coord) * 1.3) / 80
        : sub.driveTimeHours

      const effectiveMax = isOvernight ? maxDriveHours * 1.3 : maxDriveHours
      if (actualDriveHours > effectiveMax) continue

      let score = 0
      const matchReasons: string[] = []

      score += seasonScore * 3
      if (seasonScore >= 9) matchReasons.push(`Perfect for ${season}`)
      else if (seasonScore >= 7) matchReasons.push(`Great in ${season}`)

      const clusterThemes = cluster.themes.map((t) => t.toLowerCase())
      const activeSubThemes = sub.seasonalThemes?.[season] ?? sub.themes
      const subThemes = activeSubThemes.map((t) => t.toLowerCase())
      const subNameLower = sub.name.toLowerCase()
      let activityMatches = 0
      const matchedInterestLabels: string[] = []
      const INTEREST_LABEL: Record<TripInterest, string> = {
        Wildlife: 'Wildlife', Wine: 'Wineries', Hiking: 'Hiking',
        History: 'History', Food: 'Cafes & food', Adventure: 'Adventure',
        Scenic: 'Scenic views', Art: 'Art & culture', Pubs: 'Pubs & breweries',
      }
      for (const interest of interests) {
        const interestKeys = INTEREST_THEMES[interest].map((t) => t.toLowerCase())
        const subMatch = interestKeys.some((t) => subThemes.some((at) => at.includes(t)))
        const clusterOnlyMatch = !subMatch && interestKeys.some((t) => clusterThemes.some((at) => at.includes(t)))
        // HotSprings: require sub-dest direct match or name match to avoid Kyneton
        // (which inherits cluster 'Wellness'/'Spa' themes without actually having hot springs)
        if (interest === 'HotSprings') {
          const nameMatch = /hot spring|thermal|mineral spring|bathhouse/.test(subNameLower)
          if (subMatch || nameMatch) { score += 15; activityMatches++; matchedInterestLabels.push(INTEREST_LABEL[interest]) }
          // no points for cluster-only match on HotSprings
        } else if (subMatch) {
          // If we have DB counts for this interest, only count as a match if there's actual content
          const dbCount = dbCounts?.[sub.id] ?? -1
          const hasDbContent = dbCount !== 0 // -1 = no DB data (fall back to themes), 0 = confirmed empty
          if (hasDbContent) {
            score += 10; activityMatches++; matchedInterestLabels.push(INTEREST_LABEL[interest])
          }
          // confirmed 0 in DB → no points, won't appear in Recommended
        } else if (clusterOnlyMatch) {
          score += 4 // partial credit for cluster theme only
        }
      }
      if (matchedInterestLabels.length > 0) {
        matchReasons.push(matchedInterestLabels.slice(0, 3).join(' · '))
      }

      // Boost by actual DB count for the selected interest categories
      if (dbCounts && activityMatches > 0) {
        const dbCount = dbCounts[sub.id] ?? 0
        score += dbCount * 3 // 3 pts per actual venue in DB
      }

      if (hasKids) {
        const kidsThemes = ['wildlife', 'family', 'beach', 'history', 'nature']
        const allThemesCombined = [...clusterThemes, ...subThemes]
        const kidsMatch = allThemesCombined.some((t) => kidsThemes.some((k) => t.includes(k)))
        if (kidsMatch) { score += 12; matchReasons.push('Great for kids') }
      }

      const ratio = actualDriveHours / effectiveMax
      if (ratio >= 0.6) score += 8
      else if (ratio >= 0.3) score += 3

      if (isOvernight && actualDriveHours >= 2) score += 5

      results.push({ sub, cluster, score, matchReasons, activityMatches })
    }
  }

  // Allow up to 2 per cluster to show variety; return top 9
  const clusterCount = new Map<string, number>()
  return results
    .sort((a, b) => b.score - a.score)
    .filter(({ cluster }) => {
      const n = clusterCount.get(cluster.id) ?? 0
      if (n >= 2) return false
      clusterCount.set(cluster.id, n + 1)
      return true
    })
    .slice(0, 9)
}
