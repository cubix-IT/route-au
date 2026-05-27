import { useState, useEffect } from 'react'
import { getActivitiesForSubDest } from '@/data/victorianActivities'
import type { Activity } from '@/data/victorianActivities'
import { supabaseEnabled } from '@/lib/supabase'

type Status = 'loading' | 'ready' | 'error'

interface UseActivitiesResult {
  activities: Activity[]
  status: Status
}

// Simple keyed cache: subDestId → activities
const cache = new Map<string, Activity[]>()

export function useActivities(subDestId: string): UseActivitiesResult {
  const staticData = getActivitiesForSubDest(subDestId)
  const [activities, setActivities] = useState<Activity[]>(
    cache.get(subDestId) ?? staticData
  )
  const [status, setStatus] = useState<Status>(
    cache.has(subDestId) ? 'ready' : supabaseEnabled ? 'loading' : 'ready'
  )

  useEffect(() => {
    if (!subDestId || !supabaseEnabled || cache.has(subDestId)) return

    fetch(`/api/activities?subDestId=${encodeURIComponent(subDestId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Activity[]>
      })
      .then((data) => {
        // Merge: DB data wins over static, but keep static entries with no DB equivalent
        const dbIds = new Set(data.map((a) => a.id))
        const staticOnly = staticData.filter((a) => !dbIds.has(a.id))
        const merged = [...data, ...staticOnly]
        cache.set(subDestId, merged)
        setActivities(merged)
        setStatus('ready')
      })
      .catch((err) => {
        console.warn(`[useActivities] fetch failed for ${subDestId}, using static:`, err)
        setStatus('ready')
      })
  }, [subDestId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { activities, status }
}
