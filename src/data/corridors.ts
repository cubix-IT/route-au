import type { CorridorSegment } from '@/types'

export const CORRIDORS: CorridorSegment[] = [
  {
    id: 'great-ocean-road',
    name: 'Great Ocean Road',
    state: 'VIC',
    road_surface: 'Sealed',
    requires_4wd: false,
    max_vehicle_height_meters: 4.5,
    approximate_length_km: 243,
    scenic_rating: 10,
    dark_sky_rating: 5,
    is_tropical_north: false,
    bounding_polygon: [
      { lng: 143.30, lat: -38.75 },
      { lng: 144.40, lat: -38.75 },
      { lng: 144.40, lat: -38.20 },
      { lng: 143.30, lat: -38.20 },
    ],
    path_coordinates: [
      { lng: 144.319, lat: -38.335 }, // Torquay
      { lng: 144.059, lat: -38.466 }, // Lorne
      { lng: 143.800, lat: -38.570 }, // Apollo Bay
      { lng: 143.391, lat: -38.678 }, // Princetown (12 Apostles)
    ],
  },
  {
    id: 'grand-pacific-drive',
    name: 'Grand Pacific Drive',
    state: 'NSW',
    road_surface: 'Sealed',
    requires_4wd: false,
    max_vehicle_height_meters: 4.5,
    approximate_length_km: 140,
    scenic_rating: 9,
    dark_sky_rating: 3,
    is_tropical_north: false,
    bounding_polygon: [
      { lng: 150.80, lat: -35.00 },
      { lng: 151.15, lat: -35.00 },
      { lng: 151.15, lat: -34.35 },
      { lng: 150.80, lat: -34.35 },
    ],
    path_coordinates: [
      { lng: 150.889, lat: -34.424 }, // Royal National Park
      { lng: 150.867, lat: -34.603 }, // Sea Cliff Bridge
      { lng: 150.877, lat: -34.677 }, // Thirroul
      { lng: 150.897, lat: -34.904 }, // Wollongong
    ],
  },
  {
    id: 'explorers-way',
    name: "Explorer's Way (Stuart Hwy)",
    state: 'SA/NT',
    road_surface: 'Sealed',
    requires_4wd: false,
    max_vehicle_height_meters: 5.0,
    approximate_length_km: 2834,
    scenic_rating: 8,
    dark_sky_rating: 10,
    is_tropical_north: true,
    bounding_polygon: [
      { lng: 133.00, lat: -35.00 },
      { lng: 139.00, lat: -35.00 },
      { lng: 139.00, lat: -12.00 },
      { lng: 133.00, lat: -12.00 },
    ],
    path_coordinates: [
      { lng: 138.600, lat: -34.929 }, // Adelaide
      { lng: 136.484, lat: -31.492 }, // Port Augusta
      { lng: 134.754, lat: -29.014 }, // Coober Pedy
      { lng: 133.622, lat: -27.303 }, // Marla
      { lng: 133.251, lat: -25.218 }, // Erldunda
      { lng: 133.872, lat: -23.698 }, // Alice Springs
      { lng: 134.188, lat: -19.652 }, // Tennant Creek
      { lng: 132.262, lat: -14.465 }, // Katherine
      { lng: 130.846, lat: -12.462 }, // Darwin
    ],
  },
  {
    id: 'gibb-river-road',
    name: 'Gibb River Road',
    state: 'WA',
    road_surface: '4WD_Only',
    requires_4wd: true,
    max_vehicle_height_meters: 3.5,
    approximate_length_km: 660,
    scenic_rating: 10,
    dark_sky_rating: 10,
    is_tropical_north: true,
    bounding_polygon: [
      { lng: 125.00, lat: -17.50 },
      { lng: 129.00, lat: -17.50 },
      { lng: 129.00, lat: -15.50 },
      { lng: 125.00, lat: -15.50 },
    ],
    path_coordinates: [
      { lng: 128.640, lat: -15.773 }, // Wyndham
      { lng: 127.660, lat: -16.460 }, // Manning Gorge
      { lng: 126.580, lat: -16.890 }, // Mornington Wilderness Camp
      { lng: 125.558, lat: -17.148 }, // Derby
    ],
  },
  {
    id: 'savannah-way',
    name: 'Savannah Way',
    state: 'QLD/NT/WA',
    road_surface: 'Gravel',
    requires_4wd: false,
    max_vehicle_height_meters: 4.2,
    approximate_length_km: 3700,
    scenic_rating: 9,
    dark_sky_rating: 9,
    is_tropical_north: true,
    bounding_polygon: [
      { lng: 128.50, lat: -20.00 },
      { lng: 146.00, lat: -20.00 },
      { lng: 146.00, lat: -14.00 },
      { lng: 128.50, lat: -14.00 },
    ],
    path_coordinates: [
      { lng: 145.771, lat: -17.286 }, // Cairns
      { lng: 143.050, lat: -18.298 }, // Georgetown
      { lng: 140.516, lat: -18.634 }, // Burketown
      { lng: 139.492, lat: -17.677 }, // Borroloola
      { lng: 135.576, lat: -14.464 }, // Katherine
      { lng: 128.737, lat: -15.467 }, // Kununurra
    ],
  },
  {
    id: 'oodnadatta-track',
    name: 'Oodnadatta Track',
    state: 'SA',
    road_surface: 'Dirt',
    requires_4wd: false,
    max_vehicle_height_meters: 4.5,
    approximate_length_km: 620,
    scenic_rating: 9,
    dark_sky_rating: 10,
    is_tropical_north: false,
    bounding_polygon: [
      { lng: 134.00, lat: -30.00 },
      { lng: 138.00, lat: -30.00 },
      { lng: 138.00, lat: -26.50 },
      { lng: 134.00, lat: -26.50 },
    ],
    path_coordinates: [
      { lng: 136.484, lat: -31.492 }, // Port Augusta (start)
      { lng: 136.068, lat: -29.635 }, // Lyndhurst
      { lng: 135.444, lat: -28.740 }, // Marree
      { lng: 135.421, lat: -27.565 }, // William Creek
      { lng: 135.452, lat: -27.553 }, // Oodnadatta
      { lng: 134.754, lat: -29.014 }, // Coober Pedy (end)
    ],
  },
  {
    id: 'alpine-way',
    name: 'Alpine Way',
    state: 'NSW/VIC',
    road_surface: 'Sealed',
    requires_4wd: false,
    max_vehicle_height_meters: 4.5,
    approximate_length_km: 180,
    scenic_rating: 8,
    dark_sky_rating: 7,
    is_tropical_north: false,
    bounding_polygon: [
      { lng: 147.00, lat: -37.00 },
      { lng: 148.50, lat: -37.00 },
      { lng: 148.50, lat: -36.00 },
      { lng: 147.00, lat: -36.00 },
    ],
    path_coordinates: [
      { lng: 147.367, lat: -36.138 }, // Albury (start)
      { lng: 147.862, lat: -36.494 }, // Khancoban
      { lng: 148.258, lat: -36.423 }, // Thredbo Village
      { lng: 148.292, lat: -36.401 }, // Charlotte Pass
    ],
  },
]
