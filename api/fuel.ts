import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

// Reads from Supabase fuel_stations + fuel_prices tables (populated daily by cron/fuel.ts).
// Much faster than hitting Service Victoria live — no rate limit risk, no auth headers needed.
// Data is 24hr delayed by Service Victoria anyway, so DB is equivalent freshness.

function haversinKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Fuel type: app label → DB fuel_type code
const APP_TO_DB_FUEL: Record<string, string> = {
  Unleaded91: 'U91',
  E10: 'E10',
  Unleaded95: 'P95',
  Unleaded98: 'P98',
  Diesel: 'DSL',
  Electric: '',
}

// Salesforce ID pattern — 15 or 18 alphanumeric chars starting with 0
const SF_ID = /^[a-zA-Z0-9]{15,18}$/
function decodeBrand(raw: string | null): string {
  if (!raw) return 'Independent'
  if (SF_ID.test(raw)) return 'Service Station' // ID not yet resolved — cron will fix overnight
  return raw
}

export interface FuelStation {
  id: string
  name: string
  brand: string
  brandId: string
  address: string
  lat: number
  lng: number
  priceCents: number        // e.g. 189.9
  pricePerLitre: number     // e.g. 1.899
  distanceKm: number
  fuelType: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const {
    lat, lng,
    fuelType = 'Unleaded95',
    brand,
    radius = '15',
    limit = '3',
  } = req.query as Record<string, string>

  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' })

  const originLat = parseFloat(lat)
  const originLng = parseFloat(lng)
  const radiusKm = Math.min(Math.max(parseFloat(radius) || 15, 2), 50)
  const maxResults = Math.min(Math.max(parseInt(limit) || 3, 1), 10)
  const dbFuelType = APP_TO_DB_FUEL[fuelType] ?? fuelType

  if (fuelType === 'Electric' || dbFuelType === '') {
    return res.status(200).json({ stations: [], isEV: true })
  }

  if (!adminSupabase) {
    return res.status(200).json({ stations: [], error: 'fuel data unavailable' })
  }

  try {
    // Query Supabase: join fuel_stations + fuel_prices by fuel type
    // Filter stations roughly by bounding box first (fast), then haversine for accuracy
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos((originLat * Math.PI) / 180))

    const { data, error } = await adminSupabase
      .from('fuel_stations')
      .select(`
        fuel_station_id, external_id, name, brand, address, lat, lng,
        fuel_prices!inner(fuel_type, price_cents)
      `)
      .gte('lat', originLat - latDelta)
      .lte('lat', originLat + latDelta)
      .gte('lng', originLng - lngDelta)
      .lte('lng', originLng + lngDelta)
      .eq('fuel_prices.fuel_type', dbFuelType)

    if (error) throw error

    function rowsToStations(rows: typeof data, brandFilter: string | undefined): FuelStation[] {
      const out: FuelStation[] = []
      for (const row of rows ?? []) {
        if (!row.lat || !row.lng) continue
        const distKm = haversinKm(originLat, originLng, row.lat, row.lng)
        if (distKm > radiusKm) continue
        if (brandFilter && !row.brand?.toLowerCase().includes(brandFilter.toLowerCase())) continue
        const prices = Array.isArray(row.fuel_prices) ? row.fuel_prices : [row.fuel_prices]
        const priceEntry = prices.find((p: { fuel_type: string; price_cents: number }) => p.fuel_type === dbFuelType)
        if (!priceEntry) continue
        out.push({
          id: row.external_id,
          name: row.name,
          brand: decodeBrand(row.brand),
          brandId: '',
          address: row.address ?? '',
          lat: row.lat,
          lng: row.lng,
          priceCents: priceEntry.price_cents,
          pricePerLitre: priceEntry.price_cents / 100,
          distanceKm: Math.round(distKm * 10) / 10,
          fuelType: dbFuelType,
        })
      }
      return out
    }

    const stations = rowsToStations(data, brand)
    const brandNotFound = brand && stations.length === 0

    stations.sort((a, b) => a.priceCents - b.priceCents)
    const top = stations.slice(0, maxResults)

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    return res.status(200).json({ stations: top, totalFound: stations.length, fuelType: dbFuelType, radiusKm, brandNotFound: brandNotFound || undefined })
  } catch (err) {
    console.error('[fuel] error:', err)
    return res.status(200).json({ stations: [], error: 'fuel data unavailable' })
  }
}
