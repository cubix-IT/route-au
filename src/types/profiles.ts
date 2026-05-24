export type VibeTag =
  | 'Hiking'
  | 'Chilling'
  | 'Lookouts'
  | 'History'
  | 'Wildlife'
  | 'Stargazing'
  | 'Photography'
  | 'Beach'

export type HikingIntensity = 'Easy' | 'Moderate' | 'Hard' | 'Extreme'

export type DietaryReq =
  | 'Vegetarian'
  | 'Vegan'
  | 'GlutenFree'
  | 'Halal'
  | 'DairyFree'

export type AccommodationPreference =
  | 'FreeCamping'
  | 'CaravanPark'
  | 'Glamping'
  | 'Hotel'
  | 'Any'

export type VehicleType =
  | 'Sedan'
  | 'AWD'
  | 'HighClearance4WD'
  | '4WD_WithCaravan'
  | 'Electric'

export type FuelType = 'Unleaded95' | 'Unleaded98' | 'Diesel' | 'Electric'

export type TripType = 'day' | 'multiday'

export type CrewType = 'solo' | 'couple' | 'family' | 'group'

export type DiningPref =
  | 'Cafes'
  | 'LocalPubs'
  | 'Wineries'
  | 'FineDining'
  | 'Roadhouses'
  | 'SelfCatering'

export interface UserProfile {
  id: string
  max_daily_drive_time: number
  preferred_vibe: VibeTag[]
  hiking_intensity: HikingIntensity
  dietary_requirements: DietaryReq[]
  accommodation_preference: AccommodationPreference
  off_grid_capability: {
    water_capacity_liters: number
    auxiliary_battery_days: number
  }
  party_size: number
  trip_type: TripType
  crew_type: CrewType
  has_kids: boolean
  dining_prefs: DiningPref[]
}

export interface VehicleProfile {
  id: string
  type: VehicleType
  clearance_height_meters: number
  fuel_type: FuelType
  fuel_capacity_liters: number
  fuel_consumption_litres_per_100km: number
  is_towing: boolean
  ev_battery_capacity_kwh?: number
  ev_consumption_wh_per_km?: number
}
