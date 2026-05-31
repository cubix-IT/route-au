import type { VercelRequest, VercelResponse } from '@vercel/node'

// Google Places enrichment removed — replaced by Overpass (OpenStreetMap), free forever.
// New enrichment to be built using Overpass API — no API key, no cost.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ message: 'Enrichment via Overpass coming soon.' })
}
