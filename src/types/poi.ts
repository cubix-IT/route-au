import type { VibeTag } from './profiles'
import type { Coordinate } from './routing'

export type PoiCategory =
  | 'Hiking'
  | 'Chilling'
  | 'Lookouts'
  | 'Photography'
  | 'FreeCamping'
  | 'History'

export interface POI {
  id: string
  name: string
  category: PoiCategory
  vibe_tags: VibeTag[]
  coord: Coordinate
  description: string
  is_tropical_north: boolean
  requires_4wd: boolean
  dark_sky_rating?: number
  permit_required?: boolean
  permit_url?: string
  entry_fee_aud?: number
  accessibility_notes?: string
}

export interface ScoredPOI extends POI {
  vibe_score: number
  distance_from_route_km: number
  detour_km: number
}
