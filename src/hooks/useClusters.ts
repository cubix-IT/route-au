import { useState, useEffect } from 'react'
import { VICTORIAN_CLUSTERS } from '@/data/victorianClusters'
import type { VicCluster } from '@/data/victorianClusters'
import { supabaseEnabled } from '@/lib/supabase'

type Status = 'loading' | 'ready' | 'error'

interface UseClustersResult {
  clusters: VicCluster[]
  status: Status
}

// In-memory cache so repeated renders don't re-fetch
let cachedClusters: VicCluster[] | null = null

export function useClusters(): UseClustersResult {
  const [clusters, setClusters] = useState<VicCluster[]>(cachedClusters ?? VICTORIAN_CLUSTERS)
  const [status, setStatus] = useState<Status>(cachedClusters ? 'ready' : supabaseEnabled ? 'loading' : 'ready')

  useEffect(() => {
    if (!supabaseEnabled || cachedClusters) return

    fetch('/api/clusters')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<VicCluster[]>
      })
      .then((data) => {
        cachedClusters = data
        setClusters(data)
        setStatus('ready')
      })
      .catch((err) => {
        console.warn('[useClusters] API fetch failed, using static data:', err)
        setStatus('ready') // already showing static data
      })
  }, [])

  return { clusters, status }
}
