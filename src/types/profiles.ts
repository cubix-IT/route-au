export type VibeTag =
  | 'Hiking'
  | 'Chilling'
  | 'Lookouts'
  | 'History'
  | 'Wildlife'
  | 'Stargazing'
  | 'Photography'
  | 'Beach'

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

export interface UserProfile {
  id: string
  max_daily_drive_time: number
  preferred_vibe: VibeTag[]
  accommodation_preference: AccommodationPreference
  off_grid_capability: {
    water_capacity_liters: number
    auxiliary_battery_days: number
  }
  party_size: number
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
