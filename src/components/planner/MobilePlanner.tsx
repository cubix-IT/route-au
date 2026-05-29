/**
 * Mobile planner — Material You / Android 17 design.
 * No tabs. One scrollable page: map hero → trip card → food → activities → route stops.
 */
import { useState } from 'react'
import { MapContainer } from '@/components/map/MapContainer'
import { usePlannerData } from '@/hooks/usePlannerData'
import { useAppStore } from '@/store/useAppStore'
import type { LivePOI, RouteFoodStop } from '@/lib/overpass'
import type { HazardAlert } from '@/lib/vicEmergency'
import type { Activity } from '@/data/victorianActivities'

const GREEN = '#3A6B4F'
const WARM  = '#B87333'

const POI_TAG: Record<LivePOI['type'], { emoji: string; label: string; color: string; bg: string }> = {
  hiking:     { emoji: '🥾', label: 'Hiking',      color: '#2563EB', bg: '#EFF6FF' },
  viewpoint:  { emoji: '👁',  label: 'Scenic View', color: '#4338CA', bg: '#EEF2FF' },
  attraction: { emoji: '🏛',  label: 'Attraction',  color: '#7C3AED', bg: '#F5F3FF' },
  cafe:       { emoji: '☕', label: 'Cafe',         color: '#92400E', bg: '#FFFBEB' },
  restaurant: { emoji: '🍽',  label: 'Restaurant',  color: '#B45309', bg: '#FEF3C7' },
  pub:        { emoji: '🍺',  label: 'Pub',         color: '#B87333', bg: '#FFF5EB' },
  fast_food:  { emoji: '🥡',  label: 'Takeaway',    color: '#9A3412', bg: '#FFF7ED' },
  bakery:     { emoji: '🥐',  label: 'Bakery',      color: '#92400E', bg: '#FFFBEB' },
  winery:     { emoji: '🍷',  label: 'Winery',      color: '#7E22CE', bg: '#FAF5FF' },
}

const CAT_TAG: Record<string, { label: string; color: string; bg: string }> = {
  nature:     { label: 'Nature',        color: '#2D7A4A', bg: '#E8F5EE' },
  active:     { label: 'Outdoor',       color: '#2563EB', bg: '#EFF6FF' },
  wildlife:   { label: 'Wildlife',      color: '#047857', bg: '#ECFDF5' },
  history:    { label: 'History',       color: '#7C3AED', bg: '#F5F3FF' },
  art:        { label: 'Art & Culture', color: '#DB2777', bg: '#FDF2F8' },
  family:     { label: 'Family',        color: '#D97706', bg: '#FFFBEB' },
  relaxation: { label: 'Leisure',       color: '#0891B2', bg: '#ECFEFF' },
  food:       { label: 'Food',          color: '#B45309', bg: '#FEF3C7' },
  drink:      { label: 'Drink',         color: '#B87333', bg: '#FFF5EB' },
  markets:    { label: 'Markets',       color: '#059669', bg: '#ECFDF5' },
  viewpoint:  { label: 'Scenic View',   color: '#4338CA', bg: '#EEF2FF' },
}

const FOOD_CFG: Record<RouteFoodStop['type'], { emoji: string; label: string }> = {
  cafe:       { emoji: '☕', label: 'Cafe' },
  bakery:     { emoji: '🥐', label: 'Bakery' },
  restaurant: { emoji: '🍽', label: 'Restaurant' },
  pub:        { emoji: '🍺', label: 'Pub' },
  winery:     { emoji: '🍷', label: 'Winery' },
  roadhouse:  { emoji: '⛽', label: 'Roadhouse' },
}

export function MobilePlanner() {
  const d = usePlannerData()
  const clearItinerary = useAppStore((s) => s.clearItinerary)
  const [addModal, setAddModal] = useState<RouteFoodStop | null>(null)

  if (!d.activeItinerary) return null

  const addedIds = new Set(d.addedDiningStops.map((s) => s.foodId))
  const availableRouteStops = (d.routeFood ?? []).filter((s) => !addedIds.has(s.id))

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#F0EDE8', WebkitOverflowScrolling: 'touch' }}>

      {/* ── Map hero ── */}
      <div style={{ height: 210, position: 'relative', flexShrink: 0 }}>
        <MapContainer />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, background: 'linear-gradient(transparent, #F0EDE8)', pointerEvents: 'none' }} />
      </div>

      {/* ── Destination card ── */}
      <div style={{ padding: '0 14px', marginTop: -24, position: 'relative', zIndex: 2 }}>
        <div style={{ background: '#fff', borderRadius: 28, padding: '20px 20px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>

          <button onClick={clearItinerary} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: GREEN, padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← New search
          </button>

          <div style={{ fontSize: 28, fontWeight: 900, color: '#1C1B1F', lineHeight: 1.1, marginBottom: 4 }}>
            {d.shortDest}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            from {d.shortOrigin}
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: d.wikiSummary ? 16 : 0 }}>
            <MStatCard icon="🚗" label="Drive time" value={`${d.driveHours}h`} color="#1C1B1F" bg="#F3F4F6" />
            <MStatCard icon="📍" label="Distance" value={`${d.totalKm} km`} color="#1C1B1F" bg="#F3F4F6" />
            {d.fuelCost && <MStatCard icon="⛽" label="Est. fuel cost" value={d.fuelCost} color={WARM} bg="#FFF5EB" />}
            <MStatCard icon={d.seasonMeta.emoji} label="Right now" value={d.seasonMeta.label} color="#4338CA" bg="#EEF2FF" />
          </div>

          {/* About */}
          {d.wikiSummary && (
            <div style={{ borderTop: '1px solid #F3F0EC', paddingTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>About</div>
              <p style={{ margin: 0, fontSize: 13.5, color: '#374151', lineHeight: 1.7 }}>
                {d.wikiSummary.length > 240 ? d.wikiSummary.slice(0, 240) + '…' : d.wikiSummary}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Hazard alerts ── */}
      {d.hazards.length > 0 && (
        <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.hazards.slice(0, 2).map((h) => <MHazardBanner key={h.id} alert={h} />)}
        </div>
      )}

      {/* ── Where to Eat & Drink callout ── */}
      <div style={{ padding: '14px 14px 0' }}>
        <MFoodCallout count={d.foodPOIs.length} pois={d.foodPOIs} loading={d.livePOIs === null} destName={d.shortDest} />
        <a
          href={`https://www.google.com/maps/search/?api=1&query=Food+near+${encodeURIComponent(d.shortDest)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, color: WARM, fontWeight: 600, textDecoration: 'none' }}
        >
          Find more food near {d.shortDest} ↗
        </a>
      </div>

      {/* ── Fuel coming soon ── */}
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ background: '#F0F4FF', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 18, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>⛽</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1E40AF' }}>Live fuel prices</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Coming soon via Service Victoria</div>
          </div>
        </div>
      </div>

      {/* ── Things to Do ── */}
      <MSection title="Things to Do" emoji="🗺" loading={d.livePOIs === null && d.activities.length === 0} empty={d.activities.length === 0 && d.activityPOIs.length === 0} emptyMsg={`No activities listed for ${d.shortDest} yet.`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 14px' }}>
          {d.activities.map((act) => <MActivityCard key={act.id} act={act} />)}
          {d.activityPOIs.length > 0 && d.activities.length > 0 && (
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 0 2px' }}>Nearby on OpenStreetMap</div>
          )}
          {d.activityPOIs.map((poi) => <MPoiCard key={poi.id} poi={poi} />)}
        </div>
      </MSection>

      {/* ── Stops on Your Way ── */}
      {(d.addedDiningStops.length > 0 || (d.routeFood && d.routeFood.length > 0)) && (
        <MSection title="Stops on Your Way" emoji="🚗" loading={d.routeFood === null} empty={false} emptyMsg="">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 14px' }}>
            {d.addedDiningStops.map((stop) => (
              <div key={stop.foodId} style={{ background: '#E8F5EE', borderRadius: 16, border: '1px solid rgba(58,107,79,0.2)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: GREEN }}>{stop.stopName}</div>
                  <div style={{ fontSize: 12, color: '#49454F', marginTop: 2 }}>{stop.timeOfDay === 'morning' ? '🌅 Morning stop' : '☀️ Afternoon stop'}</div>
                </div>
                <button onClick={() => d.removeDiningStop(stop.foodId)} style={{ padding: '7px 14px', borderRadius: 100, border: '1.5px solid rgba(58,107,79,0.4)', background: 'transparent', color: GREEN, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
            {availableRouteStops.map((stop) => {
              const cfg = FOOD_CFG[stop.type]
              return (
                <div key={stop.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{cfg.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <MPillChip label={cfg.label} color="#B45309" bg="#FEF3C7" />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1B1F', marginTop: 5, marginBottom: 2 }}>{stop.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      {stop.distanceFromRouteKm < 0.5 ? 'Right on route' : `${stop.distanceFromRouteKm.toFixed(1)} km off route`}
                      {stop.extraStopMin > 0 && ` · +${stop.extraStopMin} min`}
                    </div>
                  </div>
                  <button onClick={() => setAddModal(stop)} style={{ padding: '8px 14px', borderRadius: 100, border: `1.5px solid ${GREEN}`, background: '#E8F5EE', color: GREEN, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', marginTop: 2 }}>+ Add</button>
                </div>
              )
            })}
          </div>
        </MSection>
      )}

      {/* Bottom padding for safe area */}
      <div style={{ height: 48 }} />

      {/* ── Bottom sheet modal ── */}
      {addModal && (
        <div onClick={() => setAddModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '20px 24px 44px', width: '100%', maxWidth: 480, boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D0CECE', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 19, fontWeight: 900, color: '#1C1B1F', marginBottom: 6 }}>Add a stop</div>
            <div style={{ fontSize: 14, color: '#49454F', marginBottom: 24 }}>When do you want to stop at <strong>{addModal.name}</strong>?</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { d.addDiningStop({ foodId: addModal.id, stopName: addModal.name, stopLat: addModal.lat, stopLng: addModal.lng, timeOfDay: 'morning', dayNumber: 1 }); setAddModal(null) }} style={{ flex: 1, padding: '16px', borderRadius: 16, border: `2px solid ${GREEN}`, background: '#E8F5EE', color: GREEN, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>🌅 Morning</button>
              <button onClick={() => { d.addDiningStop({ foodId: addModal.id, stopName: addModal.name, stopLat: addModal.lat, stopLng: addModal.lng, timeOfDay: 'afternoon', dayNumber: 1 }); setAddModal(null) }} style={{ flex: 1, padding: '16px', borderRadius: 16, border: `2px solid ${WARM}`, background: '#FFF5EB', color: WARM, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>☀️ Afternoon</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hazard banner ─────────────────────────────────────────────────────────────

function MHazardBanner({ alert }: { alert: HazardAlert }) {
  const urgent = alert.severity === 'urgent'
  const bg     = urgent ? '#FEF2F2' : '#FFFBEB'
  const border  = urgent ? 'rgba(220,38,38,0.25)' : 'rgba(217,119,6,0.3)'
  const color   = urgent ? '#B91C1C' : '#B45309'
  const icon    = alert.category === 'Flooding' ? '🌊' : alert.category === 'Met' ? '⛈️' : '🔥'

  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 3 }}>
          {alert.category} — {alert.status}
        </div>
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 4 }}>{alert.title}</div>
        <div style={{ fontSize: 11, color, fontWeight: 600 }}>{alert.distanceKm} km from {alert.distanceKm < 50 ? 'your destination' : 'the area'}</div>
      </div>
      {alert.url && (
        <a href={alert.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, fontWeight: 700, color, textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 12px', border: `1.5px solid ${border}`, borderRadius: 100, background: '#fff', flexShrink: 0 }}>
          Details ↗
        </a>
      )}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function MSection({ title, emoji, loading, empty, emptyMsg, children }: {
  title: string; emoji: string; loading: boolean; empty: boolean; emptyMsg: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 10px' }}>
        <span style={{ fontSize: 17 }}>{emoji}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1C1B1F' }}>{title}</span>
      </div>
      {loading
        ? <div style={{ padding: '12px 14px', fontSize: 13, color: '#9CA3AF' }}>Loading…</div>
        : empty
          ? <div style={{ padding: '12px 14px', fontSize: 13, color: '#9CA3AF' }}>{emptyMsg}</div>
          : children}
    </div>
  )
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function mFoodTypesSummary(pois: LivePOI[]): string {
  const types = new Set(pois.map((p) => p.type))
  const labels: string[] = []
  if (types.has('cafe')) labels.push('cafes')
  if (types.has('restaurant')) labels.push('restaurants')
  if (types.has('pub')) labels.push('pubs')
  if (types.has('winery')) labels.push('wineries')
  if (types.has('bakery')) labels.push('bakeries')
  if (labels.length === 0) return 'cafes, restaurants & more'
  return labels.length <= 3 ? labels.join(', ') : `${labels.slice(0, 3).join(', ')} & more`
}

function MFoodCallout({ count, pois, loading, destName }: { count: number; pois: LivePOI[]; loading: boolean; destName: string }) {
  return (
    <div style={{ background: '#FEF9F0', border: '1px solid rgba(184,115,51,0.2)', borderRadius: 18, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FDE8C8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🍽</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1C1B1F', lineHeight: 1.3 }}>
          {loading ? 'Finding food nearby…' : count > 0 ? `${count} places to eat near ${destName}` : `Food near ${destName}`}
        </div>
        {!loading && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{mFoodTypesSummary(pois)}</div>}
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=Food+near+${encodeURIComponent(destName)}`}
        target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 12, fontWeight: 700, color: WARM, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, padding: '8px 14px', border: '1.5px solid rgba(184,115,51,0.35)', borderRadius: 100, background: '#fff' }}
      >
        Explore ↗
      </a>
    </div>
  )
}

function MActivityCard({ act }: { act: Activity }) {
  const tag = CAT_TAG[act.category] ?? { label: act.category, color: '#374151', bg: '#F3F4F6' }
  return (
    <div style={{ background: '#fff', borderRadius: 18, border: act.isHiddenGem ? '1.5px solid rgba(184,115,51,0.3)' : '1px solid rgba(0,0,0,0.07)', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        <MPillChip label={tag.label} color={tag.color} bg={tag.bg} />
        {act.isHiddenGem && <MPillChip label="Local gem" color={WARM} bg="#FFF5EB" />}
        {act.cost === 'free' && <MPillChip label="Free" color={GREEN} bg="#E8F5EE" />}
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#1C1B1F', lineHeight: 1.25, marginBottom: 6 }}>{act.name}</div>
      {act.description && <div style={{ fontSize: 13, color: '#49454F', lineHeight: 1.65, marginBottom: 10 }}>{act.description.length > 140 ? act.description.slice(0, 140) + '…' : act.description}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#6B7280' }}>⏱ {act.duration}</span>
        <a href={act.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#1C1B1F', padding: '8px 16px', borderRadius: 100, textDecoration: 'none' }}>View ↗</a>
      </div>
    </div>
  )
}

function MPoiCard({ poi }: { poi: LivePOI }) {
  const tag = POI_TAG[poi.type]
  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: tag.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{tag.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <MPillChip label={tag.label} color={tag.color} bg={tag.bg} />
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1B1F', marginTop: 5, marginBottom: 2 }}>{poi.name}</div>
        {poi.routeLength && <div style={{ fontSize: 12, color: '#6B7280' }}>{poi.routeLength}</div>}
      </div>
      {poi.website && <a href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: '#4285F4', textDecoration: 'none', flexShrink: 0 }}>Site ↗</a>}
    </div>
  )
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function MStatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '10px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color }}>{icon} {value}</div>
    </div>
  )
}

function MPillChip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color, background: bg, padding: '3px 9px', borderRadius: 100, whiteSpace: 'nowrap' }}>{label}</span>
}

