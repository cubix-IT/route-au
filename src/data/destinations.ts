import type { Coordinate } from '@/types'

export interface Destination {
  id: string
  name: string
  state: string
  coord: Coordinate
  type: 'city' | 'town' | 'landmark' | 'national_park' | 'beach' | 'region'
  popular_routes?: string[]
}

export const DESTINATIONS: Destination[] = [
  // Victoria
  { id: 'melbourne', name: 'Melbourne', state: 'VIC', coord: { lng: 144.963, lat: -37.814 }, type: 'city', popular_routes: ['great-ocean-road', 'alpine-way'] },
  { id: 'geelong', name: 'Geelong', state: 'VIC', coord: { lng: 144.355, lat: -38.147 }, type: 'city' },
  { id: 'torquay', name: 'Torquay', state: 'VIC', coord: { lng: 144.319, lat: -38.335 }, type: 'town', popular_routes: ['great-ocean-road'] },
  { id: 'lorne', name: 'Lorne', state: 'VIC', coord: { lng: 143.980, lat: -38.541 }, type: 'town', popular_routes: ['great-ocean-road'] },
  { id: 'apollo-bay', name: 'Apollo Bay', state: 'VIC', coord: { lng: 143.672, lat: -38.759 }, type: 'town', popular_routes: ['great-ocean-road'] },
  { id: 'port-campbell', name: 'Port Campbell', state: 'VIC', coord: { lng: 142.996, lat: -38.621 }, type: 'town', popular_routes: ['great-ocean-road'] },
  { id: 'warrnambool', name: 'Warrnambool', state: 'VIC', coord: { lng: 142.486, lat: -38.383 }, type: 'city', popular_routes: ['great-ocean-road'] },
  { id: 'ballarat', name: 'Ballarat', state: 'VIC', coord: { lng: 143.864, lat: -37.562 }, type: 'city' },
  { id: 'bendigo', name: 'Bendigo', state: 'VIC', coord: { lng: 144.280, lat: -36.758 }, type: 'city' },
  { id: 'bright', name: 'Bright', state: 'VIC', coord: { lng: 146.957, lat: -36.727 }, type: 'town' },
  { id: 'lakes-entrance', name: 'Lakes Entrance', state: 'VIC', coord: { lng: 147.980, lat: -37.881 }, type: 'town' },
  { id: 'wilsons-prom', name: "Wilson's Promontory", state: 'VIC', coord: { lng: 146.379, lat: -38.977 }, type: 'national_park' },
  { id: 'grampians', name: 'The Grampians (Gariwerd)', state: 'VIC', coord: { lng: 142.526, lat: -37.139 }, type: 'national_park' },
  { id: 'twelve-apostles', name: '12 Apostles', state: 'VIC', coord: { lng: 143.104, lat: -38.663 }, type: 'landmark', popular_routes: ['great-ocean-road'] },

  // New South Wales
  { id: 'sydney', name: 'Sydney', state: 'NSW', coord: { lng: 151.209, lat: -33.868 }, type: 'city', popular_routes: ['grand-pacific-drive'] },
  { id: 'wollongong', name: 'Wollongong', state: 'NSW', coord: { lng: 150.897, lat: -34.424 }, type: 'city', popular_routes: ['grand-pacific-drive'] },
  { id: 'kiama', name: 'Kiama', state: 'NSW', coord: { lng: 150.854, lat: -34.671 }, type: 'town', popular_routes: ['grand-pacific-drive'] },
  { id: 'berry', name: 'Berry', state: 'NSW', coord: { lng: 150.697, lat: -34.774 }, type: 'town' },
  { id: 'jervis-bay', name: 'Jervis Bay', state: 'NSW', coord: { lng: 150.744, lat: -35.105 }, type: 'national_park' },
  { id: 'ulladulla', name: 'Ulladulla', state: 'NSW', coord: { lng: 150.478, lat: -35.352 }, type: 'town' },
  { id: 'batemans-bay', name: "Batemans Bay", state: 'NSW', coord: { lng: 150.175, lat: -35.709 }, type: 'town' },
  { id: 'merimbula', name: 'Merimbula', state: 'NSW', coord: { lng: 149.901, lat: -36.888 }, type: 'town' },
  { id: 'eden', name: 'Eden', state: 'NSW', coord: { lng: 149.906, lat: -37.073 }, type: 'town' },
  { id: 'byron-bay', name: 'Byron Bay', state: 'NSW', coord: { lng: 153.621, lat: -28.643 }, type: 'town' },
  { id: 'port-macquarie', name: 'Port Macquarie', state: 'NSW', coord: { lng: 152.908, lat: -31.431 }, type: 'city' },
  { id: 'coffs-harbour', name: 'Coffs Harbour', state: 'NSW', coord: { lng: 153.115, lat: -30.296 }, type: 'city' },
  { id: 'blue-mountains', name: 'Blue Mountains', state: 'NSW', coord: { lng: 150.311, lat: -33.717 }, type: 'national_park' },
  { id: 'broken-hill', name: 'Broken Hill', state: 'NSW', coord: { lng: 141.468, lat: -31.956 }, type: 'city' },
  { id: 'canberra', name: 'Canberra', state: 'ACT', coord: { lng: 149.130, lat: -35.280 }, type: 'city' },
  { id: 'sea-cliff-bridge', name: 'Sea Cliff Bridge', state: 'NSW', coord: { lng: 150.867, lat: -34.603 }, type: 'landmark', popular_routes: ['grand-pacific-drive'] },

  // Queensland
  { id: 'brisbane', name: 'Brisbane', state: 'QLD', coord: { lng: 153.026, lat: -27.470 }, type: 'city' },
  { id: 'gold-coast', name: 'Gold Coast', state: 'QLD', coord: { lng: 153.431, lat: -28.016 }, type: 'city' },
  { id: 'sunshine-coast', name: 'Sunshine Coast', state: 'QLD', coord: { lng: 153.089, lat: -26.652 }, type: 'region' },
  { id: 'noosa', name: 'Noosa Heads', state: 'QLD', coord: { lng: 153.094, lat: -26.394 }, type: 'town' },
  { id: 'rainbow-beach', name: 'Rainbow Beach', state: 'QLD', coord: { lng: 153.089, lat: -25.905 }, type: 'town' },
  { id: 'fraser-island', name: "Fraser Island (K'gari)", state: 'QLD', coord: { lng: 153.222, lat: -25.253 }, type: 'national_park' },
  { id: 'airlie-beach', name: 'Airlie Beach', state: 'QLD', coord: { lng: 148.717, lat: -20.267 }, type: 'town' },
  { id: 'townsville', name: 'Townsville', state: 'QLD', coord: { lng: 146.817, lat: -19.258 }, type: 'city' },
  { id: 'cairns', name: 'Cairns', state: 'QLD', coord: { lng: 145.771, lat: -16.921 }, type: 'city', popular_routes: ['savannah-way'] },
  { id: 'port-douglas', name: 'Port Douglas', state: 'QLD', coord: { lng: 145.464, lat: -16.486 }, type: 'town' },
  { id: 'mount-isa', name: 'Mount Isa', state: 'QLD', coord: { lng: 139.490, lat: -20.726 }, type: 'city' },
  { id: 'longreach', name: 'Longreach', state: 'QLD', coord: { lng: 144.250, lat: -23.441 }, type: 'town' },
  { id: 'whitsundays', name: 'Whitsunday Islands', state: 'QLD', coord: { lng: 148.939, lat: -20.275 }, type: 'national_park' },

  // South Australia
  { id: 'adelaide', name: 'Adelaide', state: 'SA', coord: { lng: 138.600, lat: -34.929 }, type: 'city', popular_routes: ['explorers-way', 'oodnadatta-track'] },
  { id: 'port-augusta', name: 'Port Augusta', state: 'SA', coord: { lng: 137.762, lat: -32.491 }, type: 'city', popular_routes: ['explorers-way'] },
  { id: 'coober-pedy', name: 'Coober Pedy', state: 'SA', coord: { lng: 134.754, lat: -29.014 }, type: 'town', popular_routes: ['explorers-way', 'oodnadatta-track'] },
  { id: 'kangaroo-island', name: 'Kangaroo Island', state: 'SA', coord: { lng: 136.541, lat: -35.774 }, type: 'region' },
  { id: 'barossa-valley', name: 'Barossa Valley', state: 'SA', coord: { lng: 138.943, lat: -34.506 }, type: 'region' },
  { id: 'flinders-ranges', name: 'Flinders Ranges', state: 'SA', coord: { lng: 138.707, lat: -31.416 }, type: 'national_park' },

  // Northern Territory
  { id: 'darwin', name: 'Darwin', state: 'NT', coord: { lng: 130.846, lat: -12.462 }, type: 'city', popular_routes: ['explorers-way', 'savannah-way'] },
  { id: 'alice-springs', name: 'Alice Springs', state: 'NT', coord: { lng: 133.872, lat: -23.698 }, type: 'city', popular_routes: ['explorers-way'] },
  { id: 'uluru', name: 'Uluru (Ayers Rock)', state: 'NT', coord: { lng: 131.036, lat: -25.345 }, type: 'landmark' },
  { id: 'kings-canyon', name: 'Kings Canyon', state: 'NT', coord: { lng: 131.567, lat: -24.258 }, type: 'national_park' },
  { id: 'kakadu', name: 'Kakadu National Park', state: 'NT', coord: { lng: 132.441, lat: -12.820 }, type: 'national_park' },
  { id: 'katherine', name: 'Katherine', state: 'NT', coord: { lng: 132.262, lat: -14.465 }, type: 'town', popular_routes: ['savannah-way'] },
  { id: 'tennant-creek', name: 'Tennant Creek', state: 'NT', coord: { lng: 134.188, lat: -19.652 }, type: 'town', popular_routes: ['explorers-way'] },

  // Western Australia
  { id: 'perth', name: 'Perth', state: 'WA', coord: { lng: 115.861, lat: -31.950 }, type: 'city' },
  { id: 'margaret-river', name: 'Margaret River', state: 'WA', coord: { lng: 115.075, lat: -33.954 }, type: 'town' },
  { id: 'albany', name: 'Albany', state: 'WA', coord: { lng: 117.883, lat: -35.026 }, type: 'city' },
  { id: 'esperance', name: 'Esperance', state: 'WA', coord: { lng: 121.894, lat: -33.861 }, type: 'town' },
  { id: 'lucky-bay-wa', name: 'Lucky Bay', state: 'WA', coord: { lng: 122.232, lat: -33.981 }, type: 'beach' },
  { id: 'kalgoorlie', name: 'Kalgoorlie', state: 'WA', coord: { lng: 121.466, lat: -30.749 }, type: 'city' },
  { id: 'broome', name: 'Broome', state: 'WA', coord: { lng: 122.231, lat: -17.963 }, type: 'city', popular_routes: ['gibb-river-road'] },
  { id: 'kununurra', name: 'Kununurra', state: 'WA', coord: { lng: 128.737, lat: -15.467 }, type: 'city', popular_routes: ['gibb-river-road', 'savannah-way'] },
  { id: 'derby', name: 'Derby', state: 'WA', coord: { lng: 123.626, lat: -17.312 }, type: 'town', popular_routes: ['gibb-river-road'] },
  { id: 'exmouth', name: 'Exmouth', state: 'WA', coord: { lng: 114.126, lat: -21.932 }, type: 'town' },
  { id: 'monkey-mia', name: 'Monkey Mia', state: 'WA', coord: { lng: 113.720, lat: -25.793 }, type: 'landmark' },
  { id: 'kalbarri', name: 'Kalbarri', state: 'WA', coord: { lng: 114.164, lat: -27.706 }, type: 'town' },
  { id: 'bungle-bungles-dest', name: 'Bungle Bungles (Purnululu)', state: 'WA', coord: { lng: 128.400, lat: -17.482 }, type: 'national_park', popular_routes: ['gibb-river-road'] },

  // Tasmania
  { id: 'hobart', name: 'Hobart', state: 'TAS', coord: { lng: 147.327, lat: -42.883 }, type: 'city' },
  { id: 'launceston', name: 'Launceston', state: 'TAS', coord: { lng: 147.145, lat: -41.434 }, type: 'city' },
  { id: 'cradle-mountain', name: 'Cradle Mountain', state: 'TAS', coord: { lng: 145.950, lat: -41.636 }, type: 'national_park' },
  { id: 'freycinet', name: 'Freycinet NP (Wineglass Bay)', state: 'TAS', coord: { lng: 148.298, lat: -42.124 }, type: 'national_park' },
  { id: 'port-arthur', name: 'Port Arthur', state: 'TAS', coord: { lng: 147.864, lat: -43.146 }, type: 'landmark' },
]

export function searchDestinations(query: string): Destination[] {
  if (!query.trim()) return DESTINATIONS.slice(0, 8)
  const q = query.toLowerCase()
  return DESTINATIONS.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.state.toLowerCase().includes(q)
  ).slice(0, 8)
}

export function findDestinationById(id: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.id === id)
}

export const POPULAR_ROUTES: { from: string; to: string; label: string; corridor: string }[] = [
  { from: 'melbourne', to: 'twelve-apostles', label: 'Great Ocean Road', corridor: 'great-ocean-road' },
  { from: 'sydney', to: 'wollongong', label: 'Grand Pacific Drive', corridor: 'grand-pacific-drive' },
  { from: 'adelaide', to: 'darwin', label: "Explorer's Way", corridor: 'explorers-way' },
  { from: 'broome', to: 'kununurra', label: 'Gibb River Road', corridor: 'gibb-river-road' },
  { from: 'cairns', to: 'kununurra', label: 'Savannah Way', corridor: 'savannah-way' },
  { from: 'adelaide', to: 'coober-pedy', label: 'Oodnadatta Track', corridor: 'oodnadatta-track' },
]
