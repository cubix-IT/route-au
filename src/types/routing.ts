export type RoadSurface = 'Sealed' | 'Gravel' | 'Dirt' | '4WD_Only'

export interface Coordinate {
  lng: number
  lat: number
}

export interface Waypoint {
  id: string
  label: string
  coord: Coordinate
  is_fuel_stop: boolean
  is_mandatory: boolean
  fuel_price_cpl?: number
  note?: string
}

export interface CorridorSegment {
  id: string
  name: string
  state: string
  road_surface: RoadSurface
  requires_4wd: boolean
  max_vehicle_height_meters: number
  bounding_polygon: Coordinate[]
  path_coordinates: Coordinate[]
  approximate_length_km: number
  is_tropical_north: boolean
  scenic_rating: number
  dark_sky_rating: number
}

export interface Route {
  id: string
  corridor_ids: string[]
  waypoints: Waypoint[]
  total_distance_km: number
  estimated_drive_hours: number
}

export interface RouteConstraintViolation {
  segment_id: string
  segment_name: string
  reason: 'REQUIRES_4WD' | 'CLEARANCE_EXCEEDED' | 'SURFACE_INCOMPATIBLE'
  detail: string
}
