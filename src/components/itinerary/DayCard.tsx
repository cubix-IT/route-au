import { useState } from 'react'
import type { ItineraryDay, ScheduleItem } from '@/types'
import { GuardrailBanner } from './GuardrailBanner'
import { formatKm, formatDate } from '@/utils/formatters'

interface Props {
  day: ItineraryDay
}

export function DayCard({ day }: Props) {
  const [expanded, setExpanded] = useState(day.day_number === 1)

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

const STEP_TYPE_LABEL: Record<string, { icon: string; label: string; color: string }> = {
  depart:     { icon: '🚗', label: 'Depart',      color: '#3A6B4F' },
  drive:      { icon: '🛣',  label: 'Drive',       color: '#6B7280' },
  breakfast:  { icon: '☕', label: 'Breakfast',   color: '#92400E' },
  lunch:      { icon: '🥗', label: 'Lunch',       color: '#B45309' },
  dinner:     { icon: '🍽',  label: 'Dinner',      color: '#7C3AED' },
  drinks:     { icon: '🍷', label: 'Drinks',      color: '#B87333' },
  poi:        { icon: '📍', label: 'Activity',    color: '#2563EB' },
  fuel:       { icon: '⛽', label: 'Fuel Up',     color: '#DC2626' },
  camp:       { icon: '⛺', label: 'Camp',        color: '#3A6B4F' },
  arrive:     { icon: '🏁', label: 'Arrive',      color: '#3A6B4F' },
  sunset:     { icon: '🌅', label: 'Sunset',      color: '#F97316' },
  stargazing: { icon: '🌟', label: 'Stargazing',  color: '#4338CA' },
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const isHighlight = item.is_highlight
  const typeMeta = STEP_TYPE_LABEL[item.type]

  return (
    <div className="schedule-item">
      <div className={`schedule-dot${isHighlight ? ' highlight' : ''}`} style={{ flexShrink: 0 }}>
        {item.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {typeMeta && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: 11 }}>{typeMeta.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: typeMeta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {typeMeta.label}
                </span>
              </div>
            )}
            <span style={{
              fontSize: 14,
              fontWeight: isHighlight ? 700 : 500,
              color: isHighlight ? 'var(--text-primary)' : 'var(--text-secondary)',
              lineHeight: 1.3,
              display: 'block',
            }}>
              {item.title}
            </span>
          </div>
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
        {item.duration_min > 0 && item.type !== 'depart' && item.type !== 'arrive' && item.type !== 'camp' && (
          <span style={{
            display: 'inline-block',
            fontSize: 10,
            color: 'var(--text-muted)',
            marginTop: 3,
          }}>
            ~{item.duration_min} min
          </span>
        )}
      </div>
    </div>
  )
}
