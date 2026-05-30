import { useState, useEffect } from 'react'
import { VICTORIAN_CLUSTERS } from '@/data/victorianClusters'
import type { VicCluster } from '@/data/victorianClusters'
import { supabase } from '@/lib/supabase'

type Status = 'loading' | 'ready' | 'error'

interface UseClustersResult {
  clusters: VicCluster[]
  status: Status
}

// In-memory cache so repeated renders don't re-fetch
let cachedClusters: VicCluster[] | null = null

export function useClusters(): UseClustersResult {
  const [clusters, setClusters] = useState<VicCluster[]>(cachedClusters ?? VICTORIAN_CLUSTERS)
  const [status, setStatus] = useState<Status>(cachedClusters ? 'ready' : supabase ? 'loading' : 'ready')

  useEffect(() => {
    if (!supabase || cachedClusters) return

    async function loadFromSupabase() {
      if (!supabase) return

      const [clustersRes, subDestsRes] = await Promise.all([
        supabase.from('clusters').select('cluster_id,slug,name,tagline,image_url,gradient_from,gradient_to,seasonal_scores,display_order').order('display_order'),
        supabase.from('sub_destinations').select('sub_dest_id,slug,cluster_id,name,drive_time_hours,drive_km,highlights,themes,lat,lng').order('display_order'),
      ])

      if (clustersRes.error) throw clustersRes.error

      const data: VicCluster[] = (clustersRes.data ?? []).map((c) => ({
        id: c.slug,
        name: c.name,
        tagline: c.tagline ?? '',
        driveTimeRange: '',
        themes: [],
        seasonalScores: c.seasonal_scores ?? {},
        image: '',
        imageUrl: c.image_url ?? '',
        gradientFrom: c.gradient_from ?? '#1a3a2a',
        gradientTo: c.gradient_to ?? '#2a5a3a',
        subDests: (subDestsRes.data ?? [])
          .filter((s) => s.cluster_id === c.cluster_id)
          .map((s) => ({
            id: s.slug,
            name: s.name,
            driveTimeHours: s.drive_time_hours ?? 1,
            driveKm: s.drive_km ?? 60,
            highlights: s.highlights ?? [],
            themes: s.themes ?? [],
            coord: { lat: s.lat, lng: s.lng },
          })),
      }))

      cachedClusters = data
      setClusters(data)
      setStatus('ready')
    }

    loadFromSupabase().catch((err) => {
      console.warn('[useClusters] Supabase fetch failed, using static data:', err)
      setStatus('ready')
    })
  }, [])

  return { clusters, status }
}
