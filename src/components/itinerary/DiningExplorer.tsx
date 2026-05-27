import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { fetchRouteFoodStops, type RouteFoodStop } from '@/lib/overpass'

const GREEN = '#3A6B4F'

const TYPE_CFG: Record<RouteFoodStop['type'], { label: string; emoji: string; stopMin: number }> = {
  cafe:      { label: 'Cafes',        emoji: '☕', stopMin: 20 },
  bakery:    { label: 'Bakeries',     emoji: '🥐', stopMin: 15 },
  restaurant:{ label: 'Restaurants',  emoji: '🍽', stopMin: 60 },
  pub:       { label: 'Pubs & Bars',  emoji: '🍺', stopMin: 45 },
  winery:    { label: 'Wineries',     emoji: '🍷', stopMin: 60 },
  roadhouse: { label: 'Roadhouses',   emoji: '⛽', stopMin: 15 },
}

const ORDER: RouteFoodStop['type'][] = ['cafe', 'bakery', 'restaurant', 'pub', 'winery', 'roadhouse']

export function DiningExplorer() {
  const originCoord = useAppStore((s) => s.originCoord)
  const destCoord = useAppStore((s) => s.destCoord)
  const destName = useAppStore((s) => s.destName)
  const diningPrefs = useAppStore((s) => s.diningPrefs)
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const setWizardOpen = useAppStore((s) => s.setWizardOpen)

  const [stops, setStops] = useState<RouteFoodStop[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | RouteFoodStop['type']>('all')

  const wantsFood = diningPrefs.length > 0 && !diningPrefs.every((p) => p === 'SelfCatering')

  useEffect(() => {
    if (!activeItinerary || !wantsFood) { setStops([]); return }
    setLoading(true)
    fetchRouteFoodStops(originCoord, destCoord, diningPrefs as any)
      .then(setStops)
      .catch(() => setStops([]))
      .finally(() => setLoading(false))
  }, [activeItinerary?.id, wantsFood])

  if (!activeItinerary) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🍽</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
          Plan a trip first to find food stops on your route.
        </p>
      </div>
    )
  }

  if (!wantsFood) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>☕</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
          You haven't selected any food preferences for this trip.
        </p>
        <button
          onClick={() => setWizardOpen(true)}
          style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--bg-muted)', color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Update trip preferences →
        </button>
      </div>
    )
  }

  const visible = filter === 'all' ? (stops ?? []) : (stops ?? []).filter((s) => s.type === filter)
  const availableTypes = new Set((stops ?? []).map((s) => s.type))

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
          Food & drink on the way to {destName.split('&')[0].trim()}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10 }}>
          Real places from OpenStreetMap · sorted by distance off route
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          <button
            onClick={() => setFilter('all')}
            style={chipStyle(filter === 'all')}
          >
            All
          </button>
          {ORDER.filter((t) => availableTypes.has(t)).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={chipStyle(filter === type)}
            >
              {TYPE_CFG[type].emoji} {TYPE_CFG[type].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{
                height: 72, borderRadius: 10, background: 'var(--bg-muted)',
                border: '1px solid var(--border)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
            ))}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
              Finding cafes, restaurants & more along your route…
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '24px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🤷</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
              {stops === null
                ? 'Loading…'
                : stops.length === 0
                  ? 'No places found on this route. OSM coverage varies — try a different filter or check Google Maps.'
                  : `No ${TYPE_CFG[filter as RouteFoodStop['type']]?.label ?? ''} found. Try "All".`
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map((stop) => <FoodStopCard key={stop.id} stop={stop} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function FoodStopCard({ stop }: { stop: RouteFoodStop }) {
  const cfg = TYPE_CFG[stop.type]
  const isOnRoute = stop.distanceFromRouteKm < 1

  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(stop.name)}/@${stop.lat},${stop.lng},15z`

  return (
    <div style={{
      borderRadius: 10,
      background: 'var(--bg-surface)',
      border: `1px solid ${isOnRoute ? 'rgba(58,107,79,0.25)' : 'var(--border)'}`,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 15 }}>{cfg.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{stop.name}</span>
            {isOnRoute && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: GREEN,
                background: 'var(--green-light)', border: '1px solid rgba(58,107,79,0.2)',
                padding: '1px 7px', borderRadius: 5, textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                On route
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {cfg.label}{stop.cuisine ? ` · ${stop.cuisine}` : ''}
            </span>
            {stop.distanceFromRouteKm > 0 && (
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {stop.distanceFromRouteKm} km off route
              </span>
            )}
            <span style={{
              fontSize: 11.5, fontWeight: 600,
              color: stop.extraStopMin <= 25 ? GREEN : '#B87333',
            }}>
              +{stop.extraStopMin} min stop
            </span>
          </div>

          {stop.openingHours && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              {stop.openingHours.split(';')[0]}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11.5, fontWeight: 700, color: '#fff',
              background: '#1C1C1A', padding: '5px 11px', borderRadius: 7,
              textDecoration: 'none', display: 'block', textAlign: 'center',
            }}
          >
            Maps ↗
          </a>
          {stop.website && (
            <a
              href={stop.website.startsWith('http') ? stop.website : `https://${stop.website}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11, color: GREEN, fontWeight: 600,
                textDecoration: 'none', display: 'block', textAlign: 'center',
              }}
            >
              Website ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    padding: '5px 11px', borderRadius: 7,
    background: active ? '#1C1C1A' : 'var(--bg-base)',
    color: active ? '#fff' : 'var(--text-muted)',
    border: `1.5px solid ${active ? '#1C1C1A' : 'var(--border)'}`,
    fontSize: 11.5, fontWeight: active ? 700 : 500,
    cursor: 'pointer', transition: 'all 0.12s',
    whiteSpace: 'nowrap' as const,
  }
}
