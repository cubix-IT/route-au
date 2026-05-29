import { useState, useEffect, useCallback, useRef } from 'react'
import { usePlannerData } from '@/hooks/usePlannerData'
import { useAppStore } from '@/store/useAppStore'
import type { LivePOI, RouteFoodStop, AccommodationPOI } from '@/lib/overpass'
import type { HazardAlert } from '@/lib/vicEmergency'
import type { Activity } from '@/data/victorianActivities'
import type { AddedDiningStop, AddedActivity } from '@/store/useAppStore'
import type { FoodDrinkPOI } from '@/data/foodDrink'
import type { GuardrailWarning } from '@/types'

const GREEN = '#3A6B4F'
const WARM  = '#B87333'

// ── Category tag config ────────────────────────────────────────────────────────

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

const POI_TAG: Record<LivePOI['type'], { emoji: string; label: string; color: string; bg: string }> = {
  hiking:     { emoji: '🥾', label: 'Hiking',      color: '#2563EB', bg: '#EFF6FF' },
  viewpoint:  { emoji: '👁',  label: 'Scenic View', color: '#4338CA', bg: '#EEF2FF' },
  attraction: { emoji: '🏛',  label: 'Attraction',  color: '#7C3AED', bg: '#F5F3FF' },
  cafe:       { emoji: '☕', label: 'Cafe',         color: '#92400E', bg: '#FFFBEB' },
  restaurant: { emoji: '🍽',  label: 'Restaurant',  color: '#B45309', bg: '#FEF3C7' },
  pub:        { emoji: '🍺',  label: 'Pub & Bar',   color: '#B87333', bg: '#FFF5EB' },
  fast_food:  { emoji: '🥡',  label: 'Takeaway',    color: '#9A3412', bg: '#FFF7ED' },
  bakery:     { emoji: '🥐',  label: 'Bakery',      color: '#92400E', bg: '#FFFBEB' },
  winery:     { emoji: '🍷',  label: 'Winery',      color: '#7E22CE', bg: '#FAF5FF' },
}

const FOOD_CFG: Record<RouteFoodStop['type'], { emoji: string; label: string }> = {
  cafe:       { emoji: '☕', label: 'Cafe' },
  bakery:     { emoji: '🥐', label: 'Bakery' },
  restaurant: { emoji: '🍽', label: 'Restaurant' },
  pub:        { emoji: '🍺', label: 'Pub' },
  winery:     { emoji: '🍷', label: 'Winery' },
  roadhouse:  { emoji: '⛽', label: 'Roadhouse' },
}

const ACCOM_EMOJI: Record<string, string> = {
  Hotel: '🏨', Glamping: '🛖', CaravanPark: '🚐', FreeCamping: '⛺', Any: '✨',
}

const ACCOM_POI_CFG: Record<AccommodationPOI['type'], { emoji: string; label: string; color: string; bg: string }> = {
  hotel:        { emoji: '🏨', label: 'Hotel',       color: '#1D4ED8', bg: '#EFF6FF' },
  motel:        { emoji: '🏩', label: 'Motel',       color: '#7C3AED', bg: '#F5F3FF' },
  campsite:     { emoji: '⛺', label: 'Campsite',    color: '#047857', bg: '#ECFDF5' },
  caravan_park: { emoji: '🚐', label: 'Caravan Park',color: '#B87333', bg: '#FFF5EB' },
  hostel:       { emoji: '🛏', label: 'Hostel',      color: '#0891B2', bg: '#ECFEFF' },
  cabin:        { emoji: '🛖', label: 'Cabin',       color: '#92400E', bg: '#FFFBEB' },
  guest_house:  { emoji: '🏡', label: 'Guest House', color: '#059669', bg: '#ECFDF5' },
}

type FilterMode = 'all' | 'nature' | 'food' | 'activities' | 'stay'

type AccomPref = 'Hotel' | 'Glamping' | 'CaravanPark' | 'FreeCamping' | 'Any'

const ACCOM_PREF_TYPE_ORDER: Record<AccomPref, AccommodationPOI['type'][]> = {
  Hotel:       ['hotel', 'motel', 'guest_house', 'hostel', 'cabin', 'campsite', 'caravan_park'],
  Glamping:    ['cabin', 'guest_house', 'campsite', 'caravan_park', 'hotel', 'motel', 'hostel'],
  CaravanPark: ['caravan_park', 'campsite', 'cabin', 'guest_house', 'hotel', 'motel', 'hostel'],
  FreeCamping: ['campsite', 'caravan_park', 'cabin', 'guest_house', 'hotel', 'motel', 'hostel'],
  Any:         ['hotel', 'motel', 'cabin', 'guest_house', 'campsite', 'caravan_park', 'hostel'],
}

function sortAccomByPref(pois: AccommodationPOI[], pref?: string): AccommodationPOI[] {
  const order = ACCOM_PREF_TYPE_ORDER[(pref as AccomPref) ?? 'Any'] ?? ACCOM_PREF_TYPE_ORDER.Any
  return [...pois].sort((a, b) => {
    const ai = order.indexOf(a.type); const bi = order.indexOf(b.type)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}

// ── Rating stars ──────────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count?: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.4
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: 11, color: '#F59E0B', letterSpacing: '-0.5px' }}>
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}
      </span>
      <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 500 }}>
        {rating.toFixed(1)}{count ? ` (${count > 999 ? `${Math.round(count / 1000)}k` : count})` : ''}
      </span>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function ExperiencePanel({ hideTimeline = false }: { hideTimeline?: boolean }) {
  const d = usePlannerData()
  const setDisplayedMapPins = useAppStore((s) => s.setDisplayedMapPins)
  const setActivePOIFilter = useAppStore((s) => s.setActivePOIFilter)
  const placesLimitedMode = useAppStore((s) => s.placesLimitedMode)
  const selectedPinId = useAppStore((s) => s.selectedPinId)
  const setSelectedPinId = useAppStore((s) => s.setSelectedPinId)
  const panelRef = useRef<HTMLDivElement>(null)

  const [addModal, setAddModal] = useState<RouteFoodStop | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [expandedActId, setExpandedActId] = useState<string | null>(null)
  const [expandedPoiId, setExpandedPoiId] = useState<string | null>(null)
  const [showAllAccom, setShowAllAccom] = useState(false)

  const isOneDayTrip = (d.activeItinerary?.total_days ?? 0) === 1

  const syncMapPins = useCallback((f: FilterMode, pois: LivePOI[]) => {
    const FOOD_TYPES: LivePOI['type'][] = ['cafe', 'restaurant', 'pub', 'winery', 'bakery', 'fast_food']
    const NATURE_TYPES: LivePOI['type'][] = ['hiking', 'viewpoint']
    const ACT_TYPES: LivePOI['type'][] = ['attraction']
    let filtered = pois
    if (f === 'food')       filtered = pois.filter((p) => FOOD_TYPES.includes(p.type))
    else if (f === 'nature') filtered = pois.filter((p) => NATURE_TYPES.includes(p.type))
    else if (f === 'activities') filtered = pois.filter((p) => ACT_TYPES.includes(p.type))
    setDisplayedMapPins(
      filtered.filter((p) => p.lat !== undefined && p.lng !== undefined).slice(0, 40)
        .map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, type: p.type, name: p.name }))
    )
  }, [setDisplayedMapPins])

  const handleFilterChange = (f: FilterMode) => {
    setFilter(f)
    setActivePOIFilter(f)
    syncMapPins(f, d.livePOIs ?? [])
  }

  useEffect(() => {
    if (d.livePOIs) syncMapPins(filter, d.livePOIs)
  }, [d.livePOIs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to and highlight a POI card when selected via map pin click
  useEffect(() => {
    if (!selectedPinId || !panelRef.current) return
    const el = panelRef.current.querySelector(`[data-poi-id="${selectedPinId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setExpandedPoiId(selectedPinId)
    }
    setSelectedPinId(null)
  }, [selectedPinId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!d.activeItinerary) return null

  const addedIds = new Set(d.addedDiningStops.map((s) => s.foodId))
  const addedActIds = new Set(d.addedActivities.map((a) => a.actId))
  const availableRouteStops = (d.routeFood ?? []).filter((s) => !addedIds.has(s.id))
  const accom = d.userProfile?.accommodation_preference
  const showFood  = filter === 'all' || filter === 'food'
  const showStops = filter === 'all' || filter === 'food'
  const showStay  = !isOneDayTrip && (filter === 'all' || filter === 'stay')

  return (
    <div ref={panelRef} style={{ flex: 1, overflowY: 'auto', background: '#F5F4F1', display: 'flex', flexDirection: 'column' }}>

      {/* ── Destination header ── */}
      <div style={{
        padding: '20px 24px 16px', background: '#fff',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {d.dayLabel}
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#1C1B1F', lineHeight: 1.15, letterSpacing: '-0.03em' }}>
              {d.shortDest}
            </h1>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>from {d.shortOrigin}</span>
              {accom && accom !== 'Any' && d.activeItinerary.total_days > 1 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: GREEN, background: '#E8F5EE', padding: '2px 8px', borderRadius: 6 }}>
                  {ACCOM_EMOJI[accom]} {accom}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Wiki snippet */}
        {d.livePOIs === null ? (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="ai-sparkle" style={{ fontSize: 13 }}>✨</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: GREEN }}>Curating local insights…</span>
            </div>
            <div className="ai-skeleton-line" style={{ height: 10, width: '90%' }} />
            <div className="ai-skeleton-line" style={{ height: 10, width: '70%' }} />
          </div>
        ) : d.wikiSummary ? (
          <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#49454F', lineHeight: 1.7, borderLeft: `3px solid ${GREEN}`, paddingLeft: 12 }}>
            {d.wikiSummary.length > 280 ? d.wikiSummary.slice(0, 280) + '…' : d.wikiSummary}
          </p>
        ) : null}
      </div>

      {/* ── Sticky filter tabs ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(245,244,241,0.96)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
        display: 'flex', gap: 6, overflowX: 'auto', alignItems: 'center',
        flexShrink: 0,
      }}>
        {([
          ['all',        'All'],
          ['food',       '🍽 Eat & Drink'],
          ['activities', '🗺 Activities'],
          ['nature',     '🌿 Nature'],
          ...(!isOneDayTrip ? [['stay', '🏨 Stay']] : []),
        ] as const).map(([f, label]) => (
          <button key={f} onClick={() => handleFilterChange(f as FilterMode)} style={{
            padding: '6px 14px', borderRadius: 20, flexShrink: 0,
            background: filter === f ? '#1C1B1F' : '#fff',
            color: filter === f ? '#fff' : '#6B7280',
            border: `1.5px solid ${filter === f ? '#1C1B1F' : 'var(--border)'}`,
            fontSize: 12, fontWeight: filter === f ? 700 : 500,
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.12s',
          }}>
            {label}
          </button>
        ))}
        {placesLimitedMode && (
          <span style={{
            marginLeft: 'auto', flexShrink: 0, fontSize: 9.5, fontWeight: 700,
            color: '#92400E', background: '#FEF3C7',
            border: '1px solid rgba(217,119,6,0.3)',
            padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
          }}>
            ⚡ Limited Data
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '0 0 32px', flex: 1 }}>

        {/* Guardrail alerts */}
        {d.activeItinerary.all_warnings.length > 0 && (
          <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.activeItinerary.all_warnings.map((w) => <AdvisoryBanner key={w.id} warning={w} />)}
          </div>
        )}

        {/* Hazard alerts */}
        {d.hazards.length > 0 && (
          <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.hazards.slice(0, 2).map((h) => <HazardBanner key={h.id} alert={h} />)}
          </div>
        )}

        {/* ── Eat & Drink ── */}
        {showFood && (
          <SectionBlock
            id="section-food"
            title="Eat & Drink"
            icon="🍽"
            count={d.foodPOIs.length}
            loading={d.livePOIs === null}
            empty={d.livePOIs !== null && d.foodPOIs.length === 0}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px' }}>
              {d.foodPOIs.map((poi) => (
                <FoodCard key={poi.id} poi={poi} destName={d.shortDest} />
              ))}
            </div>
            {d.curatedDining.length > 0 && (
              <div style={{ padding: '14px 16px 0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Editor's Picks
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.curatedDining.map((f) => <CuratedDiningCard key={f.id} food={f} />)}
                </div>
              </div>
            )}

            {d.foodPOIs.length > 0 && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=restaurants+near+${encodeURIComponent(d.shortDest + ' Victoria')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', margin: '12px 16px 0', fontSize: 12, color: WARM, fontWeight: 600, textDecoration: 'none' }}
              >
                See all food & drink near {d.shortDest} ↗
              </a>
            )}

            {/* Route food stops */}
            {showStops && (d.addedDiningStops.length > 0 || availableRouteStops.length > 0) && (
              <div style={{ padding: '16px 16px 0' }}>
                <SectionHeader title="Stops on Your Way" icon="🚗" count={availableRouteStops.length + d.addedDiningStops.length} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {d.addedDiningStops.map((stop) => (
                    <div key={stop.foodId} style={{ background: '#E8F5EE', border: '1px solid rgba(58,107,79,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{stop.stopName}</span>
                        <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 8 }}>
                          {stop.timeOfDay === 'morning' ? '🌅 Morning' : '☀️ Afternoon'}
                        </span>
                      </div>
                      <button onClick={() => d.removeDiningStop(stop.foodId)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(58,107,79,0.3)', background: 'transparent', color: GREEN, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  ))}
                  {availableRouteStops.slice(0, 6).map((stop) => {
                    const cfg = FOOD_CFG[stop.type]
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name + ' ' + d.shortDest)}`
                    return (
                      <div key={stop.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1B1F', marginBottom: 1 }}>{stop.name}</div>
                          <div style={{ fontSize: 10.5, color: '#6B7280' }}>
                            {stop.distanceFromRouteKm < 0.5 ? 'On route' : `${stop.distanceFromRouteKm.toFixed(1)} km off route`}
                            {stop.extraStopMin > 0 && ` · +${stop.extraStopMin} min`}
                          </div>
                        </div>
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1C1B1F', padding: '5px 10px', borderRadius: 6, textDecoration: 'none', flexShrink: 0 }}>Maps ↗</a>
                        <button onClick={() => setAddModal(stop)} style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${GREEN}`, background: '#E8F5EE', color: GREEN, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </SectionBlock>
        )}

        {/* ── Things to Do (human-made attractions) ── */}
        {(filter === 'all' || filter === 'activities') && (
          <SectionBlock
            id="section-activities"
            title="Things to Do"
            icon="🗺"
            count={d.activities.length + d.activityPOIs.length}
            loading={d.livePOIs === null && d.activities.length === 0}
            empty={d.activities.length === 0 && d.activityPOIs.length === 0}
          >
            <div className="activity-grid" style={{ padding: '0 16px' }}>
              {d.activities.map((act) => (
                <ActivityCard
                  key={act.id} act={act}
                  expanded={expandedActId === act.id}
                  onToggle={() => setExpandedActId(expandedActId === act.id ? null : act.id)}
                  isAdded={addedActIds.has(act.id)}
                  onAdd={() => d.addActivity({ actId: act.id, actName: act.name, emoji: act.emoji, dayNumber: 1 })}
                  onRemove={() => d.removeActivity(act.id)}
                />
              ))}
            </div>
            {d.activityPOIs.length > 0 && (
              <>
                {d.activities.length > 0 && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '10px 16px 4px' }}>
                    Nearby Attractions
                  </div>
                )}
                <div className="activity-grid" style={{ padding: '0 16px' }}>
                  {d.activityPOIs.map((poi) => (
                    <ActivityPoiCard
                      key={poi.id} poi={poi}
                      expanded={expandedPoiId === poi.id}
                      onToggle={() => setExpandedPoiId(expandedPoiId === poi.id ? null : poi.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </SectionBlock>
        )}

        {/* ── Nature & Outdoors (hikes, viewpoints, beaches) ── */}
        {(filter === 'all' || filter === 'nature') && (
          <SectionBlock
            id="section-nature"
            title="Nature & Outdoors"
            icon="🌿"
            count={d.naturePOIs.length}
            loading={d.livePOIs === null}
            empty={d.livePOIs !== null && d.naturePOIs.length === 0}
          >
            <div className="activity-grid" style={{ padding: '0 16px' }}>
              {d.naturePOIs.map((poi) => (
                <ActivityPoiCard
                  key={poi.id} poi={poi}
                  expanded={expandedPoiId === poi.id}
                  onToggle={() => setExpandedPoiId(expandedPoiId === poi.id ? null : poi.id)}
                />
              ))}
            </div>
          </SectionBlock>
        )}

        {/* ── Where to Stay ── */}
        {showStay && (() => {
          const allAccom = sortAccomByPref(d.accommodationPOIs ?? [], d.userProfile?.accommodation_preference)
          const displayed = showAllAccom ? allAccom : allAccom.slice(0, 4)
          const hiddenCount = allAccom.length - 4
          return (
            <SectionBlock
              id="section-stay"
              title="Where to Stay"
              icon="🏨"
              count={allAccom.length}
              loading={d.accommodationPOIs === null}
              empty={d.accommodationPOIs !== null && d.accommodationPOIs.length === 0}
            >
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {displayed.map((poi) => (
                    <AccommodationGridCard key={poi.id} poi={poi} destName={d.shortDest} />
                  ))}
                </div>
                {!showAllAccom && hiddenCount > 0 && (
                  <button onClick={() => setShowAllAccom(true)} style={{
                    width: '100%', padding: '9px', borderRadius: 9,
                    border: '1px dashed var(--border)', background: 'none',
                    fontSize: 12, color: '#6B7280', fontWeight: 500, cursor: 'pointer',
                  }}>
                    View all {allAccom.length} options near {d.shortDest} ↓
                  </button>
                )}
                <a
                  href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(d.shortDest + ' Victoria')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ textAlign: 'center', fontSize: 12, color: '#1D4ED8', fontWeight: 600, textDecoration: 'none' }}
                >
                  Search Booking.com for {d.shortDest} ↗
                </a>
              </div>
            </SectionBlock>
          )
        })()}

        {/* Day stepper — hidden in 3-col wide layout */}
        {!hideTimeline && (filter === 'all' || filter === 'activities') && <VerticalStepper d={d} />}
      </div>

      {addModal && (
        <AddModal
          stopName={addModal.name}
          onClose={() => setAddModal(null)}
          onConfirm={(t) => {
            d.addDiningStop({ foodId: addModal.id, stopName: addModal.name, stopLat: addModal.lat, stopLng: addModal.lng, timeOfDay: t, dayNumber: 1 })
            setAddModal(null)
          }}
        />
      )}
    </div>
  )
}

// ── Section block with header ─────────────────────────────────────────────────

function SectionHeader({ title, icon, count }: { title: string; icon: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#1C1B1F', letterSpacing: '-0.01em' }}>{title}</span>
      {count > 0 && (
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', background: '#F3F4F6', padding: '1px 7px', borderRadius: 10 }}>{count}</span>
      )}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function SectionBlock({ id, title, icon, count, loading, empty, children }: {
  id?: string; title: string; icon: string; count: number; loading: boolean; empty: boolean; children?: React.ReactNode
}) {
  if (!loading && empty) return null
  return (
    <div id={id} style={{ marginTop: 2 }}>
      <div style={{ padding: '16px 16px 10px', background: 'transparent' }}>
        <SectionHeader title={title} icon={icon} count={count} />
      </div>
      {loading ? (
        <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="ai-skeleton-line" style={{ height: 80, borderRadius: 12 }} />
          <div className="ai-skeleton-line" style={{ height: 80, borderRadius: 12 }} />
        </div>
      ) : children}
    </div>
  )
}

// ── Food card (2-col grid, rich data) ────────────────────────────────────────

function FoodCard({ poi, destName }: { poi: LivePOI; destName: string }) {
  const tag = POI_TAG[poi.type]
  const mapsUrl = poi.lat && poi.lng
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name)}&center=${poi.lat},${poi.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name + ' ' + destName)}`

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: '1px solid var(--border)',
      padding: '14px', display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.15s, transform 0.15s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
    >
      {/* Type chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 20 }}>{tag.emoji}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: tag.color, background: tag.bg, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tag.label}
        </span>
        {poi.source === 'google' && (
          <span style={{ marginLeft: 'auto', fontSize: 8.5, fontWeight: 600, color: '#9CA3AF' }}>G</span>
        )}
      </div>

      {/* Name */}
      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1C1B1F', lineHeight: 1.3, flex: 1 }}>
        {poi.name}
      </div>

      {/* Rating */}
      {poi.rating && <StarRating rating={poi.rating} count={poi.totalRatings} />}

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {poi.cuisine && (
          <span style={{ fontSize: 11, color: '#6B7280' }}>{poi.cuisine}</span>
        )}
        {poi.openingHours && (
          <span style={{ fontSize: 10.5, color: '#6B7280' }}>🕐 {poi.openingHours.split(';')[0].replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):\s*/i, '')}</span>
        )}
        {poi.description && !poi.openingHours && (
          <span style={{ fontSize: 10.5, color: '#6B7280', lineHeight: 1.4 }}>
            {poi.description.slice(0, 70)}{poi.description.length > 70 ? '…' : ''}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
          flex: 1, textAlign: 'center', padding: '7px 4px', borderRadius: 8,
          background: '#1C1B1F', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none',
        }}>
          📍 Maps
        </a>
        {poi.website && (
          <a href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`}
            target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', color: '#4285F4', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Web ↗
          </a>
        )}
      </div>
    </div>
  )
}

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({ act, expanded, onToggle, isAdded, onAdd, onRemove }: {
  act: Activity; expanded: boolean; onToggle: () => void
  isAdded?: boolean; onAdd?: () => void; onRemove?: () => void
}) {
  const tag = CAT_TAG[act.category] ?? { label: act.category, color: '#374151', bg: '#F3F4F6' }
  const mapsUrl = act.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' Victoria AU')}`

  return (
    <div onClick={onToggle} style={{
      background: isAdded ? '#F0FDF4' : '#fff', borderRadius: 14,
      border: `1.5px solid ${isAdded ? 'rgba(58,107,79,0.4)' : expanded ? (act.isHiddenGem ? 'rgba(184,115,51,0.45)' : `${GREEN}45`) : (act.isHiddenGem ? 'rgba(184,115,51,0.25)' : 'var(--border)')}`,
      padding: '13px 15px', cursor: 'pointer',
      transition: 'all 0.15s',
      boxShadow: expanded ? '0 4px 20px rgba(0,0,0,0.09)' : '0 1px 3px rgba(0,0,0,0.04)',
      transform: expanded ? 'translateY(-1px)' : 'none',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            <Chip label={tag.label} color={tag.color} bg={tag.bg} />
            {act.isHiddenGem && <Chip label="Local gem" color={WARM} bg="#FFF5EB" />}
            {act.cost === 'free' && <Chip label="Free" color={GREEN} bg="#E8F5EE" />}
            {act.kidsOk && <Chip label="Kid Friendly" color="#D97706" bg="#FFFBEB" />}
            {isAdded && <Chip label="In your plan" color={GREEN} bg="#E8F5EE" />}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1C1B1F', marginBottom: 3, lineHeight: 1.3 }}>{act.name}</div>
          {!expanded && act.description && (
            <div style={{ fontSize: 11.5, color: '#49454F', lineHeight: 1.55 }}>
              {act.description.length > 90 ? act.description.slice(0, 90) + '…' : act.description}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 4 }}>⏱ {act.duration}</div>
        </div>
        <span style={{ fontSize: 12, color: '#9CA3AF', transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0, marginTop: 2 }}>▾</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {act.description && (
            <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.65, margin: 0 }}>{act.description}</p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, display: 'block', textAlign: 'center', padding: '9px', borderRadius: 9, background: '#1C1B1F', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              📍 Google Maps ↗
            </a>
            {onAdd && !isAdded && (
              <button onClick={(e) => { e.stopPropagation(); onAdd() }}
                style={{ padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${GREEN}`, background: '#E8F5EE', color: GREEN, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Plan it
              </button>
            )}
            {onRemove && isAdded && (
              <button onClick={(e) => { e.stopPropagation(); onRemove() }}
                style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid rgba(220,38,38,0.3)', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityPoiCard({ poi, expanded, onToggle }: { poi: LivePOI; expanded: boolean; onToggle: () => void }) {
  const tag = POI_TAG[poi.type]
  const mapsUrl = poi.lat && poi.lng
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name)}&center=${poi.lat},${poi.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name)}`

  return (
    <div data-poi-id={poi.id} onClick={onToggle} style={{
      background: '#fff', borderRadius: 14,
      border: `1.5px solid ${expanded ? `${tag.color}55` : 'var(--border)'}`,
      padding: '13px 14px', cursor: 'pointer', transition: 'all 0.15s',
      boxShadow: expanded ? '0 3px 14px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: tag.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{tag.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Chip label={tag.label} color={tag.color} bg={tag.bg} />
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1C1B1F', marginTop: 4, lineHeight: 1.3 }}>{poi.name}</div>
          {poi.rating && <div style={{ marginTop: 4 }}><StarRating rating={poi.rating} count={poi.totalRatings} /></div>}
          {poi.routeLength && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>{poi.routeLength}</div>}
        </div>
        <span style={{ fontSize: 12, color: '#9CA3AF', transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▾</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {poi.description && <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.65, margin: 0 }}>{poi.description}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, display: 'block', textAlign: 'center', padding: '8px', borderRadius: 8, background: '#1C1B1F', color: '#fff', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>
              📍 Google Maps ↗
            </a>
            {poi.website && (
              <a href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`}
                target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', color: '#4285F4', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                Web ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Accommodation grid card ───────────────────────────────────────────────────

function AccommodationGridCard({ poi, destName }: { poi: AccommodationPOI; destName: string }) {
  const cfg = ACCOM_POI_CFG[poi.type]
  const mapsUrl = poi.lat && poi.lng
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name)}&center=${poi.lat},${poi.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name + ' ' + destName)}`

  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid var(--border)',
      padding: '13px', display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {cfg.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1C1B1F', lineHeight: 1.3, marginTop: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
            {poi.name}
          </div>
        </div>
      </div>
      {poi.stars && (
        <div style={{ fontSize: 11, color: '#F59E0B' }}>{'★'.repeat(poi.stars)}{'☆'.repeat(Math.max(0, 5 - poi.stars))}</div>
      )}
      {poi.description && (
        <div style={{ fontSize: 10.5, color: '#6B7280', lineHeight: 1.45 }}>
          {poi.description.slice(0, 70)}{poi.description.length > 70 ? '…' : ''}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, textAlign: 'center', padding: '7px 4px', borderRadius: 8, background: '#1C1B1F', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
          📍 Maps
        </a>
        {poi.website && (
          <a href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`}
            target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', color: '#4285F4', fontSize: 10.5, fontWeight: 700, textDecoration: 'none' }}>
            Web ↗
          </a>
        )}
      </div>
    </div>
  )
}

// ── Add stop modal ────────────────────────────────────────────────────────────

function AddModal({ stopName, onClose, onConfirm }: { stopName: string; onClose: () => void; onConfirm: (t: 'morning' | 'afternoon') => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: '24px 28px', boxShadow: '0 8px 40px rgba(0,0,0,0.15)', maxWidth: 320, width: '90%' }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Add Stop</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 18 }}>When at <strong>{stopName}</strong>?</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onConfirm('morning')} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${GREEN}`, background: '#E8F5EE', color: GREEN, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🌅 Morning</button>
          <button onClick={() => onConfirm('afternoon')} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${WARM}`, background: '#FFF5EB', color: WARM, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>☀️ Afternoon</button>
        </div>
      </div>
    </div>
  )
}

// ── Advisory + hazard banners ─────────────────────────────────────────────────

const ADVISORY_CFG = {
  MANDATORY_STOP: { bg: '#FEF2F2', border: 'rgba(220,38,38,0.28)', color: '#B91C1C', icon: '🛑', label: 'Required Action' },
  WARNING:        { bg: '#FFFBEB', border: 'rgba(217,119,6,0.28)',  color: '#B45309', icon: '⚠️',  label: 'Advisory' },
  NOTICE:         { bg: '#EFF6FF', border: 'rgba(37,99,235,0.22)',  color: '#1D4ED8', icon: 'ℹ️',  label: 'Notice' },
}

function AdvisoryBanner({ warning }: { warning: GuardrailWarning }) {
  const cfg = ADVISORY_CFG[warning.severity]
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{cfg.label}</div>
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.45 }}>{warning.message}</div>
      </div>
    </div>
  )
}

function HazardBanner({ alert }: { alert: HazardAlert }) {
  const urgent = alert.severity === 'urgent'
  const bg = urgent ? '#FEF2F2' : '#FFFBEB'
  const border = urgent ? 'rgba(220,38,38,0.25)' : 'rgba(217,119,6,0.25)'
  const color = urgent ? '#B91C1C' : '#B45309'
  const icon = alert.category === 'Flooding' ? '🌊' : alert.category === 'Met' ? '⛈️' : '🔥'
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 13px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 2 }}>
          {alert.category} — {alert.status}
          <span style={{ fontWeight: 500, marginLeft: 6 }}>{alert.distanceKm} km away</span>
        </div>
        <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.4 }}>{alert.title}</div>
      </div>
      {alert.url && (
        <a href={alert.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontWeight: 700, color, textDecoration: 'none', flexShrink: 0 }}>Details ↗</a>
      )}
    </div>
  )
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 700, color, background: bg, padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap' }}>{label}</span>
}

// ── Day stepper ───────────────────────────────────────────────────────────────

function fmtHour(h: number): string {
  const hour = Math.floor(h % 24)
  const min = Math.round((h - Math.floor(h)) * 60)
  const mer = hour >= 12 ? 'pm' : 'am'
  const disp = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return min === 0 ? `${disp}${mer}` : `${disp}:${String(min).padStart(2, '0')}${mer}`
}

function VerticalStepper({ d }: { d: ReturnType<typeof usePlannerData> }) {
  const departureHour = useAppStore((s) => s.departureHour)
  const originName = useAppStore((s) => s.originName)
  const destName = useAppStore((s) => s.destName)
  if (!d.activeItinerary) return null
  const day1 = d.activeItinerary.days[0]
  if (!day1) return null

  const midpoints = day1.schedule.filter((item) => !['depart', 'drive', 'arrive', 'camp'].includes(item.type))
  const arriveItem = day1.schedule.find((item) => item.type === 'arrive' || item.type === 'camp')
  const arrivalDisplay = arriveItem?.time ?? fmtHour(departureHour + d.activeItinerary.route.estimated_drive_hours)

  const steps: Array<{ label: string; time: string; emoji: string; endpoint?: boolean; color?: string }> = [
    { label: originName.split(',')[0], time: fmtHour(departureHour), emoji: '●', endpoint: true, color: GREEN },
    ...midpoints.map((item) => ({ label: item.title, time: item.time, emoji: item.emoji ?? '📌' })),
    ...d.addedDiningStops.map((stop) => ({ label: stop.stopName, time: stop.timeOfDay === 'morning' ? 'Morning' : 'Afternoon', emoji: '🍽', color: WARM })),
    ...d.addedActivities.map((act) => ({ label: act.actName, time: 'At destination', emoji: act.emoji, color: GREEN })),
    { label: destName.split(',')[0].split('&')[0].trim(), time: arrivalDisplay, emoji: '★', endpoint: true, color: WARM },
  ]

  return (
    <div style={{ marginTop: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 10px' }}>
        <span style={{ fontSize: 15 }}>🗓</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#1C1B1F', letterSpacing: '-0.01em' }}>Your Day at a Glance</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ padding: '4px 20px 24px', display: 'flex', flexDirection: 'column' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step.endpoint ? (step.color ?? GREEN) : '#F3F4F6',
                border: step.endpoint ? 'none' : '1.5px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: step.endpoint ? 11 : 15, color: step.endpoint ? '#fff' : undefined,
                fontWeight: step.endpoint ? 900 : undefined, flexShrink: 0,
              }}>
                {step.emoji}
              </div>
              {i < steps.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 18, background: 'var(--border)', margin: '3px 0', borderRadius: 1 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 14 : 0, paddingTop: 4, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: step.endpoint ? 800 : 600, color: step.endpoint ? (step.color ?? GREEN) : '#1C1B1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {step.label}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{step.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Curated dining card ───────────────────────────────────────────────────────

const FOOD_CAT_EMOJI: Record<string, string> = {
  Cafe: '☕', Pub: '🍺', Restaurant: '🍽', Winery: '🍷',
  Roadhouse: '⛽', Bakery: '🥐', Brewery: '🍻', Seafood: '🦞',
}

function CuratedDiningCard({ food }: { food: FoodDrinkPOI }) {
  const emoji = FOOD_CAT_EMOJI[food.category] ?? '🍽'
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(food.name + ' Victoria')}`
  return (
    <div style={{
      background: '#FFFBF5', border: '1px solid rgba(184,115,51,0.2)', borderRadius: 12,
      padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: '#FFF5EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1B1F' }}>{food.name}</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: WARM, background: '#FFF5EB', padding: '1px 6px', borderRadius: 4 }}>{food.price_range}</span>
          {food.must_book && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#B91C1C', background: '#FEF2F2', padding: '1px 6px', borderRadius: 4 }}>Book ahead</span>}
        </div>
        {food.description && (
          <div style={{ fontSize: 11.5, color: '#6B7280', lineHeight: 1.5, marginBottom: 4 }}>
            {food.description.slice(0, 100)}{food.description.length > 100 ? '…' : ''}
          </div>
        )}
        {food.signature_dish && (
          <div style={{ fontSize: 11, color: WARM, fontWeight: 600 }}>Try: {food.signature_dish}</div>
        )}
      </div>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
        style={{ padding: '6px 10px', borderRadius: 7, background: '#1C1B1F', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
        Maps ↗
      </a>
    </div>
  )
}

// suppress unused import warning
void (null as unknown as AddedDiningStop)
void (null as unknown as AddedActivity)
