import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useItineraryBuilder } from '@/hooks/useItineraryBuilder'
import { DayCard } from './DayCard'
import { GuardrailBanner } from './GuardrailBanner'
import { CORRIDORS } from '@/data/corridors'
import { formatKm, formatHours } from '@/utils/formatters'
import { exportGPX } from '@/utils/gpxExport'

export function ItineraryPanel() {
  const { activeItinerary, selectedCorridorId, setSelectedCorridorId, constraintViolations, userProfile } = useAppStore()
  const { buildItinerary } = useItineraryBuilder()
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <span className="text-6xl mb-4">🗺️</span>
        <h2 className="text-white text-xl font-bold mb-2">Welcome to RouteAU</h2>
        <p className="text-slate-400 text-sm mb-6">Australia's offline-first road trip planner. Set up your profile to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Route selector */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="space-y-2">
          <label className="text-slate-400 text-xs uppercase tracking-wide">Corridor</label>
          <select
            value={selectedCorridorId}
            onChange={(e) => setSelectedCorridorId(e.target.value)}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          >
            {CORRIDORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.approximate_length_km}km)
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-slate-400 text-xs uppercase tracking-wide">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <button
          onClick={() => buildItinerary(startDate)}
          className="w-full py-2.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-semibold text-sm transition-colors"
        >
          Plan This Route →
        </button>
      </div>

      {/* Constraint violations */}
      {constraintViolations.length > 0 && (
        <div className="p-4 border-b border-slate-700 space-y-2">
          <h3 className="text-red-400 font-semibold text-sm">⚠ Vehicle Constraints</h3>
          {constraintViolations.map((v) => (
            <div key={`${v.segment_id}-${v.reason}`} className="text-xs text-red-300 bg-red-950 border border-red-800 rounded-lg p-2">
              {v.detail}
            </div>
          ))}
        </div>
      )}

      {/* Itinerary */}
      {activeItinerary ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold">{activeItinerary.name}</h2>
              <p className="text-slate-400 text-xs">
                {formatKm(activeItinerary.route.total_distance_km)} · {formatHours(activeItinerary.route.estimated_drive_hours)} · {activeItinerary.days.length} days
              </p>
            </div>
            <button
              onClick={() => exportGPX(activeItinerary)}
              className="text-xs px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              GPX ↓
            </button>
          </div>

          {/* Global warnings */}
          {activeItinerary.all_warnings.filter((w) => w.severity === 'MANDATORY_STOP').map((w) => (
            <GuardrailBanner key={w.id} warning={w} />
          ))}

          {/* Day cards */}
          {activeItinerary.days.map((day) => (
            <DayCard key={day.day_number} day={day} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <span className="text-4xl">🛣️</span>
            <p className="text-slate-400 text-sm mt-3">Select a corridor and click Plan to build your itinerary</p>
          </div>
        </div>
      )}
    </div>
  )
}
