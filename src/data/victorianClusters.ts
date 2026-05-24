import type { Coordinate } from '@/types'
import type { Season } from '@/utils/season'

export interface SubDest {
  id: string
  name: string
  driveTimeHours: number  // from Melbourne CBD
  driveKm: number
  highlights: string[]    // 3–4 specific things it's known for
  themes: string[]
  coord: Coordinate
}

export interface VicCluster {
  id: string
  name: string
  tagline: string
  driveTimeRange: string  // e.g. "45 min – 1.5 hrs"
  themes: string[]
  seasonalScores: Record<Season, number>
  image: string
  gradientFrom: string
  gradientTo: string
  subDests: SubDest[]
}

export const VICTORIAN_CLUSTERS: VicCluster[] = [
  {
    id: 'yarra-valley',
    name: 'Yarra Valley',
    tagline: 'World-class wine, misty vineyards, and brunch worth the drive.',
    driveTimeRange: '45 min – 1.5 hrs',
    themes: ['Wine', 'Food', 'Scenic drives', 'Day trip'],
    seasonalScores: { summer: 7, autumn: 10, winter: 7, spring: 8 },
    image: '🍷',
    gradientFrom: '#4a1c40',
    gradientTo: '#7c3a28',
    subDests: [
      {
        id: 'yarra-glen',
        name: 'Yarra Glen',
        driveTimeHours: 0.75,
        driveKm: 50,
        highlights: ['Gulf Station Historic Farm', 'Tarrawarra Museum of Art', 'Cellar doors on Melba Hwy', 'Giant Steps & Innocent Bystander'],
        themes: ['Wine', 'Art', 'History'],
        coord: { lng: 145.383, lat: -37.655 },
      },
      {
        id: 'healesville',
        name: 'Healesville',
        driveTimeHours: 1.0,
        driveKm: 65,
        highlights: ['Healesville Sanctuary (native wildlife)', 'Coombe Estate winery', 'Badger Weir rainforest walk', 'Cafes on Don Road'],
        themes: ['Wildlife', 'Wine', 'Walking'],
        coord: { lng: 145.520, lat: -37.654 },
      },
      {
        id: 'warburton',
        name: 'Warburton',
        driveTimeHours: 1.3,
        driveKm: 75,
        highlights: ['O\'Shannassy Aqueduct Trail (rail trail)', 'Ada Tree — 300-yr-old mountain ash', 'Upper Yarra dam views', 'Warburton township bakeries'],
        themes: ['Hiking', 'Cycling', 'Nature'],
        coord: { lng: 145.685, lat: -37.753 },
      },
    ],
  },
  {
    id: 'mornington',
    name: 'Mornington Peninsula',
    tagline: 'Hot springs, ocean beaches, and cellar doors fifteen minutes apart.',
    driveTimeRange: '1 – 1.5 hrs',
    themes: ['Beach', 'Hot springs', 'Wine', 'Relaxation'],
    seasonalScores: { summer: 10, autumn: 7, winter: 8, spring: 8 },
    image: '♨️',
    gradientFrom: '#0a3a5a',
    gradientTo: '#1a6a7a',
    subDests: [
      {
        id: 'mornington-town',
        name: 'Mornington',
        driveTimeHours: 1.0,
        driveKm: 60,
        highlights: ['Mornington Main Street cafes', 'Mills Beach and pier', 'Peninsula Hot Springs (25 min further)', 'Arthur\'s Seat Eagle gondola'],
        themes: ['Beach', 'Food', 'Relaxation'],
        coord: { lng: 145.037, lat: -38.219 },
      },
      {
        id: 'red-hill',
        name: 'Red Hill & Merricks',
        driveTimeHours: 1.3,
        driveKm: 80,
        highlights: ['Ten Minutes by Tractor winery', 'Merricks General Wine Store', 'Red Hill Brewery', 'Rolling vineyard views'],
        themes: ['Wine', 'Food', 'Scenic'],
        coord: { lng: 145.115, lat: -38.360 },
      },
      {
        id: 'sorrento',
        name: 'Sorrento & Portsea',
        driveTimeHours: 1.5,
        driveKm: 95,
        highlights: ['Back Beach surf and rock pools', 'Sorrento village boutiques', 'Dolphin & seal cruise departures', 'Ferry to Queenscliff'],
        themes: ['Beach', 'Walking', 'Wildlife'],
        coord: { lng: 144.740, lat: -38.338 },
      },
      {
        id: 'peninsula-hot-springs',
        name: 'Peninsula Hot Springs',
        driveTimeHours: 1.4,
        driveKm: 90,
        highlights: ['Open-air geothermal pools', 'Cave pool and hillside bathing', 'Café Salso on-site dining', 'Bathhouse and spa treatments'],
        themes: ['Wellness', 'Relaxation', 'Hot springs'],
        coord: { lng: 144.954, lat: -38.416 },
      },
    ],
  },
  {
    id: 'daylesford',
    name: 'Daylesford & Macedon',
    tagline: "Victoria's spa capital — mineral springs, slow food, and weekend bliss.",
    driveTimeRange: '1 – 1.5 hrs',
    themes: ['Spa', 'Food', 'Gardens', 'Wellness'],
    seasonalScores: { summer: 6, autumn: 8, winter: 10, spring: 8 },
    image: '🛁',
    gradientFrom: '#2a4a2a',
    gradientTo: '#4a6a3a',
    subDests: [
      {
        id: 'macedon',
        name: 'Macedon & Woodend',
        driveTimeHours: 1.0,
        driveKm: 65,
        highlights: ['Hanging Rock Reserve', 'Macedon Ranges wineries', 'Woodend High Street cafes', 'Mount Macedon gardens (April peak)'],
        themes: ['History', 'Wine', 'Walking'],
        coord: { lng: 144.568, lat: -37.424 },
      },
      {
        id: 'trentham',
        name: 'Trentham',
        driveTimeHours: 1.3,
        driveKm: 80,
        highlights: ['Trentham Falls (largest single-drop in Victoria)', 'Cosmo Brewery', 'Serendipity bakery & deli', 'Rolling hill farming country'],
        themes: ['Nature', 'Food', 'Day trip'],
        coord: { lng: 144.319, lat: -37.388 },
      },
      {
        id: 'daylesford-town',
        name: 'Daylesford',
        driveTimeHours: 1.5,
        driveKm: 110,
        highlights: ['Convent Gallery and gardens', 'Lake Daylesford walk', 'Mineral springs (free, roadside)', 'Wombat Hill Botanic Gardens'],
        themes: ['Wellness', 'Art', 'Spa', 'Food'],
        coord: { lng: 144.143, lat: -37.344 },
      },
    ],
  },
  {
    id: 'dandenongs',
    name: 'Dandenong Ranges',
    tagline: 'Ancient fern gullies, a world-famous wildlife sanctuary, and very good coffee.',
    driveTimeRange: '45 min – 1 hr',
    themes: ['Rainforest', 'Cafes', 'Walking', 'Wildlife'],
    seasonalScores: { summer: 6, autumn: 8, winter: 7, spring: 9 },
    image: '🌿',
    gradientFrom: '#1a3a1a',
    gradientTo: '#2a5a2a',
    subDests: [
      {
        id: 'belgrave',
        name: 'Belgrave (Puffing Billy)',
        driveTimeHours: 0.75,
        driveKm: 42,
        highlights: ['Puffing Billy steam train to Gembrook', 'Sherbrooke Forest walk', 'Grants Picnic Ground (king parrots & cockatoos)', 'Mist over the ranges at dawn'],
        themes: ['Family', 'Walking', 'Wildlife'],
        coord: { lng: 145.355, lat: -37.902 },
      },
      {
        id: 'sassafras-olinda',
        name: 'Sassafras & Olinda',
        driveTimeHours: 0.9,
        driveKm: 50,
        highlights: ['Miss Marple\'s Tearoom (famous Devonshire tea)', 'Cloudehill Gardens', 'National Rhododendron Garden (Oct peak)', 'Hanging rock viewpoint'],
        themes: ['Cafes', 'Gardens', 'Scenic'],
        coord: { lng: 145.368, lat: -37.847 },
      },
      {
        id: 'healesville-wildlife',
        name: 'Healesville (Wildlife focus)',
        driveTimeHours: 1.0,
        driveKm: 65,
        highlights: ['Healesville Sanctuary — platypus, dingo, koala', 'Maroondah Reservoir Park', 'Rainforest Gallery at the sanctuary', 'Steels Creek picnic areas'],
        themes: ['Wildlife', 'Family', 'Nature'],
        coord: { lng: 145.520, lat: -37.654 },
      },
    ],
  },
  {
    id: 'phillip-island',
    name: 'Phillip Island',
    tagline: "The penguin parade at sunset. Surf beaches by day. One of Victoria's greats.",
    driveTimeRange: '1.5 – 2 hrs',
    themes: ['Wildlife', 'Beach', 'Surfing', 'Family'],
    seasonalScores: { summer: 9, autumn: 7, winter: 6, spring: 8 },
    image: '🐧',
    gradientFrom: '#0a2a4a',
    gradientTo: '#0a4a6a',
    subDests: [
      {
        id: 'san-remo',
        name: 'San Remo',
        driveTimeHours: 1.5,
        driveKm: 120,
        highlights: ['Fresh fish & chips at the pelican pontoon', 'Pelicans fed daily at noon', 'San Remo Hotel on the water', 'Gateway to Phillip Island bridge views'],
        themes: ['Food', 'Wildlife', 'Relaxation'],
        coord: { lng: 145.477, lat: -38.525 },
      },
      {
        id: 'cowes',
        name: 'Cowes',
        driveTimeHours: 1.8,
        driveKm: 140,
        highlights: ['Thompson Avenue cafes and restaurants', 'Cowes beach (calm, family-friendly)', 'Koala Conservation Reserve', 'Ferry to Stony Point (Mornington Peninsula)'],
        themes: ['Beach', 'Food', 'Family'],
        coord: { lng: 145.238, lat: -38.455 },
      },
      {
        id: 'penguin-parade',
        name: 'Penguin Parade & Nobbies',
        driveTimeHours: 2.0,
        driveKm: 145,
        highlights: ['Little penguin parade (nightly at dusk)', 'Nobbies Centre and fur seal viewing', 'Boardwalk over rugged coastal landscape', 'Sunset at Cape Woolamai (surf beach)'],
        themes: ['Wildlife', 'Coastal', 'Iconic'],
        coord: { lng: 144.998, lat: -38.515 },
      },
    ],
  },
  {
    id: 'great-ocean-road',
    name: 'Great Ocean Road',
    tagline: 'Choose your stop — each is a different trip entirely. Torquay is 1.5 hrs, the Apostles are 3.5.',
    driveTimeRange: '1.5 – 3.5 hrs',
    themes: ['Coastal', 'Cliffs', 'Surf', 'Rainforest'],
    seasonalScores: { summer: 8, autumn: 8, winter: 7, spring: 9 },
    image: '🌊',
    gradientFrom: '#0c3460',
    gradientTo: '#0b5e47',
    subDests: [
      {
        id: 'torquay',
        name: 'Torquay & Bells Beach',
        driveTimeHours: 1.3,
        driveKm: 95,
        highlights: ['Bells Beach — world-famous surf break', 'Surf World Museum', 'Point Addis coastal walk', 'Jan Juc rock pools'],
        themes: ['Surf', 'Beach', 'Walking'],
        coord: { lng: 144.319, lat: -38.335 },
      },
      {
        id: 'lorne',
        name: 'Lorne',
        driveTimeHours: 1.8,
        driveKm: 140,
        highlights: ['Erskine Falls (30-min walk)', 'Lorne Beach and pier', 'Great Ocean Road Chocolaterie', 'Kafe Kahlua and Lorne Hotel'],
        themes: ['Beach', 'Waterfalls', 'Food'],
        coord: { lng: 143.980, lat: -38.541 },
      },
      {
        id: 'apollo-bay',
        name: 'Apollo Bay',
        driveTimeHours: 2.3,
        driveKm: 190,
        highlights: ['Apollo Bay foreshore market (Sat morning)', 'Mariners Lookout walk (45 min return)', 'Wild Dog Road — rainforest detour to Otways', 'Fresh crayfish at the harbour'],
        themes: ['Food', 'Rainforest', 'Coastal'],
        coord: { lng: 143.672, lat: -38.759 },
      },
      {
        id: 'great-otway',
        name: 'Great Otway National Park',
        driveTimeHours: 2.5,
        driveKm: 210,
        highlights: ['Triplet Falls — ancient temperate rainforest', 'Cape Otway Lighthouse (oldest on mainland)', 'Koalas wild in the roadside gums', 'Aire River camping ground'],
        themes: ['Rainforest', 'Wildlife', 'Lighthouse', 'Hiking'],
        coord: { lng: 143.550, lat: -38.868 },
      },
      {
        id: 'twelve-apostles',
        name: 'Port Campbell & 12 Apostles',
        driveTimeHours: 3.5,
        driveKm: 275,
        highlights: ['Twelve Apostles at sunrise or golden hour', 'Loch Ard Gorge — shipwreck history and beach', 'The Arch and London Bridge rock stacks', 'Overnight in Port Campbell township'],
        themes: ['Iconic', 'Coastal', 'Photography'],
        coord: { lng: 142.996, lat: -38.663 },
      },
    ],
  },
  {
    id: 'grampians',
    name: 'Grampians (Gariwerd)',
    tagline: 'Wildflowers, ancient rock art, kangaroos, and hikes with views that earn them.',
    driveTimeRange: '3 – 3.5 hrs',
    themes: ['Hiking', 'Wildlife', 'Wildflowers', 'Camping'],
    seasonalScores: { summer: 5, autumn: 7, winter: 6, spring: 10 },
    image: '🌸',
    gradientFrom: '#3a1a5a',
    gradientTo: '#5a3a2a',
    subDests: [
      {
        id: 'halls-gap',
        name: 'Halls Gap',
        driveTimeHours: 3.0,
        driveKm: 235,
        highlights: ['Kangaroos on the oval at dawn', 'Silverband Falls walk (easy, 30 min)', 'Halls Gap Zoo', 'Base for all Grampians hikes'],
        themes: ['Wildlife', 'Hiking', 'Base camp'],
        coord: { lng: 142.518, lat: -37.138 },
      },
      {
        id: 'boroka-pinnacle',
        name: 'Boroka & The Pinnacle',
        driveTimeHours: 3.2,
        driveKm: 240,
        highlights: ['Boroka Lookout — best panoramic view in the Grampians', 'The Pinnacle hike (2 hrs return, moderate)', 'Reid Lookout and The Balconies (easy walk)', 'Wildflowers Sep–Nov'],
        themes: ['Hiking', 'Views', 'Wildflowers'],
        coord: { lng: 142.531, lat: -37.207 },
      },
      {
        id: 'dunkeld',
        name: 'Dunkeld',
        driveTimeHours: 3.5,
        driveKm: 260,
        highlights: ['Royal Mail Hotel — best regional restaurant in VIC', 'Mount Sturgeon and Mount Abrupt hikes', 'Southern Grampians visitor centre', 'Kangaroos and emus at the foothills'],
        themes: ['Dining', 'Hiking', 'Wildlife'],
        coord: { lng: 142.362, lat: -37.653 },
      },
    ],
  },
  {
    id: 'bright-alpine',
    name: 'Bright & Alpine',
    tagline: 'Famous autumn colours, ski villages in winter, and cycling trails all year.',
    driveTimeRange: '3 – 4.5 hrs',
    themes: ['Autumn colours', 'Skiing', 'Cycling', 'Villages'],
    seasonalScores: { summer: 7, autumn: 10, winter: 9, spring: 7 },
    image: '🍂',
    gradientFrom: '#7c2d12',
    gradientTo: '#c2410c',
    subDests: [
      {
        id: 'beechworth',
        name: 'Beechworth',
        driveTimeHours: 3.0,
        driveKm: 270,
        highlights: ['Beechworth Honey (museum + tasting)', 'Historic granite precinct (gold rush era)', 'Bridge Road Brewers', 'Ned Kelly was tried here — courthouse still standing'],
        themes: ['History', 'Food', 'Craft beer'],
        coord: { lng: 146.688, lat: -36.357 },
      },
      {
        id: 'bright-town',
        name: 'Bright',
        driveTimeHours: 3.5,
        driveKm: 320,
        highlights: ['Ovens River walk — peak autumn colour May', 'Canyon Brewery and Eatery', 'Mystic Mountains cycling trails', 'Hang gliding and paragliding launch site'],
        themes: ['Autumn colours', 'Cycling', 'Food'],
        coord: { lng: 146.957, lat: -36.727 },
      },
      {
        id: 'falls-creek',
        name: 'Falls Creek',
        driveTimeHours: 4.5,
        driveKm: 380,
        highlights: ['Ski-in ski-out village (Jun–Sep)', 'Snowshoe and cross-country trails', 'Falls Creek walking tracks in summer', 'Village square — good food year-round'],
        themes: ['Skiing', 'Snow', 'Village'],
        coord: { lng: 147.274, lat: -36.863 },
      },
    ],
  },
  {
    id: 'ballarat',
    name: 'Ballarat & Goldfields',
    tagline: 'Gold rush history, incredible bakeries, and galleries that surprise you.',
    driveTimeRange: '1.5 hrs',
    themes: ['History', 'Food', 'Art', 'Family'],
    seasonalScores: { summer: 6, autumn: 7, winter: 7, spring: 7 },
    image: '⚙️',
    gradientFrom: '#3a2a0a',
    gradientTo: '#6a4a1a',
    subDests: [
      {
        id: 'sovereign-hill',
        name: 'Sovereign Hill',
        driveTimeHours: 1.5,
        driveKm: 115,
        highlights: ['Living history gold rush precinct', 'Pan for real gold', 'Underground mine tour', 'Blood on the Southern Cross night show'],
        themes: ['History', 'Family', 'Immersive'],
        coord: { lng: 143.839, lat: -37.574 },
      },
      {
        id: 'ballarat-town',
        name: 'Ballarat CBD',
        driveTimeHours: 1.5,
        driveKm: 115,
        highlights: ['Art Gallery of Ballarat — best regional gallery in VIC', 'Lydiard Street heritage architecture', 'The Mill Markets (massive antiques)', 'Lake Wendouree parklands'],
        themes: ['Art', 'History', 'Food'],
        coord: { lng: 143.864, lat: -37.562 },
      },
      {
        id: 'clunes',
        name: 'Clunes',
        driveTimeHours: 1.8,
        driveKm: 140,
        highlights: ['Clunes Booktown Festival (May)', 'Intact 1850s goldfield streetscape', 'Cornish Hill walking track', 'Clunes Museum — first place gold found in VIC'],
        themes: ['History', 'Books', 'Walking'],
        coord: { lng: 143.786, lat: -37.296 },
      },
    ],
  },
  {
    id: 'bendigo',
    name: 'Bendigo & Central Victoria',
    tagline: 'Elegant gold-era streetscapes, serious wineries, and Australia\'s best regional art gallery.',
    driveTimeRange: '1.5 – 2 hrs',
    themes: ['Wine', 'Art', 'History', 'Food'],
    seasonalScores: { summer: 5, autumn: 8, winter: 7, spring: 7 },
    image: '🏛️',
    gradientFrom: '#2a1a3a',
    gradientTo: '#4a2a5a',
    subDests: [
      {
        id: 'castlemaine',
        name: 'Castlemaine',
        driveTimeHours: 1.5,
        driveKm: 120,
        highlights: ['Castlemaine Art Museum (stunning heritage building)', 'The Taproom and Theatre Royal', 'Mount Alexander Fruit Gardens', 'Castlemaine Diggings National Heritage Park'],
        themes: ['Art', 'History', 'Food'],
        coord: { lng: 144.213, lat: -37.062 },
      },
      {
        id: 'maldon',
        name: 'Maldon',
        driveTimeHours: 1.7,
        driveKm: 145,
        highlights: ['Australia\'s first Notable Town (intact goldfields)', 'Victorian Goldfields Railway steam train', 'Mount Tarrangower lookout', 'Tea rooms and antique shops on Main St'],
        themes: ['History', 'Heritage', 'Scenic'],
        coord: { lng: 144.067, lat: -36.993 },
      },
      {
        id: 'bendigo-town',
        name: 'Bendigo',
        driveTimeHours: 1.8,
        driveKm: 150,
        highlights: ['Bendigo Art Gallery (major national exhibitions)', 'Central Deborah Gold Mine tour', 'Golden Dragon Museum', 'Rosalind Park and fountain'],
        themes: ['Art', 'History', 'Food'],
        coord: { lng: 144.280, lat: -36.758 },
      },
    ],
  },
  {
    id: 'wilsons-prom',
    name: "Wilson's Promontory",
    tagline: 'The southernmost point of mainland Australia — empty beaches, wombats, serious hiking.',
    driveTimeRange: '2.5 – 3 hrs',
    themes: ['Hiking', 'Camping', 'Wildlife', 'Beaches'],
    seasonalScores: { summer: 8, autumn: 7, winter: 5, spring: 9 },
    image: '🏕️',
    gradientFrom: '#0a3a2a',
    gradientTo: '#1a5a3a',
    subDests: [
      {
        id: 'fish-creek',
        name: 'Fish Creek',
        driveTimeHours: 2.3,
        driveKm: 180,
        highlights: ['Fish Creek Hotel (excellent pub food)', 'Rolling green South Gippsland hills', 'Waratah Bay and Sandy Point nearby', 'Gateway town for the Prom'],
        themes: ['Food', 'Scenic', 'Gateway'],
        coord: { lng: 146.086, lat: -38.687 },
      },
      {
        id: 'tidal-river',
        name: 'Tidal River',
        driveTimeHours: 2.8,
        driveKm: 230,
        highlights: ['Squeaky Beach — literally squeaks underfoot', 'Lilly Pilly Gully nature walk (2.5 hrs)', 'Wombats around campsites at dusk', 'Norman Beach — clear and calm swimming'],
        themes: ['Camping', 'Beaches', 'Wildlife', 'Hiking'],
        coord: { lng: 146.316, lat: -38.984 },
      },
      {
        id: 'wilsons-lighthouse',
        name: 'South Point & Lighthouse',
        driveTimeHours: 3.5,
        driveKm: 250,
        highlights: ['Southernmost point of mainland Australia', 'Lighthouse overnight stays (book ahead)', 'Waterloo Bay — wild and remote', 'Multi-day Great Prom Walk'],
        themes: ['Hiking', 'Remote', 'Iconic'],
        coord: { lng: 146.380, lat: -39.136 },
      },
    ],
  },
  {
    id: 'east-gippsland',
    name: 'East Gippsland & Lakes',
    tagline: 'The Gippsland Lakes, ancient rainforest, and 90 Mile Beach — entirely off the tourist trail.',
    driveTimeRange: '3 – 4 hrs',
    themes: ['Lakes', 'Fishing', 'Wilderness', 'Kayaking'],
    seasonalScores: { summer: 9, autumn: 7, winter: 5, spring: 7 },
    image: '🛶',
    gradientFrom: '#0a2a4a',
    gradientTo: '#1a4a3a',
    subDests: [
      {
        id: 'bairnsdale',
        name: 'Bairnsdale & Paynesville',
        driveTimeHours: 3.0,
        driveKm: 280,
        highlights: ['St Mary\'s Church murals (the Sistine Chapel of Gippsland)', 'Paynesville waterfront dining', 'Raymond Island koala colony (free ferry)', 'Gippsland Lakes Coastal Park'],
        themes: ['Culture', 'Wildlife', 'Waterfront'],
        coord: { lng: 147.607, lat: -37.830 },
      },
      {
        id: 'lakes-entrance',
        name: 'Lakes Entrance',
        driveTimeHours: 3.5,
        driveKm: 320,
        highlights: ['Footbridge over the entrance to Ninety Mile Beach', 'Metung — relaxed village on the lake', 'Houseboat hire on the Gippsland Lakes', 'Fresh oysters at the Fishermen\'s Co-op'],
        themes: ['Lakes', 'Food', 'Boating'],
        coord: { lng: 147.980, lat: -37.881 },
      },
      {
        id: 'errinundra',
        name: 'Errinundra Plateau',
        driveTimeHours: 4.0,
        driveKm: 390,
        highlights: ['Oldest cool-temperate rainforest in Victoria', 'Big Tree — a 300-yr mountain ash', 'Adams Creek walk through cathedral-like ferns', 'Virtually no other tourists'],
        themes: ['Rainforest', 'Remote', 'Nature'],
        coord: { lng: 148.840, lat: -37.435 },
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

// ── Discovery matching ────────────────────────────────────────────

export type TripInterest =
  | 'Wildlife'
  | 'Beach'
  | 'Wine'
  | 'Hiking'
  | 'HotSprings'
  | 'History'
  | 'Food'
  | 'Relaxation'
  | 'FamilyFun'
  | 'Adventure'
  | 'Scenic'

// Which cluster/sub themes each interest matches against
const INTEREST_THEMES: Record<TripInterest, string[]> = {
  Wildlife:    ['Wildlife', 'Nature', 'Family'],
  Beach:       ['Beach', 'Coastal', 'Surf', 'Swimming'],
  Wine:        ['Wine', 'Cellar doors', 'Wineries'],
  Hiking:      ['Hiking', 'Walking', 'Trails', 'Nature', 'Remote'],
  HotSprings:  ['Hot springs', 'Wellness', 'Spa', 'Relaxation'],
  History:     ['History', 'Heritage', 'Historic'],
  Food:        ['Food', 'Cafes', 'Bakeries', 'Dining', 'Markets'],
  Relaxation:  ['Relaxation', 'Wellness', 'Spa', 'Chilling', 'Day trip'],
  FamilyFun:   ['Family', 'Wildlife', 'Interactive', 'Family attractions'],
  Adventure:   ['Adventure', 'Cycling', 'Surf', 'Remote'],
  Scenic:      ['Scenic', 'Lookouts', 'Views', 'Coastal', 'Iconic'],
}

export interface MatchedDest {
  sub: SubDest
  cluster: VicCluster
  score: number
  matchReasons: string[]  // why we picked it (shown to user)
}

export function matchDestinations(opts: {
  maxDriveHours: number
  interests: TripInterest[]
  hasKids: boolean
  isOvernight: boolean
  season: Season
}): MatchedDest[] {
  const { maxDriveHours, interests, hasKids, isOvernight, season } = opts
  const results: MatchedDest[] = []

  for (const cluster of VICTORIAN_CLUSTERS) {
    const seasonScore = cluster.seasonalScores[season]

    for (const sub of cluster.subDests) {
      // Hard filter: must be within drive time limit
      // For overnight trips we allow up to 30% more than the day-trip limit
      const effectiveMax = isOvernight ? maxDriveHours * 1.3 : maxDriveHours
      if (sub.driveTimeHours > effectiveMax) continue

      // Score it
      let score = 0
      const matchReasons: string[] = []

      // Seasonal fit
      score += seasonScore * 3
      if (seasonScore >= 9) matchReasons.push(`Perfect for ${season}`)
      else if (seasonScore >= 7) matchReasons.push(`Great in ${season}`)

      // Activity match — check both cluster and sub themes
      const allThemes = [...cluster.themes, ...sub.themes].map((t) => t.toLowerCase())
      let activityMatches = 0
      for (const interest of interests) {
        const matched = INTEREST_THEMES[interest].some((t) =>
          allThemes.some((at) => at.includes(t.toLowerCase()))
        )
        if (matched) {
          score += 10
          activityMatches++
        }
      }
      if (activityMatches >= 2) matchReasons.push(`Matches your interests`)
      else if (activityMatches === 1) matchReasons.push(`Has what you're after`)

      // Kids bonus
      if (hasKids) {
        const kidsThemes = ['wildlife', 'family', 'beach', 'history', 'nature']
        const kidsMatch = allThemes.some((t) => kidsThemes.some((k) => t.includes(k)))
        if (kidsMatch) { score += 12; matchReasons.push('Great for kids') }
      }

      // Drive-time sweet spot: reward trips that feel like a real getaway
      // (at least 60% of max drive time, otherwise it barely counts)
      const ratio = sub.driveTimeHours / effectiveMax
      if (ratio >= 0.6) score += 8
      else if (ratio >= 0.3) score += 3

      // Overnight reward: further destinations score better for multi-night
      if (isOvernight && sub.driveTimeHours >= 2) score += 5

      results.push({ sub, cluster, score, matchReasons })
    }
  }

  // Sort by score desc, deduplicate (keep best sub per cluster to avoid flooding)
  const seen = new Set<string>()
  return results
    .sort((a, b) => b.score - a.score)
    .filter(({ cluster }) => {
      if (seen.has(cluster.id)) return false
      seen.add(cluster.id)
      return true
    })
    .slice(0, 6)
}
