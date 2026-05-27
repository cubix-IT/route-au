import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data: clusters, error: cErr } = await adminSupabase
    .from('clusters')
    .select('*')
    .order('display_order')

  if (cErr) {
    console.error('[api/clusters] clusters error', cErr)
    return res.status(500).json({ error: cErr.message })
  }

  const { data: subDests, error: sErr } = await adminSupabase
    .from('sub_destinations')
    .select('*')
    .order('display_order')

  if (sErr) {
    console.error('[api/clusters] sub_destinations error', sErr)
    return res.status(500).json({ error: sErr.message })
  }

  // Nest sub-destinations inside clusters and convert snake_case → camelCase
  const result = clusters.map((c) => ({
    id: c.id,
    name: c.name,
    tagline: c.tagline,
    driveTimeRange: c.drive_time_range,
    themes: c.themes ?? [],
    seasonalScores: c.seasonal_scores ?? {},
    image: c.image_emoji,
    imageUrl: c.image_url,
    gradientFrom: c.gradient_from,
    gradientTo: c.gradient_to,
    subDests: subDests
      .filter((s) => s.cluster_id === c.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        driveTimeHours: s.drive_time_hours,
        driveKm: s.drive_km,
        highlights: s.highlights ?? [],
        themes: s.themes ?? [],
        coord: { lat: s.lat, lng: s.lng },
      })),
  }))

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).json(result)
}
