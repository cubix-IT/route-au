import type { VercelRequest, VercelResponse } from '@vercel/node'

const FEED_URL = 'https://emergency.vic.gov.au/public/osom-geojson.json'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const upstream = await fetch(FEED_URL, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!upstream.ok) {
      return res.status(502).json({ error: 'upstream error', status: upstream.status })
    }
    const data = await upstream.json()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json(data)
  } catch {
    return res.status(503).json({ error: 'hazard feed unavailable' })
  }
}
