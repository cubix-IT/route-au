import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { DayCard } from './DayCard'
import { GuardrailBanner } from './GuardrailBanner'
import { exportGPX } from '@/utils/gpxExport'
import { useWeather } from '@/hooks/useWeather'
import type { Activity, ActivityCategory } from '@/data/victorianActivities.ts'
import { useActivities } from '@/hooks/useActivities'
import type { Itinerary, RouteConstraintViolation } from '@/types'
import type { DayForecast } from '@/hooks/useWeather'
import { fetchLivePOIs, fetchWikipediaSummary, type LivePOI } from '@/lib/overpass'

export function ItineraryPanel() {
  const {
    activeItinerary, constraintViolations, userProfile,
    activeTab, setActiveTab, setWizardOpen,
  } = useAppStore()

  if (!userProfile) {
    return <EmptyWelcome onStart={() => setWizardOpen(true)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        {([
          ['itinerary', 'Your Plan'],
          ['pois', 'Things to Do'],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '14px 8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#B87333' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid #B87333' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'itinerary' && (
          <ItineraryTab
            itinerary={activeItinerary}
            violations={constraintViolations}
            onNewTrip={() => setWizardOpen(true)}
          />
        )}
        {activeTab === 'pois' && <ExploreTab />}
      </div>
    </div>
  )
}

// ── Empty welcome ──────────────────────────────────────────────────

function EmptyWelcome({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🗺️</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        Welcome to Unplanned Escapes
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6, maxWidth: 260 }}>
        Australia's offline-first road trip planner. Build your perfect itinerary in minutes.
      </p>
      <button
        onClick={onStart}
        style={{
          padding: '12px 28px', borderRadius: 12,
          background: 'var(--amber)', border: 'none',
          color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}
      >
        Plan My Trip →
      </button>
    </div>
  )
}

// ── Itinerary tab ──────────────────────────────────────────────────

function ItineraryTab({
  itinerary, violations, onNewTrip,
}: {
  itinerary: Itinerary | null
  violations: RouteConstraintViolation[]
  onNewTrip: () => void
}) {
  if (!itinerary) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛣️</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
          Your itinerary will appear here once you plan a trip.
        </p>
        <button
          onClick={onNewTrip}
          style={{
            padding: '10px 24px', borderRadius: 10,
            background: 'var(--amber-glow)', border: '1px solid var(--amber-dim)',
            color: 'var(--amber)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Plan a Trip
        </button>
      </div>
    )
  }

  const totalKm = Math.round(itinerary.total_km)
  const totalHrs = Math.round(itinerary.route.estimated_drive_hours)

  // Get destination coord from last waypoint for weather
  const waypoints = itinerary.route.waypoints
  const destCoord = waypoints.length > 0 ? waypoints[waypoints.length - 1].coord : null
  const weather = useWeather(destCoord)

  // Filter forecast to trip dates only
  const tripDates = itinerary.days.map((d) => d.date)
  const relevantForecast = weather?.forecast.filter((f) => tripDates.includes(f.date)) ?? []

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Trip summary card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(10,22,40,0) 60%)',
        border: '1px solid var(--border-active)',
        borderRadius: 16, padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
              {itinerary.name}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Starting {formatDateShort(itinerary.start_date)}
              {itinerary.end_date ? ` → ${formatDateShort(itinerary.end_date)}` : ''}
            </p>
          </div>
          <button
            onClick={() => exportGPX(itinerary)}
            title="Export GPX"
            style={{
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ↓ GPX
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Stat value={`${totalKm}km`} label="Distance" />
          <Stat value={`${itinerary.total_days}d`} label={itinerary.total_days === 1 ? 'Day' : 'Days'} />
          <Stat value={`${totalHrs}h`} label="Drive time" />
          <Stat value={`${itinerary.days.reduce((n, d) => n + d.schedule.length, 0)}`} label="Stops" />
        </div>
      </div>

      {/* Weather strip */}
      {(weather || relevantForecast.length > 0) && (
        <WeatherStrip
          destName={waypoints[waypoints.length - 1]?.label ?? 'Destination'}
          current={weather ? { temp: weather.currentTemp, emoji: weather.currentEmoji, label: weather.currentLabel } : null}
          forecast={relevantForecast}
        />
      )}

      {/* Constraint violations */}
      {violations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {violations.map((v) => (
            <div key={`${v.segment_id}-${v.reason}`} style={{
              fontSize: 12, color: 'var(--red)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, padding: '8px 12px',
            }}>
              ⚠ {v.detail}
            </div>
          ))}
        </div>
      )}

      {/* Mandatory global warnings */}
      {itinerary.all_warnings
        .filter((w) => w.severity === 'MANDATORY_STOP')
        .map((w) => <GuardrailBanner key={w.id} warning={w} />)
      }

      {/* Day cards */}
      {itinerary.days.map((day) => (
        <DayCard key={day.day_number} day={day} />
      ))}

      {/* Re-plan */}
      <button
        onClick={onNewTrip}
        style={{
          marginTop: 4, padding: '12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
          width: '100%',
        }}
      >
        ✦ Plan a Different Trip
      </button>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  )
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ── Explore tab — destination activities ──────────────────────────

type FilterKey = 'all' | ActivityCategory

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'nature', label: 'Nature' },
  { key: 'active', label: 'Active' },
  { key: 'wildlife', label: 'Wildlife' },
  { key: 'history', label: 'History' },
  { key: 'art', label: 'Art & Culture' },
  { key: 'family', label: 'Family' },
  { key: 'relaxation', label: 'Relaxation' },
]

import { GREEN } from '@/lib/brand'
const GREEN_EXPLORE = GREEN

const POI_CFG_EXPLORE: Record<LivePOI['type'], { label: string; emoji: string }> = {
  pub:        { label: 'Pubs',              emoji: '🍺' },
  winery:     { label: 'Wineries',           emoji: '🍷' },
  brewery:    { label: 'Breweries',          emoji: '🍺' },
  distillery: { label: 'Distilleries',       emoji: '🥃' },
  viewpoint:  { label: 'Viewpoints & Peaks', emoji: '👁' },
  attraction: { label: 'Attractions',        emoji: '🏛' },
  hiking:     { label: 'Hiking routes',      emoji: '🥾' },
}

function ExploreTab() {
  const destId = useAppStore((s) => s.destId)
  const destName = useAppStore((s) => s.destName)
  const destCoord = useAppStore((s) => s.destCoord)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showLocalOnly, setShowLocalOnly] = useState(false)
  const [livePOIs, setLivePOIs] = useState<LivePOI[] | null>(null)
  const [livePOIsLoading, setLivePOIsLoading] = useState(false)
  const [wikiSummary, setWikiSummary] = useState<string | null>(null)

  const { activities: allActivities } = useActivities(destId)

  // Fetch live POIs from Overpass to supplement (or replace) sparse static data
  useEffect(() => {
    if (!destCoord || livePOIs !== null) return
    setLivePOIsLoading(true)
    Promise.all([
      fetchLivePOIs(destId, destCoord.lat, destCoord.lng),
      fetchWikipediaSummary(destId, destName),
    ]).then(([pois, wiki]) => {
      setLivePOIs(pois)
      setWikiSummary(wiki)
      setLivePOIsLoading(false)
    }).catch(() => {
      setLivePOIs([])
      setLivePOIsLoading(false)
    })
  }, [destId, destCoord?.lat, destCoord?.lng, destName])

  const visible = allActivities.filter((a) => {
    if (filter !== 'all' && a.category !== filter) return false
    if (showLocalOnly && !a.isHiddenGem) return false
    return true
  })

  const availableCategories = new Set(allActivities.map((a) => a.category))
  const activeFilters = FILTER_LABELS.filter(
    (f) => f.key === 'all' || availableCategories.has(f.key as ActivityCategory)
  )

  // Group live POIs by type, cap at 5 per type
  const nonFoodLivePOIs = livePOIs ?? []
  const byType: Partial<Record<LivePOI['type'], LivePOI[]>> = {}
  for (const poi of nonFoodLivePOIs) {
    if (!byType[poi.type]) byType[poi.type] = []
    if (byType[poi.type]!.length < 5) byType[poi.type]!.push(poi)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          Things to do in {destName.split('&')[0].trim()}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10 }}>
          {allActivities.length > 0 ? `${allActivities.length} curated experience${allActivities.length !== 1 ? 's' : ''}` : 'Live data from OpenStreetMap'} — tap any for directions
        </div>

        {allActivities.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {activeFilters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  flexShrink: 0,
                  padding: '5px 11px', borderRadius: 7,
                  background: filter === key ? '#1C1C1A' : 'var(--bg-base)',
                  color: filter === key ? '#fff' : 'var(--text-muted)',
                  border: `1.5px solid ${filter === key ? '#1C1C1A' : 'var(--border)'}`,
                  fontSize: 11.5, fontWeight: filter === key ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowLocalOnly((v) => !v)}
              style={{
                flexShrink: 0,
                padding: '5px 11px', borderRadius: 7,
                background: showLocalOnly ? '#B87333' : 'var(--bg-base)',
                color: showLocalOnly ? '#fff' : '#B87333',
                border: `1.5px solid ${showLocalOnly ? '#B87333' : '#E8C898'}`,
                fontSize: 11.5, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.12s',
                whiteSpace: 'nowrap',
              }}
            >
              Local favourites
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
        {/* Wikipedia fact */}
        {wikiSummary && (
          <div style={{
            padding: '10px 13px', borderRadius: 9, marginBottom: 12,
            background: '#F0F4F1', border: '1px solid rgba(58,107,79,0.15)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GREEN_EXPLORE, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              About {destName.split('&')[0].trim()}
            </div>
            <p style={{ fontSize: 12.5, color: '#4A4948', lineHeight: 1.65, margin: 0 }}>{wikiSummary}</p>
          </div>
        )}

        {/* Curated static activities */}
        {visible.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Curated experiences
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {visible.map((act) => <ActivityCard key={act.id} activity={act} />)}
            </div>
          </>
        )}

        {/* Live Overpass POIs (non-food) */}
        {livePOIsLoading ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: GREEN_EXPLORE, animation: 'pulse 1.2s ease-in-out infinite' }} />
            Finding trails, viewpoints & attractions nearby…
          </div>
        ) : nonFoodLivePOIs.length > 0 ? (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              From OpenStreetMap
            </div>
            {(['hiking', 'viewpoint', 'attraction', 'winery', 'brewery', 'distillery', 'pub'] as LivePOI['type'][]).map((type) => {
              const items = byType[type]
              if (!items?.length) return null
              const cfg = POI_CFG_EXPLORE[type]
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4A4948', marginBottom: 5 }}>
                    {cfg.emoji} {cfg.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.map((poi) => (
                      <div key={poi.id} style={{
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        padding: '8px 11px', borderRadius: 8,
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{poi.name}</span>
                          {poi.routeLength && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 7 }}>{poi.routeLength}</span>
                          )}
                        </div>
                        {poi.website && (
                          <a
                            href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, color: '#4285F4', fontWeight: 600, textDecoration: 'none', marginLeft: 8, flexShrink: 0 }}
                          >
                            Website ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        ) : allActivities.length === 0 && !livePOIsLoading ? (
          <div style={{ padding: '16px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗺</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
              Plan a trip to a destination to see what's there.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ActivityCard({ activity: act }: { activity: Activity }) {
  const costMap: Record<string, string> = { free: 'Free', '$': 'Budget', '$$': 'Mid-range', '$$$': 'Premium' }
  const costColor: Record<string, string> = {
    free: GREEN, '$': 'var(--text-muted)', '$$': '#B87333', '$$$': '#C94040',
  }

  return (
    <div style={{
      borderRadius: 11,
      background: act.isHiddenGem ? '#FEFAF5' : 'var(--bg-surface)',
      border: `1px solid ${act.isHiddenGem ? '#E8C89870' : 'var(--border)'}`,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {act.name}
              </span>
              {act.isHiddenGem && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#B87333',
                  background: '#FFF0D8', border: '1px solid #E8C89880',
                  padding: '1px 7px', borderRadius: 5,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  Local favourite
                </span>
              )}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {act.description}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{act.duration}</span>
          <span style={{ fontSize: 11.5, color: costColor[act.cost], fontWeight: 600 }}>
            {costMap[act.cost]}
          </span>
          {act.kidsOk && (
            <span style={{ fontSize: 11.5, color: '#D97706', fontWeight: 600 }}>Kid Friendly</span>
          )}
          <a
            href={act.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 'auto',
              fontSize: 12, fontWeight: 700, color: '#fff',
              background: '#1C1C1A',
              padding: '5px 12px', borderRadius: 7,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            Directions ↗
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Weather strip ──────────────────────────────────────────────────

function WeatherStrip({
  destName, current, forecast,
}: {
  destName: string
  current: { temp: number; emoji: string; label: string } | null
  forecast: DayForecast[]
}) {
  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-AU', { weekday: 'short' })
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 14, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Weather at {destName}
        </div>
        {current && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 16 }}>{current.emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{current.temp}°</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{current.label}</span>
          </div>
        )}
      </div>

      {forecast.length > 0 ? (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {forecast.map((day) => (
            <div key={day.date} style={{
              flexShrink: 0, textAlign: 'center',
              background: 'var(--bg-muted)', borderRadius: 10,
              padding: '8px 10px', minWidth: 56,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                {formatDay(day.date)}
              </div>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{day.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{day.maxTemp}°</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{day.minTemp}°</div>
              {day.precipMm > 0 && (
                <div style={{ fontSize: 9, color: '#4d9fff', marginTop: 2 }}>{day.precipMm}mm</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {current ? 'Forecast not yet available for trip dates.' : 'Loading forecast…'}
        </div>
      )}
    </div>
  )
}
