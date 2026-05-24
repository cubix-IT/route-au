import type { VehicleType } from './profiles'

export type TrackCondition = 'Good' | 'Fair' | 'Poor' | 'Impassable'

export interface TripReport {
  id: string
  segment_id: string
  segment_name: string
  reporter_vehicle_type: VehicleType
  condition: TrackCondition
  notes: string
  reported_at: string
  reporter_name?: string
}

export interface NewTripReport
  extends Omit<TripReport, 'id' | 'reported_at'> {}
