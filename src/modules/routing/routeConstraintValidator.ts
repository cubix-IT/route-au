import { CORRIDORS } from '@/data/corridors'
import type { Route, RouteConstraintViolation, VehicleProfile } from '@/types'

export function validateRouteConstraints(
  route: Route,
  vehicleProfile: VehicleProfile
): RouteConstraintViolation[] {
  const violations: RouteConstraintViolation[] = []
  const is4WD =
    vehicleProfile.type === 'HighClearance4WD' || vehicleProfile.type === '4WD_WithCaravan'

  for (const corridorId of route.corridor_ids) {
    const segment = CORRIDORS.find((c) => c.id === corridorId)
    if (!segment) continue

    if (segment.requires_4wd && !is4WD) {
      violations.push({
        segment_id: segment.id,
        segment_name: segment.name,
        reason: 'REQUIRES_4WD',
        detail: `${segment.name} requires a high-clearance 4WD. ${vehicleProfile.type} vehicles are not suitable and risk becoming bogged or damaged.`,
      })
    }

    if (
      segment.road_surface === '4WD_Only' &&
      vehicleProfile.type !== 'HighClearance4WD' &&
      vehicleProfile.type !== '4WD_WithCaravan'
    ) {
      if (!violations.some((v) => v.segment_id === segment.id && v.reason === 'REQUIRES_4WD')) {
        violations.push({
          segment_id: segment.id,
          segment_name: segment.name,
          reason: 'SURFACE_INCOMPATIBLE',
          detail: `${segment.name} is a 4WD-only track. Road surface is unsuitable for ${vehicleProfile.type}.`,
        })
      }
    }

    if (vehicleProfile.clearance_height_meters > 0 && vehicleProfile.clearance_height_meters < segment.max_vehicle_height_meters) {
      // Only flag if vehicle height exceeds clearance restrictions on this route
      // (segment max_vehicle_height_meters here means the vehicle must NOT exceed it)
      violations.push({
        segment_id: segment.id,
        segment_name: segment.name,
        reason: 'CLEARANCE_EXCEEDED',
        detail: `Vehicle height ${vehicleProfile.clearance_height_meters}m may exceed clearance restrictions on ${segment.name} (max: ${segment.max_vehicle_height_meters}m for low-clearance bridges or canopy restrictions).`,
      })
    }
  }

  return violations
}
