import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!adminSupabase) return res.status(200).json([])

  const { subDestId } = req.query
  if (!subDestId || typeof subDestId !== 'string') {
    return res.status(400).json({ error: 'subDestId query param required' })
  }

  const { data, error } = await adminSupabase
    .from('activities')
    .select('*')
    .eq('sub_dest_id', subDestId)
    .order('is_hidden_gem', { ascending: false })

  if (error) {
    console.error('[api/activities] error', error)
    return res.status(500).json({ error: error.message })
  }

  const result = data.map((a) => ({
    id: a.id,
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
