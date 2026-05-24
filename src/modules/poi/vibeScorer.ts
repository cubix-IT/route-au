import type { POI, UserProfile } from '@/types'

export function scorePoiVibe(poi: POI, userProfile: UserProfile): number {
  let score = 0

  const matchedTags = poi.vibe_tags.filter((tag) => userProfile.preferred_vibe.includes(tag))
  score += matchedTags.length * 30

  // Stargazing bonus for dark sky POIs
  if (userProfile.preferred_vibe.includes('Stargazing') && (poi.dark_sky_rating ?? 0) >= 8) {
    score += 20
  }

  // Off-grid capability affects remote POI scores
  const hasOffGrid = userProfile.off_grid_capability.water_capacity_liters > 0

  if (poi.requires_4wd) {
    score += hasOffGrid ? 10 : -40
  }

  // Accommodation match bonus for camping POIs
  if (
    poi.category === 'FreeCamping' &&
    userProfile.accommodation_preference === 'FreeCamping'
  ) {
    score += 15
  }

  return Math.min(100, Math.max(0, score))
}
