import type { ItineraryDay } from '@/types'
import { formatKm, formatHours, formatDate, formatTemp } from '@/utils/formatters'
import { GuardrailBanner } from './GuardrailBanner'

interface Props {
  day: ItineraryDay
}

export function DayCard({ day }: Props) {
  const topPOIs = day.pois.slice(0, 3)

  return (
    <div className="p-4 border border-slate-700 rounded-xl bg-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Day {day.day_number}</h3>
          <p className="text-slate-400 text-xs">{formatDate(day.date)}</p>
        </div>
        <div className="text-right">
          <p className="text-amber-400 font-medium text-sm">{formatKm(day.drive_km)}</p>
          <p className="text-slate-400 text-xs">{formatHours(day.drive_hours)} driving</p>
        </div>
      </div>

      {/* Weather strip */}
      {day.weather && (
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-700 rounded-lg text-sm">
          <span>🌡️</span>
          <span className="text-white">{formatTemp(day.weather.temp_max_c)} max</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-300">{day.weather.description}</span>
          {day.weather.precipitation_probability > 30 && (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-blue-300">💧 {day.weather.precipitation_probability}% rain</span>
            </>
          )}
        </div>
      )}

      {/* Waypoints */}
      <div className="space-y-1">
        {day.waypoints.slice(0, 4).map((w) => (
          <div key={w.id} className="flex items-center gap-2 text-sm">
            <span>{w.is_fuel_stop ? '⛽' : w.is_mandatory ? '📍' : '·'}</span>
            <span className={w.is_fuel_stop ? 'text-amber-300' : 'text-slate-300'}>{w.label}</span>
            {w.fuel_price_cpl && (
              <span className="text-xs text-slate-500 ml-auto">{w.fuel_price_cpl}c/L</span>
            )}
          </div>
        ))}
      </div>

      {/* Top POIs */}
      {topPOIs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topPOIs.map((p) => (
            <span
              key={p.id}
              className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
            >
              <span>{poiEmoji(p.category)}</span>
              <span>{p.name.split('–')[0].trim()}</span>
            </span>
          ))}
        </div>
      )}

      {/* Warnings */}
      {day.warnings.length > 0 && (
        <div className="space-y-2">
          {day.warnings.map((w) => (
            <GuardrailBanner key={w.id} warning={w} />
          ))}
        </div>
      )}
    </div>
  )
}

function poiEmoji(cat: string) {
  const m: Record<string, string> = { Hiking: '🥾', Chilling: '🏖', Lookouts: '👁', Photography: '📷', FreeCamping: '⛺', History: '🏛' }
  return m[cat] ?? '📍'
}
