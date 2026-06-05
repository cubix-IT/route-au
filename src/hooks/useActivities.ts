import { getActivitiesForSubDest } from '@/data/victorianActivities.ts'
import type { Activity } from '@/data/victorianActivities.ts'

interface UseActivitiesResult {
  activities: Activity[]
  status: 'ready'
}

// Returns ONLY hand-curated static activities from victorianActivities.ts.
// Google-enriched activities come through usePlannerData → d.dbActivities (proximity query).
// Keeping these separate eliminates the duplicate data pipeline that was causing
// the same place to appear twice (once from api/activities, once from proximity query).
export function useActivities(subDestId: string): UseActivitiesResult {
  return { activities: getActivitiesForSubDest(subDestId), status: 'ready' }
}
