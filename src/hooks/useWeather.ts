import { useState, useEffect } from 'react'
import type { Coordinate } from '@/types'

export interface DayForecast {
  date: string          // 'YYYY-MM-DD'
  maxTemp: number
  minTemp: number
  precipMm: number
  weatherCode: number
  emoji: string
  label: string
}

export interface WeatherData {
  currentTemp: number
  currentEmoji: string
  currentLabel: string
  forecast: DayForecast[]  // up to 7 days
}

// WMO weather code → emoji + short label
function decodeCode(code: number): { emoji: string; label: string } {
  if (code === 0)                    return { emoji: '☀️',  label: 'Clear' }
  if (code <= 3)                     return { emoji: '⛅',  label: 'Partly cloudy' }
  if (code === 45 || code === 48)    return { emoji: '🌫️', label: 'Fog' }
  if (code >= 51 && code <= 57)      return { emoji: '🌦️', label: 'Drizzle' }
  if (code >= 61 && code <= 67)      return { emoji: '🌧️', label: 'Rain' }
  if (code >= 71 && code <= 77)      return { emoji: '❄️',  label: 'Snow' }
  if (code >= 80 && code <= 82)      return { emoji: '🌦️', label: 'Showers' }
  if (code >= 85 && code <= 86)      return { emoji: '🌨️', label: 'Snow showers' }
  if (code >= 95 && code <= 99)      return { emoji: '⛈️',  label: 'Thunderstorm' }
  return { emoji: '🌤️', label: 'Cloudy' }
}

export function useWeather(coord: Coordinate | null): WeatherData | null {
  const [data, setData] = useState<WeatherData | null>(null)

  useEffect(() => {
    if (!coord) return
    let cancelled = false

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${coord.lat}&longitude=${coord.lng}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&current_weather=true` +
      `&timezone=Australia%2FMelbourne` +
      `&forecast_days=7`

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const cw = json.current_weather
        const daily = json.daily
        if (!cw || !daily) return

        const current = decodeCode(cw.weathercode)
        const forecast: DayForecast[] = (daily.time as string[]).map((date: string, i: number) => {
          const code = daily.weathercode[i]
          const { emoji, label } = decodeCode(code)
          return {
            date,
            maxTemp: Math.round(daily.temperature_2m_max[i]),
            minTemp: Math.round(daily.temperature_2m_min[i]),
            precipMm: Math.round(daily.precipitation_sum[i] * 10) / 10,
            weatherCode: code,
            emoji,
            label,
          }
        })

        setData({
          currentTemp: Math.round(cw.temperature),
          currentEmoji: current.emoji,
          currentLabel: current.label,
          forecast,
        })
      })
      .catch(() => { /* silently ignore — offline or API unavailable */ })

    return () => { cancelled = true }
  }, [coord?.lat, coord?.lng])

  return data
}
