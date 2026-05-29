import { useAppStore } from '@/store/useAppStore'
import type { ScheduleItemType } from '@/types'

const GREEN = '#3A6B4F'
const WARM  = '#B87333'

const STEP_ICON: Record<ScheduleItemType, string> = {
  depart:     '🚗',
  drive:      '🛣️',
  breakfast:  '☕',
  lunch:      '🥗',
  dinner:     '🍽️',
  drinks:     '🍷',
  poi:        '📍',
  fuel:       '⛽',
  camp:       '⛺',
  arrive:     '🏁',
  sunset:     '🌅',
  stargazing: '🌟',
}

// Map schedule item types to ExperiencePanel section IDs for scroll-to
const STEP_SECTION: Partial<Record<ScheduleItemType, string>> = {
  breakfast:  'section-food',
  lunch:      'section-food',
  dinner:     'section-food',
  drinks:     'section-food',
  poi:        'section-activities',
  sunset:     'section-activities',
  stargazing: 'section-activities',
}

function fmtShortDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

export function ItineraryTimelinePanel() {
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const destName  = useAppStore((s) => s.destName)
  const originName = useAppStore((s) => s.originName)

  if (!activeItinerary) return null

  const scrollTo = (itemType: ScheduleItemType) => {
    const sectionId = STEP_SECTION[itemType]
    if (!sectionId) return
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#fff',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: '#fff',
      }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
          Trip Navigator
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#1C1B1F', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          {originName.split(',')[0]} → {destName.split(',')[0].split('&')[0].trim()}
        </div>
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, display: 'flex', gap: 8 }}>
          <span>{activeItinerary.total_days === 1 ? 'Day Trip' : `${activeItinerary.total_days} Days`}</span>
          <span>·</span>
          <span>{Math.round(activeItinerary.total_km)} km</span>
        </div>
      </div>

      {/* Scrollable timeline body */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
        {activeItinerary.days.map((day, dayIdx) => (
          <div key={day.day_number}>
            {/* Day label chip */}
            <div style={{
              padding: '10px 18px 5px',
              fontSize: 9.5,
              fontWeight: 800,
              color: GREEN,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: '#F8F7F4',
              borderTop: dayIdx > 0 ? '1px solid var(--border)' : undefined,
            }}>
              Day {day.day_number}{day.date ? ` · ${fmtShortDate(day.date)}` : ''}
            </div>

            {/* Schedule item rows */}
            {day.schedule.map((item, itemIdx) => {
              const canScroll = !!STEP_SECTION[item.type]
              const isEndpoint = item.type === 'depart' || item.type === 'arrive' || item.type === 'camp'
              const isDepart   = item.type === 'depart'
              const isLastItem = itemIdx === day.schedule.length - 1

              return (
                <div key={item.id} style={{ position: 'relative' }}>
                  {/* Connector line between items */}
                  {!isLastItem && (
                    <div style={{
                      position: 'absolute',
                      left: 28,
                      top: 38,
                      width: 2,
                      height: 'calc(100% - 30px)',
                      background: 'var(--border)',
                      zIndex: 0,
                    }} />
                  )}

                  <button
                    onClick={() => scrollTo(item.type)}
                    disabled={!canScroll}
                    title={canScroll ? `Go to ${item.title}` : undefined}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 16px 8px 14px',
                      background: 'none',
                      border: 'none',
                      cursor: canScroll ? 'pointer' : 'default',
                      textAlign: 'left',
                      transition: 'background 0.12s',
                      position: 'relative',
                      zIndex: 1,
                    }}
                    onMouseEnter={(e) => { if (canScroll) e.currentTarget.style.background = '#F0F4FF' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    {/* Icon dot */}
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      background: isEndpoint
                        ? (isDepart ? GREEN : WARM)
                        : '#F3F4F6',
                      border: isEndpoint ? 'none' : '1.5px solid var(--border)',
                      color: isEndpoint ? '#fff' : undefined,
                      position: 'relative',
                      zIndex: 2,
                    }}>
                      {STEP_ICON[item.type] ?? item.emoji}
                    </div>

                    {/* Label + time */}
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
                      <div style={{
                        fontSize: 12,
                        fontWeight: isEndpoint ? 700 : 500,
                        color: isEndpoint ? (isDepart ? GREEN : WARM) : '#374151',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginTop: 1 }}>
                        {item.time}
                      </div>
                    </div>

                    {canScroll && (
                      <span style={{ fontSize: 12, color: '#D1D5DB', flexShrink: 0, marginTop: 7 }}>›</span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
