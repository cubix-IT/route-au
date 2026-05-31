// Types only — static activity data removed.
// All activities come from Google Places API via the enrichment cron.
// See api/cron/enrich.ts and usePlannerData.ts → d.dbActivities.

export type ActivityCategory =
  | 'nature'
  | 'wildlife'
  | 'food'
  | 'drink'
  | 'history'
  | 'art'
  | 'family'
  | 'active'
  | 'relaxation'
  | 'markets'
  | 'viewpoint'
  | 'beach'
  | 'wellness'
  | 'entertainment'
  | 'sports'
  | 'shopping'

export interface OpenHoursPeriod {
  open: { day: number; hour: number; minute: number }
  close?: { day: number; hour: number; minute: number }
}

export interface Activity {
  id: string
  name: string
  category: ActivityCategory
  emoji: string
  description: string
  duration: string
  cost: 'free' | '$' | '$$' | '$$$'
  kidsOk: boolean
  isHiddenGem: boolean
  mapsUrl: string
  tags: string[]
  websiteUri?: string
  editorialSummary?: string
  openingHoursPeriods?: OpenHoursPeriod[]
  rating?: number
  reviewCount?: number
}

export interface SubDestActivities {
  subDestId: string
  activities: Activity[]
}

// Returns empty — all activity data comes from Google Places API
export function getActivitiesForSubDest(_subDestId: string): Activity[] { return [] }
export function getHiddenGems(_subDestId: string): Activity[] { return [] }
export function getActivitiesForKids(_subDestId: string): Activity[] { return [] }
export function filterActivitiesByTags(_subDestId: string, _tags: string[]): Activity[] { return [] }
