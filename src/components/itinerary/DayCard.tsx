import { useState } from 'react'
import type { ItineraryDay, ScheduleItem } from '@/types'
import { GuardrailBanner } from './GuardrailBanner'
import { formatKm, formatDate } from '@/utils/formatters'
import { useAppStore } from '@/store/useAppStore'
import { FOOD_DRINK } from '@/data/foodDrink'

interface Props {
  day: ItineraryDay
}

export function DayCard({ day }: Props) {
  const [expanded, setExpanded] = useState(day.day_number === 1)
  const addedDiningStops = useAppStore((s) => s.addedDiningStops)
  const removeDiningStop = useAppStore((s) => s.removeDiningStop)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  const myDiningStops = addedDiningStops
    .filter((s) => s.dayNumber === day.day_number)
    .map((s) => FOOD_DRINK.find((f) => f.id === s.foodId))
    .filter(Boolean)

  const hasWarnings = day.warnings.length > 0
  const driveHrs = Math.floor(day.drive_hours)
  const driveMins = Math.round((day.drive_hours - driveHrs) * 60)
  const driveLabel = driveHrs > 0
    ? `${driveHrs}h${driveMins > 0 ? ` ${driveMins}m` : ''}`
    : `${driveMins}m`

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Day header — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--amber-glow)',
          border: '1.5px solid var(--amber-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'var(--amber)',
          flexShrink: 0,
        }}>
          {day.day_number}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {formatDate(day.date)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {formatKm(day.drive_km)} · {driveLabel} drive
            {day.schedule.length > 0 && ` · ${day.schedule.length} stops`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasWarnings && (
            <span style={{ fontSize: 14 }}>⚠️</span>
          )}
          {day.weather && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(day.weather.temp_max_c)}°C
            </span>
          )}
          <span style={{
            fontSize: 10, color: 'var(--text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.25s ease',
            display: 'inline-block',
          }}>▼</span>
        </div>
      </button>

      {/* Expanded schedule */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '4px 16px 16px' }}>
          {/* Weather bar */}
          {day.weather && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 10, marginTop: 12,
              background: day.weather.temp_max_c > 40
                ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${day.weather.temp_max_c > 40 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 16 }}>
                {day.weather.temp_max_c > 40 ? '🥵' : day.weather.precipitation_probability > 60 ? '🌧️' : '☀️'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>
                {day.weather.description}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: day.weather.temp_max_c > 40 ? 'var(--red)' : 'var(--text-secondary)',
              }}>
                {Math.round(day.weather.temp_max_c)}°C
              </span>
              {day.weather.precipitation_probability > 30 && (
                <span style={{ fontSize: 12, color: '#60a5fa' }}>
                  💧 {day.weather.precipitation_probability}%
                </span>
              )}
            </div>
          )}

          {/* Schedule timeline */}
          {day.schedule.length > 0 ? (
            <div>
              {day.schedule.map((item) => (
                <ScheduleRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No schedule built yet
            </div>
          )}

          {/* User-chosen dining stops */}
          {myDiningStops.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              }}>
                Your dining picks
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {myDiningStops.map((venue) => venue && (
                  <div
                    key={venue.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'rgba(245,158,11,0.06)',
                      border: '1px solid var(--amber-dim)',
                      borderRadius: 10, padding: '8px 12px',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>🍽️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>
                        {venue.name}
                      </div>
                      {venue.signature_dish && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Try: {venue.signature_dish}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeDiningStop(venue.id)}
                      style={{
                        background: 'none', border: 'none',
                        color: 'var(--text-muted)', fontSize: 14,
                        cursor: 'pointer', padding: '0 4px',
                      }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add dining stop nudge (only if none added yet) */}
          {myDiningStops.length === 0 && (
            <button
              onClick={() => setActiveTab('dining')}
              style={{
                marginTop: 14, width: '100%', padding: '8px 0',
                background: 'none', border: '1px dashed var(--border)',
                borderRadius: 9, color: 'var(--text-muted)',
                fontSize: 12, cursor: 'pointer',
              }}
            >
              🍽️ Add a dining stop for this day
            </button>
          )}

          {/* Warnings */}
          {day.warnings.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {day.warnings.map((w) => (
                <GuardrailBanner key={w.id} warning={w} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const isHighlight = item.is_highlight

  return (
    <div className="schedule-item">
      <div className={`schedule-dot${isHighlight ? ' highlight' : ''}`} style={{ flexShrink: 0 }}>
        {item.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{
            flex: 1,
            fontSize: 14,
            fontWeight: isHighlight ? 600 : 400,
            color: isHighlight ? 'var(--text-primary)' : 'var(--text-secondary)',
            lineHeight: 1.3,
          }}>
            {item.title}
          </span>
          <span className="schedule-time" style={{ flexShrink: 0 }}>{item.time}</span>
        </div>
        {item.subtitle && (
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 3,
            lineHeight: 1.4,
          }}>
            {item.subtitle}
          </p>
        )}
        {item.duration_min > 0 && item.type !== 'depart' && item.type !== 'arrive' && (
          <span style={{
            display: 'inline-block',
            fontSize: 11,
            color: 'rgba(255,255,255,0.2)',
            marginTop: 3,
          }}>
            ~{item.duration_min} min
          </span>
        )}
      </div>
    </div>
  )
}
