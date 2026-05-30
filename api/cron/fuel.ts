import { randomUUID } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from '../_lib/supabase.js'

// Called daily at 3am AEST by Vercel Cron (vercel.json: "0 17 * * *")
// Pulls all VIC fuel stations + prices from Service Victoria Fair Fuel API.
// Upserts to fuel_stations and fuel_prices tables.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!adminSupabase) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const apiKey = process.env.FAIR_FUEL_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'FAIR_FUEL_API_KEY not configured' })
  }

  const runAt = new Date().toISOString()
  let stationsUpserted = 0
  let pricesUpserted = 0

  try {
    // Fetch all VIC fuel station prices in one call (~1,741 stations)
    const resp = await fetch('https://api.fuel.service.vic.gov.au/open-data/v1/fuel/prices', {
      headers: {
        'x-consumer-id': apiKey,
        'x-transactionid': randomUUID(),
        'User-Agent': 'UnplannedEscapes/1.0',
      },
      signal: AbortSignal.timeout(30_000),
    })

    if (!resp.ok) {
      throw new Error(`Fair Fuel API returned ${resp.status}: ${await resp.text()}`)
    }

    const data = await resp.json() as FuelApiResponse

    // Build station rows (unique per station)
    const stationMap = new Map<string, StationRow>()
    const priceRows: PriceRow[] = []
    const now = new Date().toISOString()

    for (const item of data.fuelPriceDetails ?? []) {
      const st = item.fuelStation
      const { latitude: lat, longitude: lng } = st.location
      if (lat == null || lng == null) continue

      stationMap.set(st.id, {
        external_id: st.id,
        name: st.name ?? 'Unknown',
        brand: st.brandId ?? null,
        address: st.address ?? null,
        lat,
        lng,
      })

      for (const fp of item.fuelPrices ?? []) {
        if (!VALID_FUEL_TYPES.has(fp.fuelType) || !fp.isAvailable || fp.price <= 0) continue
        priceRows.push({
          fuel_station_external_id: st.id,
          fuel_type: fp.fuelType,
          price_cents: fp.price,
          recorded_at: now,
        })
      }
    }

    const stations = Array.from(stationMap.values())

    // Upsert stations first (prices FK to stations)
    if (stations.length) {
      const { error } = await adminSupabase
        .from('fuel_stations')
        .upsert(stations, { onConflict: 'external_id' })
      if (error) throw new Error(`fuel_stations upsert: ${error.message}`)
      stationsUpserted = stations.length
    }

    // Fetch station_id map (external_id → fuel_station_id integer)
    const { data: dbStations, error: fetchErr } = await adminSupabase
      .from('fuel_stations')
      .select('fuel_station_id, external_id')
    if (fetchErr) throw fetchErr

    const extToId = new Map<string, number>()
    for (const s of dbStations ?? []) extToId.set(s.external_id, s.fuel_station_id)

    // Resolve FK and upsert prices in batches of 500
    const resolvedPrices = priceRows
      .map((p) => {
        const fuel_station_id = extToId.get(p.fuel_station_external_id)
        if (!fuel_station_id) return null
        return { fuel_station_id, fuel_type: p.fuel_type, price_cents: p.price_cents, recorded_at: p.recorded_at }
      })
      .filter(Boolean) as ResolvedPriceRow[]

    const BATCH = 500
    for (let i = 0; i < resolvedPrices.length; i += BATCH) {
      const batch = resolvedPrices.slice(i, i + BATCH)
      const { error } = await adminSupabase
        .from('fuel_prices')
        .upsert(batch, { onConflict: 'fuel_station_id,fuel_type' })
      if (error) throw new Error(`fuel_prices upsert batch ${i}: ${error.message}`)
      pricesUpserted += batch.length
    }

    const totalRecords = stationsUpserted + pricesUpserted

    await adminSupabase.from('cron_log').insert({
      job_name: 'fuel-prices',
      run_at: runAt,
      completed_at: new Date().toISOString(),
      status: 'ok',
      message: `${stationsUpserted} stations, ${pricesUpserted} prices`,
      records_upserted: totalRecords,
      destinations_processed: 0,
      duration_ms: Date.now() - new Date(runAt).getTime(),
    })

    await adminSupabase.from('cron_status').upsert({
      job_name: 'fuel-prices',
      last_run_at: runAt,
      last_success_at: new Date().toISOString(),
      total_records_upserted: totalRecords,
    }, { onConflict: 'job_name' })

    return res.status(200).json({ ok: true, stationsUpserted, pricesUpserted })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/fuel]', msg)

    await adminSupabase.from('cron_log').insert({
      job_name: 'fuel-prices',
      run_at: runAt,
      completed_at: new Date().toISOString(),
      status: 'error',
      message: msg,
      records_upserted: 0,
      destinations_processed: 0,
      duration_ms: Date.now() - new Date(runAt).getTime(),
    }).then(() => {}, () => {})

    await adminSupabase.from('cron_status').upsert({
      job_name: 'fuel-prices',
      last_run_at: runAt,
      last_error_at: new Date().toISOString(),
      last_error_message: msg,
    }, { onConflict: 'job_name' }).then(() => {}, () => {})

    return res.status(500).json({ error: msg })
  }
}

const VALID_FUEL_TYPES = new Set(['P95', 'P98', 'DSL', 'E10', 'LPG', 'U91'])

interface FuelApiResponse {
  fuelPriceDetails?: FuelPriceDetail[]
}

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

interface StationRow {
  external_id: string
  name: string
  brand: string | null
  address: string | null
  lat: number
  lng: number
}

interface PriceRow {
  fuel_station_external_id: string
  fuel_type: string
  price_cents: number
  recorded_at: string
}

interface ResolvedPriceRow {
  fuel_station_id: number
  fuel_type: string
  price_cents: number
  recorded_at: string
}
