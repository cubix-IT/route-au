import type { DayWeather, Coordinate } from '@/types'

const USER_AGENT = 'UnplannedEscapes/1.0 (unplanned-escapes.vercel.app; support@cubixit.com.au)'

export async function fetchWeatherForCoord(
  coord: Coordinate,
  days = 7
): Promise<DayWeather[]> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${coord.lat.toFixed(4)}&lon=${coord.lng.toFixed(4)}`

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error('Weather fetch failed')

  const json = await res.json() as {
    properties: {
      timeseries: Array<{
        time: string
        data: {
          instant: { details: { air_temperature: number } }
          next_12_hours?: { summary: { symbol_code: string } }
          next_6_hours?: { details: { precipitation_amount: number }; summary: { symbol_code: string } }
        }
      }>
    }
  }

  // Group timeseries into daily buckets (noon entry = representative for that day)
  const dayMap = new Map<string, { maxTemp: number; minTemp: number; precipMm: number; symbolCode: string }>()

  for (const entry of json.properties.timeseries) {
    const date = entry.time.slice(0, 10)
    const hour = parseInt(entry.time.slice(11, 13))
    const temp = entry.data.instant.details.air_temperature
    const precip = entry.data.next_6_hours?.details.precipitation_amount ?? 0
    const symbol = entry.data.next_12_hours?.summary.symbol_code
      ?? entry.data.next_6_hours?.summary.symbol_code
      ?? ''

    const existing = dayMap.get(date)
    if (!existing) {
      dayMap.set(date, { maxTemp: temp, minTemp: temp, precipMm: precip, symbolCode: symbol })
    } else {
      existing.maxTemp = Math.max(existing.maxTemp, temp)
      existing.minTemp = Math.min(existing.minTemp, temp)
      existing.precipMm += precip
      // Use noon symbol as the day's representative
      if (hour === 12 && symbol) existing.symbolCode = symbol
    }
  }

  return Array.from(dayMap.entries())
    .slice(0, days)
    .map(([, d]) => ({
      temp_max_c: Math.round(d.maxTemp),
      temp_min_c: Math.round(d.minTemp),
      precipitation_probability: precipToProb(d.precipMm),
      description: symbolToDescription(d.symbolCode),
    }))
}

function precipToProb(mm: number): number {
  if (mm === 0) return 0
  if (mm < 1) return 20
  if (mm < 3) return 50
  if (mm < 8) return 70
  return 90
}

function symbolToDescription(code: string): string {
  if (!code) return 'Unknown'
  if (code.includes('clearsky') || code.includes('fair')) return 'Clear sky'
  if (code.includes('partlycloudy')) return 'Partly cloudy'
  if (code.includes('cloudy')) return 'Cloudy'
  if (code.includes('fog')) return 'Foggy'
  if (code.includes('snow') || code.includes('sleet')) return 'Snowfall'
  if (code.includes('thunder')) return 'Thunderstorm'
  if (code.includes('rain') || code.includes('shower') || code.includes('drizzle')) return 'Rainy'
  return 'Partly cloudy'
}
