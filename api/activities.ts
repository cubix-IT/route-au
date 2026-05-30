import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!adminSupabase) return res.status(200).json([])

  const { subDestId } = req.query
  if (!subDestId || typeof subDestId !== 'string') {
    return res.status(400).json({ error: 'subDestId query param required' })
  }

  // subDestId may be a slug (string) or integer — resolve to integer via sub_destinations
  let numericId: number | null = null
  const asInt = parseInt(subDestId)
  if (!isNaN(asInt)) {
    numericId = asInt
  } else {
    const { data: sd } = await adminSupabase
      .from('sub_destinations')
      .select('sub_dest_id')
      .eq('slug', subDestId)
      .single()
    numericId = sd?.sub_dest_id ?? null
  }

  if (!numericId) return res.status(200).json([])

  const { data, error } = await adminSupabase
    .from('activities')
    .select('*')
    .eq('sub_dest_id', numericId)
    .order('is_hidden_gem', { ascending: false })

  if (error) {
    console.error('[api/activities] error', error)
    return res.status(500).json({ error: error.message })
  }

  const result = data.map((a) => ({
    id: a.activity_id,
    name: a.name,
    category: a.category,
    emoji: a.emoji,
    description: a.description,
    duration: a.duration,
    cost: a.cost,
    kidsOk: a.kids_ok,
    isHiddenGem: a.is_hidden_gem,
    mapsUrl: a.maps_url,
    tags: a.tags ?? [],
  }))

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).json(result)
}
