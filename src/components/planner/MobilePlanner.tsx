import { useState, useEffect } from 'react'
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

function formatDrive(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

type FilterTab = 'explore' | 'eat' | 'stops'

const CAT_LABEL: Record<string, string> = {
  nature: '🌿 Nature', viewpoint: '🌄 Views', history: '🏛️ History',
  art: '🎨 Art', active: '🏄 Active', wildlife: '🦘 Wildlife',
  relaxation: '🧖 Relax', wellness: '♨️ Wellness', beach: '🏖️ Beach',
  entertainment: '🎵 Music', markets: '🛒 Markets', family: '👨‍👩‍👧 Family',
}

const NATURE_EMOJI: Record<string, string> = {
  hiking: '🥾', viewpoint: '🌄', beach: '🏖️', waterfall: '💧',
  national_park: '🌿', nature_reserve: '🌿', hot_spring: '♨️',
  lake: '💧', river: '💧', cave: '🦇', forest: '🌳',
  wetland: '🌿', summit: '⛰️', gorge: '🏔️',
}

export function MobilePlanner() {
  const d = usePlannerData()
  const clearItinerary = useAppStore((s) => s.clearItinerary)
  const setDisplayedMapPins = useAppStore((s) => s.setDisplayedMapPins)
  const [addModal, setAddModal] = useState<RouteFoodStop | null>(null)
  const [tab, setTab] = useState<FilterTab>('explore')
  const [catFilter, setCatFilter] = useState('all')
  const [mapOpen, setMapOpen] = useState(false)

  // Auto-populate map pins when POI data loads
  useEffect(() => {
    if (!d.livePOIs) return
    const FOOD_TYPES: LivePOI['type'][] = ['cafe', 'restaurant', 'pub', 'winery', 'bakery', 'fast_food']
    const ACT_TYPES: LivePOI['type'][] = ['hiking', 'viewpoint', 'attraction']
    const foodPins = d.livePOIs.filter((p) => FOOD_TYPES.includes(p.type) && p.lat && p.lng).slice(0, 5)
    const actPins  = d.livePOIs.filter((p) => ACT_TYPES.includes(p.type)  && p.lat && p.lng).slice(0, 5)
    setDisplayedMapPins([...foodPins, ...actPins].map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, type: p.type, name: p.name })))
  }, [d.livePOIs, setDisplayedMapPins])

  if (!d.activeItinerary) return null

  const addedIds = new Set(d.addedDiningStops.map((s) => s.foodId))
  const availableRouteStops = (d.routeFood ?? []).filter((s) => !addedIds.has(s.id))

  // Build merged activity list (same logic as desktop)
  const dbActs: Activity[] = d.dbActivities.map((a) => ({
    id: String(a.activity_id), name: a.name,
    category: a.category as Activity['category'],
    emoji: a.emoji || '📍', description: a.description || '',
    duration: a.duration || '', cost: (a.cost as Activity['cost']) || 'free',
    kidsOk: a.kids_ok, isHiddenGem: a.is_hidden_gem,
    mapsUrl: a.maps_url || '', tags: a.tags ?? [],
  }))
  const dbNatureActs: Activity[] = d.dbNature.map((n) => ({
    id: `nature-${n.nature_spot_id}`, name: n.name,
    category: (n.type === 'viewpoint' ? 'viewpoint' : n.type === 'beach' ? 'beach' : 'nature') as Activity['category'],
    emoji: NATURE_EMOJI[n.type] ?? '🌿', description: n.description || '',
    duration: n.type === 'hiking' ? '1–3 hrs' : '30–60 min',
    cost: 'free' as Activity['cost'], kidsOk: true, isHiddenGem: false,
    mapsUrl: n.lat && n.lng ? `https://www.google.com/maps/search/?api=1&query=${n.lat},${n.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.name + ' Victoria')}`,
    tags: [n.type],
  }))
  const staticActs = d.activities.filter((a) => a.category !== 'food' && a.category !== 'drink')
  const staticNames = new Set(staticActs.map((a) => a.name.toLowerCase()))
  const allActivities = [
    ...staticActs,
    ...dbActs.filter((a) => !staticNames.has(a.name.toLowerCase())),
    ...dbNatureActs.filter((a) => !staticNames.has(a.name.toLowerCase())),
  ]

  // Category chips
  const catCounts = new Map<string, number>()
  for (const a of allActivities) catCounts.set(a.category, (catCounts.get(a.category) ?? 0) + 1)
  const topCats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c)
  const filteredActivities = catFilter === 'all' ? allActivities : allActivities.filter((a) => a.category === catFilter)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F5F4F1', overflow: 'hidden' }}>

      {/* ── Destination header — compact ── */}
      <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '14px 16px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
          {/* Top row: name + back button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1C1B1F', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{d.shortDest}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>from <span style={{ color: '#6B7280', fontWeight: 600 }}>{d.shortOrigin}</span></div>
            </div>
            <button onClick={clearItinerary} style={{
              background: '#F3F4F6', border: 'none', borderRadius: 10,
              padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#6B7280', cursor: 'pointer',
            }}>← Back</button>
          </div>
          {/* Metric row — inline horizontal */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            <MMetricPill emoji="🚗" value={formatDrive(d.driveHours)} accent="#3A6B4F" bg="#E8F5EE" />
            <MMetricPill emoji="📍" value={`${d.totalKm} km`} accent="#1D4ED8" bg="#EFF6FF" />
            {d.fuelCost && <MMetricPill emoji="⛽" value={d.fuelCost} accent={WARM} bg="#FFF5EB" />}
            <MMetricPill emoji={d.seasonMeta.emoji} value={d.seasonMeta.label} accent="#4338CA" bg="#EEF2FF" />
          </div>
        </div>
      </div>

      {/* ── Filter tab bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
        background: 'rgba(245,244,241,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        padding: '10px 12px',
        display: 'flex', gap: 7, overflowX: 'auto',
      }}>
        {([
          ['explore', 'Things to Do'],
          ['eat',     'Eat & Drink'],
          ['stops',   `Stops${availableRouteStops.length + d.addedDiningStops.length > 0 ? ` (${availableRouteStops.length + d.addedDiningStops.length})` : ''}`],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setCatFilter('all') }} style={{
            padding: '8px 16px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap',
            background: tab === t ? '#1C1B1F' : '#fff',
            color: tab === t ? '#fff' : '#6B7280',
            border: `1.5px solid ${tab === t ? '#1C1B1F' : 'rgba(0,0,0,0.1)'}`,
            fontSize: 13, fontWeight: tab === t ? 700 : 500, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* Hazard alerts */}
        {d.hazards.length > 0 && (
          <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.hazards.slice(0, 2).map((h) => <MHazardBanner key={h.id} alert={h} />)}
          </div>
        )}

        {/* ── EXPLORE tab ── */}
        {tab === 'explore' && (
          <div style={{ padding: '12px 12px 0' }}>

            {/* About snippet */}
            {d.wikiSummary && (
              <div style={{ background: '#fff', borderRadius: 18, padding: '14px 16px', marginBottom: 12, border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#9CA3AF', marginBottom: 8 }}>About {d.shortDest}</div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#374151', lineHeight: 1.75 }}>
                  {d.wikiSummary.length > 240 ? d.wikiSummary.slice(0, 240) + '…' : d.wikiSummary}
                </p>
              </div>
            )}

            {/* Category filter chips */}
            {topCats.length > 1 && (
              <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
                <MPill label="All" color={catFilter === 'all' ? '#fff' : '#6B7280'} bg={catFilter === 'all' ? '#1C1B1F' : '#fff'} border={catFilter === 'all' ? '#1C1B1F' : 'rgba(0,0,0,0.12)'} onClick={() => setCatFilter('all')} />
                {topCats.map((cat) => (
                  <MPill key={cat} label={CAT_LABEL[cat] ?? cat}
                    color={catFilter === cat ? '#fff' : '#6B7280'}
                    bg={catFilter === cat ? '#1C1B1F' : '#fff'}
                    border={catFilter === cat ? '#1C1B1F' : 'rgba(0,0,0,0.12)'}
                    onClick={() => setCatFilter(cat)}
                  />
                ))}
              </div>
            )}

            {/* Activity cards */}
            {d.dbLoading && allActivities.length === 0
              ? <div style={{ fontSize: 13, color: '#9CA3AF', padding: '8px 0' }}>Loading activities…</div>
              : filteredActivities.length === 0
                ? <div style={{ fontSize: 13, color: '#9CA3AF', padding: '8px 0' }}>No activities found for this filter.</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredActivities.map((act) => (
                      <MActivityCard key={act.id} act={act}
                        isAdded={d.addedActivities.some((a) => a.actId === act.id)}
                        onAdd={() => d.addActivity({ actId: act.id, actName: act.name, emoji: act.emoji, dayNumber: 1 })}
                        onRemove={() => d.removeActivity(act.id)}
                      />
                    ))}
                    {d.activityPOIs.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '4px 0 2px' }}>Nearby on OpenStreetMap</div>
                        {d.activityPOIs.map((poi) => <MPoiCard key={poi.id} poi={poi} />)}
                      </>
                    )}
                  </div>
            }
            <div style={{ height: 32 }} />
          </div>
        )}

        {/* ── EAT & DRINK tab ── */}
        {tab === 'eat' && (
          <div style={{ padding: '12px 12px 0' }}>
            <MFoodCallout count={d.foodPOIs.length} pois={d.foodPOIs} loading={d.livePOIs === null} destName={d.shortDest} />
            <div style={{ height: 10 }} />
            {d.dbLoading && d.dbFood.length === 0
              ? <div style={{ fontSize: 13, color: '#9CA3AF', padding: '8px 0' }}>Finding food nearby…</div>
              : d.dbFood.length === 0
                ? <div style={{ fontSize: 13, color: '#9CA3AF', padding: '8px 0' }}>No dining listings for {d.shortDest} yet.</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {d.dbFood.map((f) => {
                      const attr = (f.attributes as Record<string, unknown>) ?? {}
                      const mapsUrl = attr.google_place_id
                        ? `https://www.google.com/maps/place/?q=place_id:${attr.google_place_id}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name + ' ' + d.shortDest)}`
                      return (
                        <div key={f.food_place_id} style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                          <div style={{ width: 46, height: 46, borderRadius: 13, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                            {f.category === 'Cafe' ? '☕' : f.category === 'Winery' ? '🍷' : f.category === 'Brewery' ? '🍺' : f.category === 'Bakery' ? '🥐' : '🍽'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <MPill label={f.category} color="#B45309" bg="#FEF3C7" border="transparent" />
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1B1F', marginTop: 5, marginBottom: 2, letterSpacing: '-0.01em' }}>{f.name}</div>
                            {f.address && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{f.address}</div>}
                          </div>
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#1C1B1F', padding: '8px 12px', borderRadius: 100, textDecoration: 'none', flexShrink: 0 }}>Maps ↗</a>
                        </div>
                      )
                    })}
                  </div>
            }
            <div style={{ height: 32 }} />
          </div>
        )}

        {/* ── STOPS tab ── */}
        {tab === 'stops' && (
          <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.addedDiningStops.length === 0 && availableRouteStops.length === 0 && (
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>No stops found along this route.</div>
            )}
            {d.addedDiningStops.map((stop) => (
              <div key={stop.foodId} style={{ background: '#E8F5EE', borderRadius: 18, border: '1px solid rgba(58,107,79,0.2)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
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
                <div key={stop.id} style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{cfg.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <MPill label={cfg.label} color="#B45309" bg="#FEF3C7" border="transparent" />
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
            <div style={{ height: 32 }} />
          </div>
        )}

      </div>{/* end scroll */}

      {/* ── Map FAB ── */}
      <button
        onClick={() => setMapOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 20, zIndex: 30,
          width: 56, height: 56, borderRadius: '50%',
          background: GREEN, border: 'none', color: '#fff',
          fontSize: 22, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(58,107,79,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="View on map"
      >
        🗺
      </button>

      {/* ── Full-screen map modal ── */}
      {mapOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#F5F4F1', display: 'flex', flexDirection: 'column' }}>
          {/* Modal header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', height: 56, flexShrink: 0,
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1C1C1A', letterSpacing: '-0.02em' }}>{d.shortDest}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Top food &amp; activities nearby</div>
            </div>
            <button onClick={() => setMapOpen(false)} style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none',
              background: '#F3F4F6', color: '#1C1C1A', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>

          {/* Map fills remaining space */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MapContainer />
          </div>

          {/* Pin legend */}
          <div style={{
            flexShrink: 0, background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)',
            padding: '10px 16px 20px', display: 'flex', gap: 16, overflowX: 'auto',
          }}>
            {[
              { emoji: '☕', label: 'Cafe' }, { emoji: '🍽', label: 'Restaurant' },
              { emoji: '🍷', label: 'Winery' }, { emoji: '🥾', label: 'Hiking' },
              { emoji: '👁', label: 'Scenic' }, { emoji: '🏛', label: 'Attraction' },
            ].map(({ emoji, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ fontSize: 14 }}>{emoji}</span>
                <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom sheet: add stop timing ── */}
      {addModal && (
        <div onClick={() => setAddModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '20px 24px 48px', width: '100%', maxWidth: 480, boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }}>
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

// ── Section ───────────────────────────────────────────────────────────────────

// ── Hazard banner ─────────────────────────────────────────────────────────────

function MHazardBanner({ alert }: { alert: HazardAlert }) {
  const urgent = alert.severity === 'urgent'
  const bg    = urgent ? '#FEF2F2' : '#FFFBEB'
  const border = urgent ? 'rgba(220,38,38,0.25)' : 'rgba(217,119,6,0.3)'
  const color  = urgent ? '#B91C1C' : '#B45309'
  const icon   = alert.category === 'Flooding' ? '🌊' : alert.category === 'Met' ? '⛈️' : '🔥'

  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 18, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 3 }}>{alert.category} — {alert.status}</div>
        <div style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.55, marginBottom: 4 }}>{alert.title}</div>
        <div style={{ fontSize: 11, color, fontWeight: 600 }}>{alert.distanceKm} km from {alert.distanceKm < 50 ? 'your destination' : 'the area'}</div>
      </div>
      {alert.url && (
        <a href={alert.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color, textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 12px', border: `1.5px solid ${border}`, borderRadius: 100, background: '#fff', flexShrink: 0 }}>
          Details ↗
        </a>
      )}
    </div>
  )
}

// ── Food callout ──────────────────────────────────────────────────────────────

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
    <div style={{ background: '#fff', border: '1px solid rgba(184,115,51,0.18)', borderRadius: 20, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ width: 50, height: 50, borderRadius: 15, background: '#FDE8C8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>🍽</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1C1B1F', lineHeight: 1.3 }}>
          {loading ? 'Finding food nearby…' : count > 0 ? `${count} places to eat` : `Food near ${destName}`}
        </div>
        {!loading && <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3 }}>{mFoodTypesSummary(pois)}</div>}
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=Food+near+${encodeURIComponent(destName)}`}
        target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 12.5, fontWeight: 700, color: WARM, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, padding: '9px 15px', border: '1.5px solid rgba(184,115,51,0.35)', borderRadius: 100, background: '#FFF9F4' }}
      >
        View ↗
      </a>
    </div>
  )
}

// ── Activity card ─────────────────────────────────────────────────────────────

function MActivityCard({ act, isAdded, onAdd, onRemove }: {
  act: Activity; isAdded?: boolean; onAdd?: () => void; onRemove?: () => void
}) {
  const tag = CAT_TAG[act.category] ?? { label: act.category, color: '#374151', bg: '#F3F4F6' }
  return (
    <div style={{
      background: isAdded ? '#F0FDF4' : '#fff',
      borderRadius: 20,
      border: isAdded ? `1.5px solid rgba(58,107,79,0.35)` : act.isHiddenGem ? '1.5px solid rgba(184,115,51,0.25)' : '1px solid rgba(0,0,0,0.07)',
      padding: '16px 16px 14px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        <MPill label={tag.label} color={tag.color} bg={tag.bg} />
        {act.isHiddenGem && <MPill label="Local gem" color={WARM} bg="#FFF5EB" />}
        {act.cost === 'free' && <MPill label="Free" color={GREEN} bg="#E8F5EE" />}
        {isAdded && <MPill label="In your plan" color={GREEN} bg="#E8F5EE" />}
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#1C1B1F', lineHeight: 1.25, marginBottom: 6, letterSpacing: '-0.01em' }}>{act.name}</div>
      {act.description && (
        <div style={{ fontSize: 13.5, color: '#49454F', lineHeight: 1.7, marginBottom: 12 }}>
          {act.description.length > 160 ? act.description.slice(0, 160) + '…' : act.description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>⏱ {act.duration}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={act.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#1C1B1F', padding: '9px 16px', borderRadius: 100, textDecoration: 'none' }}>Maps ↗</a>
          {onAdd && !isAdded && (
            <button onClick={onAdd} style={{ fontSize: 13, fontWeight: 700, color: GREEN, background: '#E8F5EE', border: `1.5px solid rgba(58,107,79,0.4)`, padding: '9px 16px', borderRadius: 100, cursor: 'pointer' }}>+ Plan it</button>
          )}
          {onRemove && isAdded && (
            <button onClick={onRemove} style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C', background: '#FEF2F2', border: '1.5px solid rgba(220,38,38,0.25)', padding: '9px 14px', borderRadius: 100, cursor: 'pointer' }}>Remove</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── POI card ──────────────────────────────────────────────────────────────────

function MPoiCard({ poi }: { poi: LivePOI }) {
  const tag = POI_TAG[poi.type]
  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: tag.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{tag.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <MPill label={tag.label} color={tag.color} bg={tag.bg} />
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1B1F', marginTop: 6, marginBottom: 2, letterSpacing: '-0.01em' }}>{poi.name}</div>
        {poi.routeLength && <div style={{ fontSize: 12.5, color: '#6B7280' }}>{poi.routeLength}</div>}
      </div>
      {poi.website && (
        <a href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: '#4285F4', textDecoration: 'none', flexShrink: 0 }}>Site ↗</a>
      )}
    </div>
  )
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function MMetricPill({ emoji, value, accent, bg }: { emoji: string; value: string; accent: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '6px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: accent, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function MPill({ label, color, bg, border, onClick }: { label: string; color: string; bg: string; border?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag onClick={onClick} style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color, background: bg, padding: '5px 12px', borderRadius: 100, whiteSpace: 'nowrap', border: `1.5px solid ${border ?? 'transparent'}`, cursor: onClick ? 'pointer' : 'default', flexShrink: 0 } as React.CSSProperties}>
      {label}
    </Tag>
  )
}
