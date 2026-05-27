import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { fetchRouteFoodStops, type RouteFoodStop } from '@/lib/overpass'

const GREEN = '#3A6B4F'
const WARM = '#B87333'

const TYPE_EMOJI: Record<RouteFoodStop['type'], string> = {
  cafe: '☕', bakery: '🥐', restaurant: '🍽', pub: '🍺', winery: '🍷', roadhouse: '⛽',
}

export function FoodTile() {
  const originCoord = useAppStore((s) => s.originCoord)
  const destCoord = useAppStore((s) => s.destCoord)
  const destName = useAppStore((s) => s.destName)
  const diningPrefs = useAppStore((s) => s.diningPrefs)
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const addDiningStop = useAppStore((s) => s.addDiningStop)
  const addedDiningStops = useAppStore((s) => s.addedDiningStops)

  const [stops, setStops] = useState<RouteFoodStop[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingStop, setPendingStop] = useState<RouteFoodStop | null>(null)

  const wantsFood = diningPrefs.length > 0 && !diningPrefs.every((p) => p === 'SelfCatering')

  useEffect(() => {
    if (!activeItinerary || !wantsFood) { setStops([]); return }
    setLoading(true)
    fetchRouteFoodStops(originCoord, destCoord, diningPrefs as any)
      .then(setStops)
      .catch(() => setStops([]))
      .finally(() => setLoading(false))
  }, [activeItinerary?.id, wantsFood]) // eslint-disable-line react-hooks/exhaustive-deps

  const addedIds = new Set(addedDiningStops.map((s) => s.foodId))
  const visible = (stops ?? []).slice(0, 6)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: '9px 14px 7px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>
            Food on Route ☕
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {!activeItinerary ? 'Plan a trip to see stops' : `Towards ${destName.split('&')[0].trim()}`}
          </div>
        </div>
        {addedDiningStops.length > 0 && (
          <div style={{
            fontSize: 10, fontWeight: 700, color: GREEN,
            background: 'var(--green-light)', border: '1px solid rgba(58,107,79,0.2)',
            padding: '2px 8px', borderRadius: 5,
          }}>
            {addedDiningStops.length} added
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {!activeItinerary || !wantsFood ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            {!activeItinerary ? '🗺 Plan a trip first' : '☕ No food preferences selected'}
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '4px 0' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 50, borderRadius: 8, background: 'var(--bg-muted)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No places found on this route
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {visible.map((stop) => (
              <CompactFoodCard
                key={stop.id}
                stop={stop}
                added={addedIds.has(stop.id)}
                onAdd={() => setPendingStop(stop)}
                onRemove={() => useAppStore.getState().removeDiningStop(stop.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add-time modal */}
      {pendingStop && (
        <AddTimeModal
          stop={pendingStop}
          onConfirm={(timeOfDay) => {
            const dayNumber = activeItinerary?.days[0]?.day_number ?? 1
            addDiningStop({
              foodId: pendingStop.id,
              stopName: pendingStop.name,
              stopLat: pendingStop.lat,
              stopLng: pendingStop.lng,
              timeOfDay,
              dayNumber,
            })
            setPendingStop(null)
          }}
          onClose={() => setPendingStop(null)}
        />
      )}
    </div>
  )
}

function CompactFoodCard({
  stop, added, onAdd, onRemove,
}: {
  stop: RouteFoodStop
  added: boolean
  onAdd: () => void
  onRemove: () => void
}) {
  const isClose = stop.distanceFromRouteKm < 1

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 8,
      background: 'var(--bg-card)',
      border: `1px solid ${added ? 'rgba(58,107,79,0.3)' : isClose ? 'rgba(58,107,79,0.15)' : 'var(--border)'}`,
    }}>
      <div style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_EMOJI[stop.type]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {stop.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
          {isClose
            ? <span style={{ color: GREEN, fontWeight: 600 }}>On route</span>
            : <span>{stop.distanceFromRouteKm}km off</span>
          }
          <span>+{stop.extraStopMin}min</span>
        </div>
      </div>
      {added ? (
        <button
          onClick={onRemove}
          style={{
            flexShrink: 0, fontSize: 10, fontWeight: 700,
            color: GREEN, background: 'var(--green-light)',
            border: '1px solid rgba(58,107,79,0.25)',
            padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
          }}
        >
          Added ✓
        </button>
      ) : (
        <button
          onClick={onAdd}
          style={{
            flexShrink: 0, fontSize: 10, fontWeight: 700,
            color: '#fff', background: '#1C1C1A',
            border: 'none',
            padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
          }}
        >
          + Add
        </button>
      )}
    </div>
  )
}

function AddTimeModal({
  stop, onConfirm, onClose,
}: {
  stop: RouteFoodStop
  onConfirm: (timeOfDay: 'morning' | 'afternoon') => void
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          padding: '24px 28px', maxWidth: 320, width: '90%',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 8, textAlign: 'center' }}>
          {TYPE_EMOJI[stop.type]}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 4 }}>
          When do you want to stop?
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>
          {stop.name}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => onConfirm('morning')}
            style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'var(--green-light)', border: '1.5px solid rgba(58,107,79,0.3)',
              color: GREEN, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}
          >
            <span>Morning</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
              First leg — early stop
            </span>
          </button>
          <button
            onClick={() => onConfirm('afternoon')}
            style={{
              padding: '12px 16px', borderRadius: 10,
              background: '#FFF5EB', border: `1.5px solid rgba(184,115,51,0.3)`,
              color: WARM, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}
          >
            <span>Afternoon</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
              Second leg — midday break
            </span>
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: '100%',
            padding: '9px', borderRadius: 8,
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
