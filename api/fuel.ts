import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

if (!process.env.FAIR_FUEL_API_KEY) {
  try {
    for (const file of ['.env.local', '.env']) {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      for (const line of content.split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
      }
    }
  } catch { /* expected in production */ }
}

const FAIR_FUEL_BASE = 'https://api.fuel.service.vic.gov.au/open-data/v1'

// Fuel type codes → app FuelType mapping
const APP_TO_API_FUEL: Record<string, string> = {
  Unleaded95:  'P95',
  Unleaded98:  'P98',
  Diesel:      'DSL',
  Electric:    '',    // handled separately via Google Places
}

// In-memory statewide price cache — 1hr TTL (data is 24hr delayed so this is fine)
let priceCache: { data: FuelPriceDetail[]; expiresAt: number } | null = null
let brandCache: { data: Brand[]; expiresAt: number } | null = null

interface FuelPriceDetail {
  fuelStation: {
    id: string
    name: string
    brandId: string
    address: string
    location: { latitude: number | null; longitude: number | null }
  }
  fuelPrices: Array<{
    fuelType: string
    price: number
    isAvailable: boolean
  }>
}

interface Brand {
  id: string
  name: string
  type: string
}

function fairFuelHeaders() {
  return {
    'x-consumer-id': process.env.FAIR_FUEL_API_KEY!,
    'x-transactionid': randomUUID(),
    'User-Agent': 'UnplannedEscapes/1.0',
  }
}

async function getAllPrices(): Promise<FuelPriceDetail[]> {
  if (priceCache && Date.now() < priceCache.expiresAt) return priceCache.data

  const res = await fetch(`${FAIR_FUEL_BASE}/fuel/prices`, {
    headers: fairFuelHeaders(),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`Fair Fuel API ${res.status}`)
  const json = await res.json() as { fuelPriceDetails: FuelPriceDetail[] }
  const data = json.fuelPriceDetails ?? []
  priceCache = { data, expiresAt: Date.now() + 60 * 60 * 1000 }
  return data
}

async function getAllBrands(): Promise<Brand[]> {
  if (brandCache && Date.now() < brandCache.expiresAt) return brandCache.data

  const res = await fetch(`${FAIR_FUEL_BASE}/fuel/reference-data/brands`, {
    headers: fairFuelHeaders(),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Fair Fuel brands API ${res.status}`)
  const json = await res.json() as { brands: Brand[] }
  const data = json.brands ?? []
  brandCache = { data, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }
  return data
}

function haversinKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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

  const apiKey = process.env.FAIR_FUEL_API_KEY
  if (!apiKey) return res.status(200).json({ stations: [], error: 'fuel API not configured' })

  const originLat = parseFloat(lat)
  const originLng = parseFloat(lng)
  const radiusKm = Math.min(Math.max(parseFloat(radius) || 15, 2), 50)
  const maxResults = Math.min(Math.max(parseInt(limit) || 3, 1), 10)
  const apiFuelType = APP_TO_API_FUEL[fuelType] ?? fuelType

  // EV: no fuel stations — caller should use Google Places for charging
  if (fuelType === 'Electric' || apiFuelType === '') {
    return res.status(200).json({ stations: [], isEV: true })
  }

  try {
    const [allPrices, allBrands] = await Promise.all([getAllPrices(), getAllBrands()])

    // Build brandId lookup: brand display name → id
    const brandNameToId = new Map(allBrands.map((b) => [b.name.toLowerCase(), b.id]))
    const requestedBrandIds = brand
      ? allBrands
          .filter((b) => b.name.toLowerCase().includes(brand.toLowerCase()))
          .map((b) => b.id)
      : null

    const stations: FuelStation[] = []

    for (const item of allPrices) {
      const st = item.fuelStation
      const { latitude: sLat, longitude: sLng } = st.location
      if (sLat == null || sLng == null) continue

      const distKm = haversinKm(originLat, originLng, sLat, sLng)
      if (distKm > radiusKm) continue

      // Brand filter
      if (requestedBrandIds && !requestedBrandIds.includes(st.brandId)) continue

      const priceEntry = item.fuelPrices.find(
        (fp) => fp.fuelType === apiFuelType && fp.isAvailable && fp.price > 0,
      )
      if (!priceEntry) continue

      const brandName = allBrands.find((b) => b.id === st.brandId)?.name ?? 'Independent'

      stations.push({
        id: st.id,
        name: st.name,
        brand: brandName,
        brandId: st.brandId,
        address: st.address,
        lat: sLat,
        lng: sLng,
        priceCents: priceEntry.price,
        pricePerLitre: priceEntry.price / 100,
        distanceKm: Math.round(distKm * 10) / 10,
        fuelType: apiFuelType,
      })
    }

    // Sort by price, return top N
    stations.sort((a, b) => a.priceCents - b.priceCents)
    const top = stations.slice(0, maxResults)

    void brandNameToId // suppress unused warning

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    return res.status(200).json({
      stations: top,
      totalFound: stations.length,
      fuelType: apiFuelType,
      radiusKm,
    })
  } catch (err) {
    console.error('[fuel] error:', err)
    return res.status(200).json({ stations: [], error: 'fuel data unavailable' })
  }
}
