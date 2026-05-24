import type { Route, Waypoint } from './routing'
import type { ScoredPOI } from './poi'

export type GuardrailSeverity = 'WARNING' | 'NOTICE' | 'MANDATORY_STOP'
export type GuardrailType =
  | 'WILDLIFE_CROSSING'
  | 'STINGER_SEASON'
  | 'FUEL_GAP'
  | 'ROAD_CONDITION'
  | 'EXTREME_HEAT'
  | 'FLASH_FLOOD'

export interface GuardrailWarning {
  id: string
  type: GuardrailType
  severity: GuardrailSeverity
  message: string
  affected_segment_id?: string
  injected_waypoint?: Waypoint
}

export interface DayWeather {
  temp_max_c: number
  temp_min_c: number
  precipitation_probability: number
  description: string
}

export interface CampSite {
  id: string
  name: string
  type: 'FreeCamping' | 'CaravanPark' | 'Glamping'
  coord: { lng: number; lat: number }
  cost_aud_per_night: number
  has_water: boolean
  has_power: boolean
  notes?: string
}

export interface ItineraryDay {
  day_number: number
  date: string
  waypoints: Waypoint[]
  pois: ScoredPOI[]
  drive_km: number
  drive_hours: number
  weather?: DayWeather
  warnings: GuardrailWarning[]
  overnight_camp?: CampSite
}

export interface Itinerary {
  id: string
  name: string
  start_date: string
  route: Route
  days: ItineraryDay[]
  all_warnings: GuardrailWarning[]
}
