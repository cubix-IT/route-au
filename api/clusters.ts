import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!adminSupabase) return res.status(200).json([])

  const [clustersRes, subDestsRes] = await Promise.all([
    adminSupabase.from('clusters').select('cluster_id,slug,name,tagline,image_url,gradient_from,gradient_to,seasonal_scores,display_order').order('display_order'),
    adminSupabase.from('sub_destinations').select('sub_dest_id,slug,cluster_id,name,drive_time_hours,drive_km,highlights,themes,lat,lng').order('display_order'),
  ])

  if (clustersRes.error) {
    console.error('[api/clusters]', clustersRes.error)
    return res.status(500).json({ error: clustersRes.error.message })
  }

  const result = (clustersRes.data ?? []).map((c) => ({
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

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).json(result)
}
