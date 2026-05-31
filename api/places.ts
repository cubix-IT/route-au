import type { VercelRequest, VercelResponse } from '@vercel/node'

// Google Places API removed — replaced by Overpass (OpenStreetMap), free forever.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ places: [] })
}
