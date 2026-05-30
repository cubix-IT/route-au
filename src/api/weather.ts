import type { DayWeather } from '@/types'
import type { Coordinate } from '@/types'

export async function fetchWeatherForCoord(
  coord: Coordinate,
  days = 7
): Promise<DayWeather[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(coord.lat))
  url.searchParams.set('longitude', String(coord.lng))
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode')
  url.searchParams.set('forecast_days', String(days))
  url.searchParams.set('timezone', 'Australia/Melbourne')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Weather fetch failed')

  const json = await res.json() as {
    daily: {
      temperature_2m_max: number[]
      temperature_2m_min: number[]
      precipitation_probability_max: number[]
      weathercode: number[]
    }
  }

  return json.daily.temperature_2m_max.map((maxTemp, i) => ({
    temp_max_c: maxTemp,
    temp_min_c: json.daily.temperature_2m_min[i],
    precipitation_probability: json.daily.precipitation_probability_max[i],
    description: weatherCodeToDescription(json.daily.weathercode[i]),
  }))
}

function weatherCodeToDescription(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 49) return 'Foggy'
  if (code <= 67) return 'Rainy'
  if (code <= 77) return 'Snowfall'
  if (code <= 82) return 'Showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}
