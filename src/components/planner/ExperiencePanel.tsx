import { useState, useEffect, useCallback, useRef } from 'react'
import { usePlannerData } from '@/hooks/usePlannerData'
import { useAppStore } from '@/store/useAppStore'
import type { LivePOI, RouteFoodStop, AccommodationPOI } from '@/lib/overpass'
import type { HazardAlert } from '@/lib/vicEmergency'
import type { Activity } from '@/data/victorianActivities'
import type { AddedDiningStop, AddedActivity } from '@/store/useAppStore'
import type { GuardrailWarning } from '@/types'

const GREEN = '#3A6B4F'
const WARM  = '#B87333'

// ── Category tag config ────────────────────────────────────────────────────────

const CAT_TAG: Record<string, { label: string; color: string; bg: string }> = {
  nature:        { label: 'Nature',        color: '#2D7A4A', bg: '#E8F5EE' },
  active:        { label: 'Outdoor',       color: '#2563EB', bg: '#EFF6FF' },
  wildlife:      { label: 'Wildlife',      color: '#047857', bg: '#ECFDF5' },
  history:       { label: 'History',       color: '#7C3AED', bg: '#F5F3FF' },
  art:           { label: 'Art & Culture', color: '#DB2777', bg: '#FDF2F8' },
  family:        { label: 'Family',        color: '#D97706', bg: '#FFFBEB' },
  relaxation:    { label: 'Leisure',       color: '#0891B2', bg: '#ECFEFF' },
  food:          { label: 'Food',          color: '#B45309', bg: '#FEF3C7' },
  drink:         { label: 'Drink',         color: '#B87333', bg: '#FFF5EB' },
  markets:       { label: 'Markets',       color: '#059669', bg: '#ECFDF5' },
  viewpoint:     { label: 'Scenic View',   color: '#4338CA', bg: '#EEF2FF' },
  beach:         { label: 'Beach',         color: '#0369A1', bg: '#E0F2FE' },
  wellness:      { label: 'Wellness',      color: '#0891B2', bg: '#ECFEFF' },
  entertainment: { label: 'Entertainment', color: '#9333EA', bg: '#F3E8FF' },
  sports:        { label: 'Sports',        color: '#15803D', bg: '#DCFCE7' },
  shopping:      { label: 'Shopping',      color: '#BE185D', bg: '#FCE7F3' },
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


const ACCOM_POI_CFG: Record<AccommodationPOI['type'], { emoji: string; label: string; color: string; bg: string }> = {
  hotel:        { emoji: '🏨', label: 'Hotel',       color: '#1D4ED8', bg: '#EFF6FF' },
  motel:        { emoji: '🏩', label: 'Motel',       color: '#7C3AED', bg: '#F5F3FF' },
  campsite:     { emoji: '⛺', label: 'Campsite',    color: '#047857', bg: '#ECFDF5' },
  caravan_park: { emoji: '🚐', label: 'Caravan Park',color: '#B87333', bg: '#FFF5EB' },
  hostel:       { emoji: '🛏', label: 'Hostel',      color: '#0891B2', bg: '#ECFEFF' },
  cabin:        { emoji: '🛖', label: 'Cabin',       color: '#92400E', bg: '#FFFBEB' },
  guest_house:  { emoji: '🏡', label: 'Guest House', color: '#059669', bg: '#ECFDF5' },
}

type FilterMode = 'all' | 'food' | 'activities' | 'stay' | 'fuel'

interface FuelStop {
  coord: { lat: number; lng: number }
  label: string
  brandNotFound?: boolean
  station: {
    id: string; name: string; brand: string; address: string
    lat: number; lng: number; pricePerLitre: number; distanceKm: number
  } | null
}

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

// ── Open/closed status from Google Places regularOpeningHours.periods ─────────

interface OpenPeriod {
  open: { day: number; hour: number; minute: number }
  close?: { day: number; hour: number; minute: number }
}

function getOpenStatus(periods?: OpenPeriod[]): { isOpen: boolean; nextOpen?: string } | null {
  if (!periods || periods.length === 0) return null
  const now = new Date()
  const day = now.getDay()
  const nowMins = day * 24 * 60 + now.getHours() * 60 + now.getMinutes()

  const toMins = (d: number, h: number, m: number) => d * 24 * 60 + h * 60 + m

  for (const p of periods) {
    const openM = toMins(p.open.day, p.open.hour, p.open.minute)
    if (!p.close) {
      if (nowMins >= openM) return { isOpen: true }
      continue
    }
    const closeM = toMins(p.close.day, p.close.hour, p.close.minute)
    // overnight: openM > closeM means spans midnight
    if (closeM > openM) {
      if (nowMins >= openM && nowMins < closeM) return { isOpen: true }
    } else {
      if (nowMins >= openM || nowMins < closeM) return { isOpen: true }
    }
  }

  // Closed — find next open time
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  let minDiff = Infinity
  let nextOpen: string | undefined
  for (const p of periods) {
    let openM = toMins(p.open.day, p.open.hour, p.open.minute)
    let diff = openM - nowMins
    if (diff <= 0) diff += 7 * 24 * 60
    if (diff < minDiff) {
      minDiff = diff
      const h = p.open.hour; const m = p.open.minute
      const ampm = h >= 12 ? 'pm' : 'am'
      const hd = h > 12 ? h - 12 : h === 0 ? 12 : h
      const md = m === 0 ? '' : `:${String(m).padStart(2, '0')}`
      const sameDay = p.open.day === day && diff < 24 * 60
      nextOpen = sameDay ? `${hd}${md} ${ampm}` : `${DAYS[p.open.day]} ${hd}${md} ${ampm}`
    }
  }
  return { isOpen: false, nextOpen }
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
  const [actCategoryFilter, setActCategoryFilter] = useState<string>('all')
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>('all')
  const [expandedActId, setExpandedActId] = useState<string | null>(null)
  const [_expandedPoiId, setExpandedPoiId] = useState<string | null>(null)
  const [showAllAccom, setShowAllAccom] = useState(false)
  const [showAllFood, setShowAllFood] = useState(false)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [fuelStops, setFuelStops] = useState<FuelStop[]>([])
  const [fuelLoading, setFuelLoading] = useState(false)

  const RESULT_LIMIT = 10

  const isOneDayTrip = (d.activeItinerary?.total_days ?? 0) === 1

  const syncMapPins = useCallback((_f: FilterMode, pois: LivePOI[], stops?: FuelStop[], catFilter?: string) => {
    if (_f === 'fuel') {
      setDisplayedMapPins((stops ?? []).filter((s) => s.station).map((s) => ({
        id: `fuel-${s.label}`, lat: s.station!.lat, lng: s.station!.lng,
        type: 'attraction' as LivePOI['type'],
        name: `${s.station!.brand} — $${s.station!.pricePerLitre.toFixed(3)}/L (${s.label})`,
      })))
      return
    }
    if (d.dbFood.length > 0 || d.dbActivities.length > 0) {
      const SPA_CATS = new Set(['spa','wellness','beauty_salon','beauty','gym','fitness'])
      // Only show pins matching current filter/category
      let foodPins: typeof d.dbFood = []
      let actPins: typeof d.dbNature = []

      if (_f === 'all' || _f === 'food') {
        foodPins = d.dbFood
          .filter((f) => f.lat && f.lng && !SPA_CATS.has(f.category.toLowerCase()))
          .filter((f) => !catFilter || catFilter === 'all' || f.category.toLowerCase() === catFilter)
          .map((f) => {
            const attr = (f.attributes as Record<string, unknown>) ?? {}
            return { f, rating: (attr.rating as number | undefined) ?? 0 }
          })
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 8)
          .map(({ f }) => f)
      }
      if (_f === 'all' || _f === 'activities') {
        actPins = d.dbNature.filter((n) => n.lat && n.lng).slice(0, 8)
      }
      setDisplayedMapPins([
        ...foodPins.map((f) => {
          const a = (f.attributes as Record<string, unknown>) ?? {}
          return { id: String(f.food_place_id), lat: f.lat!, lng: f.lng!, type: f.category.toLowerCase() as LivePOI['type'], name: f.name, placeId: a.google_place_id as string | undefined }
        }),
        ...actPins.map((n) => ({
          id: `nature-${n.nature_spot_id}`, lat: n.lat!, lng: n.lng!,
          type: (n.type === 'viewpoint' ? 'viewpoint' : 'attraction') as LivePOI['type'],
          name: n.name,
          placeId: n.slug?.startsWith('gp-') ? n.slug.slice(3) : undefined,
        })),
      ])
      return
    }
    const FOOD_TYPES: LivePOI['type'][] = ['cafe', 'restaurant', 'pub', 'winery', 'bakery', 'fast_food']
    const ACT_TYPES: LivePOI['type'][] = ['hiking', 'viewpoint', 'attraction']
    const fp = (_f === 'all' || _f === 'food') ? pois.filter((p) => FOOD_TYPES.includes(p.type) && p.lat && p.lng).slice(0, 5) : []
    const ap = (_f === 'all' || _f === 'activities') ? pois.filter((p) => ACT_TYPES.includes(p.type) && p.lat && p.lng).slice(0, 5) : []
    setDisplayedMapPins([...fp, ...ap].map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, type: p.type, name: p.name })))
  }, [setDisplayedMapPins, d.dbFood, d.dbActivities, d.dbNature])

  const fetchFuelStops = useCallback(async () => {
    if (!d.activeItinerary || !d.vehicleProfile) return
    if (d.vehicleProfile.fuel_type === 'Electric') return
    if ((d.vehicleProfile as unknown as { skip_fuel?: boolean }).skip_fuel) return
    const waypoints = d.activeItinerary.route.waypoints
    if (waypoints.length < 2) return

    const origin = waypoints[0].coord
    const dest = waypoints[waypoints.length - 1].coord
    // Use route waypoints for accurate along-route points, not straight-line midpoint
    const allWaypoints = waypoints.map(w => w.coord)
    const quarter = allWaypoints[Math.floor(allWaypoints.length * 0.25)] ?? { lat: (origin.lat * 3 + dest.lat) / 4, lng: (origin.lng * 3 + dest.lng) / 4 }
    const threeQuarter = allWaypoints[Math.floor(allWaypoints.length * 0.75)] ?? { lat: (origin.lat + dest.lat * 3) / 4, lng: (origin.lng + dest.lng * 3) / 4 }
    const spots = [
      { coord: quarter,      label: 'Early on route' },
      { coord: threeQuarter, label: 'Later on route' },
      { coord: dest,         label: 'Near destination' },
    ]

    setFuelLoading(true)
    const brand = (d.vehicleProfile as unknown as { fuel_brand?: string | null }).fuel_brand
    const brandQ = brand && brand !== 'Any' ? `&brand=${encodeURIComponent(brand)}` : ''

    const results = await Promise.all(spots.map(async ({ coord, label }) => {
      try {
        // radius=15km — tight enough to stay on-route, wide enough to find stations
        const r = await fetch(`/api/fuel?lat=${coord.lat}&lng=${coord.lng}&fuelType=${d.vehicleProfile!.fuel_type}&limit=1&radius=15${brandQ}`)
        const data = await r.json() as { stations?: FuelStop['station'][]; brandNotFound?: boolean }
        return { coord, label, station: data.stations?.[0] ?? null, brandNotFound: data.brandNotFound } as FuelStop
      } catch {
        return { coord, label, station: null } as FuelStop
      }
    }))
    setFuelStops(results)
    setFuelLoading(false)
    return results
  }, [d.activeItinerary, d.vehicleProfile])

  const handleFilterChange = async (f: FilterMode) => {
    setFilter(f)
    setActivePOIFilter(f)
    setActCategoryFilter('all')
    setFoodCategoryFilter('all')
    if (f === 'fuel') {
      const stops = fuelStops.length > 0 ? fuelStops : await fetchFuelStops()
      syncMapPins(f, d.livePOIs ?? [], stops, 'all')
    } else {
      syncMapPins(f, d.livePOIs ?? [], undefined, 'all')
    }
    setShowAllFood(false)
    setShowAllActivities(false)
  }

  useEffect(() => {
    syncMapPins(filter, d.livePOIs ?? [], undefined, foodCategoryFilter)
  }, [d.livePOIs, d.dbFood, d.dbActivities, d.dbNature, foodCategoryFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to and highlight a POI card when selected via map pin click
  useEffect(() => {
    if (!selectedPinId || !panelRef.current) return
    const el = panelRef.current.querySelector(`[data-poi-id="${selectedPinId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setExpandedPoiId(selectedPinId)
    }
    // Clear after 2s so the blue highlight fades naturally
    const t = setTimeout(() => setSelectedPinId(null), 2000)
    return () => clearTimeout(t)
  }, [selectedPinId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!d.activeItinerary) return null

  const addedIds = new Set(d.addedDiningStops.map((s) => s.foodId))
  const addedActIds = new Set(d.addedActivities.map((a) => a.actId))
  const availableRouteStops = (d.routeFood ?? []).filter((s) => !addedIds.has(s.id))
  const showFood  = filter === 'all' || filter === 'food'
  const showStops = filter === 'all' || filter === 'food'
  const showStay  = !isOneDayTrip && (filter === 'all' || filter === 'stay')

  return (
    <div ref={panelRef} style={{ flex: 1, overflowY: 'auto', background: '#F5F4F1', display: 'flex', flexDirection: 'column' }}>

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
          ['activities', '🗺 Things to Do'],
          ['food',       '🍽 Eat & Drink'],
          ...(!isOneDayTrip ? [['stay', '🏨 Stay']] : []),
          ...(d.vehicleProfile && d.vehicleProfile.fuel_type !== 'Electric' && !(d.vehicleProfile as unknown as { skip_fuel?: boolean }).skip_fuel ? [['fuel', '⛽ Fuel']] : []),
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

        {/* ── Things to Do (activities + nature merged, category filter chips) ── */}
        {(filter === 'all' || filter === 'activities') && (() => {
          // Combine: static curated + Supabase dbActivities + dbNature
          const NATURE_EMOJI: Record<string, string> = {
            hiking: '🥾', viewpoint: '🌄', beach: '🏖️', waterfall: '💧',
            national_park: '🌿', nature_reserve: '🌿', hot_spring: '♨️',
            lake: '💧', river: '💧', cave: '🦇', forest: '🌳',
            wetland: '🌿', summit: '⛰️', gorge: '🏔️',
          }

          // Map dbActivities to Activity shape
          const dbActs: Activity[] = d.dbActivities.map((a) => {
            const aAttr = (a.attributes as Record<string, unknown>) ?? {}
            return {
              id: String(a.activity_id),
              name: a.name,
              category: a.category as Activity['category'],
              emoji: a.emoji || '📍',
              description: (aAttr.editorial_summary as string | undefined) || a.description || '',
              duration: a.duration || '',
              cost: (a.cost as Activity['cost']) || 'free',
              kidsOk: a.kids_ok,
              isHiddenGem: a.is_hidden_gem,
              mapsUrl: a.maps_url || '',
              tags: a.tags ?? [],
              websiteUri: aAttr.website_uri as string | undefined,
              editorialSummary: aAttr.editorial_summary as string | undefined,
              openingHoursPeriods: aAttr.opening_hours_periods as import('@/lib/overpass').OpenHoursPeriod[] | undefined,
              rating: aAttr.rating as number | undefined,
              reviewCount: aAttr.review_count as number | undefined,
            }
          })

          // Map dbNature to Activity shape (merged into Things to Do)
          const dbNatureActs: Activity[] = d.dbNature.map((n) => ({
            id: `nature-${n.nature_spot_id}`,
            name: n.name,
            category: n.type === 'viewpoint' ? 'viewpoint' : n.type === 'beach' ? 'beach' : 'nature',
            emoji: NATURE_EMOJI[n.type] ?? '🌿',
            description: n.description || '',
            duration: n.type === 'hiking' ? '1–3 hrs' : '30–60 min',
            cost: 'free' as Activity['cost'],
            kidsOk: true,
            isHiddenGem: false,
            mapsUrl: n.slug?.startsWith('gp-')
              ? `https://www.google.com/maps/place/?q=place_id:${n.slug.slice(3)}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.name + ' Victoria')}`,
            tags: [n.type],
          }))

          // All activities from Google Places API — no static data
          const seenNames = new Set<string>()
          const allThingsToDo = [...dbActs, ...dbNatureActs].filter((a) => {
            const key = a.name.toLowerCase()
            if (seenNames.has(key)) return false
            seenNames.add(key)
            return true
          })

          // Derive available categories for filter chips
          const catCounts = new Map<string, number>()
          for (const a of allThingsToDo) {
            catCounts.set(a.category, (catCounts.get(a.category) ?? 0) + 1)
          }
          const topCats = [...catCounts.entries()]
            .filter(([cat]) => cat !== 'family')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([cat]) => cat)

          const filtered = actCategoryFilter === 'all'
            ? allThingsToDo
            : allThingsToDo.filter((a) => a.category === actCategoryFilter)

          const CAT_LABEL: Record<string, string> = {
            nature: '🌿 Nature', viewpoint: '🌄 Viewpoints', history: '🏛️ History',
            art: '🎨 Art', active: '🏄 Active', wildlife: '🦘 Wildlife',
            relaxation: '🧖 Relax', wellness: '♨️ Wellness', beach: '🏖️ Beach',
            entertainment: '🎵 Entertainment', markets: '🛒 Markets', family: '👨‍👩‍👧 Family',
          }

          return (
            <SectionBlock
              id="section-activities"
              title="Things to Do"
              icon="🗺"
              count={allThingsToDo.length}
              loading={d.dbLoading && allThingsToDo.length === 0}
              empty={!d.dbLoading && allThingsToDo.length === 0}
            >
              {/* Category filter chips */}
              {topCats.length > 1 && (
                <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto', flexShrink: 0 }}>
                  <button onClick={() => setActCategoryFilter('all')} style={{
                    padding: '4px 12px', borderRadius: 16, flexShrink: 0, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: actCategoryFilter === 'all' ? '#1C1B1F' : '#fff',
                    color: actCategoryFilter === 'all' ? '#fff' : '#6B7280',
                    border: `1.5px solid ${actCategoryFilter === 'all' ? '#1C1B1F' : 'var(--border)'}`,
                  }}>All</button>
                  {topCats.map((cat) => (
                    <button key={cat} onClick={() => setActCategoryFilter(cat)} style={{
                      padding: '4px 12px', borderRadius: 16, flexShrink: 0, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: actCategoryFilter === cat ? '#1C1B1F' : '#fff',
                      color: actCategoryFilter === cat ? '#fff' : '#6B7280',
                      border: `1.5px solid ${actCategoryFilter === cat ? '#1C1B1F' : 'var(--border)'}`,
                    }}>{CAT_LABEL[cat] ?? cat}</button>
                  ))}
                </div>
              )}
              {(() => {
                // Rated activities first, unrated behind "Show more"
                const ratedActs = filtered.filter(a => a.rating)
                const unratedActs = filtered.filter(a => !a.rating)
                const primary = ratedActs.length > 0 ? ratedActs : filtered
                const displayed = showAllActivities ? primary : primary.slice(0, RESULT_LIMIT)
                const hidden = primary.length - RESULT_LIMIT
                const renderCard = (act: typeof filtered[0]) => (
                  <ActivityCard
                    key={act.id} act={act}
                    expanded={expandedActId === act.id}
                    highlighted={selectedPinId === act.id}
                    onToggle={() => setExpandedActId(expandedActId === act.id ? null : act.id)}
                    isAdded={addedActIds.has(act.id)}
                    onAdd={() => d.addActivity({ actId: act.id, actName: act.name, emoji: act.emoji, dayNumber: 1 })}
                    onRemove={() => d.removeActivity(act.id)}
                    onMapPin={() => setSelectedPinId(act.id)}
                  />
                )
                return (
                  <>
                    <div className="activity-grid" style={{ padding: '0 16px' }}>
                      {displayed.map(renderCard)}
                    </div>
                    {!showAllActivities && hidden > 0 && (
                      <button onClick={() => setShowAllActivities(true)} style={{
                        margin: '4px 16px 0', width: 'calc(100% - 32px)',
                        padding: '10px', borderRadius: 10,
                        border: '1px dashed var(--border)', background: 'none',
                        fontSize: 12, color: '#6B7280', fontWeight: 600, cursor: 'pointer',
                      }}>
                        Show all {primary.length} things to do ↓
                      </button>
                    )}
                    {showAllActivities && unratedActs.length > 0 && ratedActs.length > 0 && (
                      <div className="activity-grid" style={{ padding: '0 16px', marginTop: 8 }}>{unratedActs.map(renderCard)}</div>
                    )}
                  </>
                )
              })()}
            </SectionBlock>
          )
        })()}

        {/* ── Eat & Drink ── */}
        {showFood && (
          <SectionBlock
            id="section-food"
            title="Eat & Drink"
            icon="🍽"
            count={d.dbFood.length + d.curatedDining.length}
            loading={d.dbLoading && d.dbFood.length === 0 && d.curatedDining.length === 0}
            empty={!d.dbLoading && d.dbFood.length === 0 && d.curatedDining.length === 0}
          >
            {(() => {
              const SPA_CATS = new Set(['spa','wellness','beauty_salon','beauty','gym','fitness','market','markets','farmers_market','flea_market','night_market','shopping_mall','department_store','supermarket'])
              const foodOnly = d.dbFood.filter((f) => !SPA_CATS.has(f.category.toLowerCase()) && !/\bmarkets?\b/i.test(f.name))

              // Curated local favs from foodDrink.ts (hand-picked signature spots)
              type CuratedItem = { id: string; type: LivePOI['type']; name: string; lat?: number; lng?: number; description?: string; website?: string; isLocalFav: true }
              const curatedItems: CuratedItem[] = [
                ...d.curatedDining.map((f) => ({
                  id: f.id, type: (f.category?.toLowerCase() ?? 'restaurant') as LivePOI['type'],
                  name: f.name, lat: f.coord?.lat, lng: f.coord?.lng,
                  description: f.signature_dish ? `★ ${f.signature_dish}` : f.description,
                  isLocalFav: true as const,
                })),
              ]
              const curatedNames = new Set(curatedItems.map((c) => c.name.toLowerCase()))

              const ratedFood = foodOnly.filter((f) => {
                const a = (f.attributes as Record<string, unknown>) ?? {}
                return (a.rating as number | undefined) && (a.review_count as number | undefined)
              })
              const unratedFood = foodOnly.filter((f) => {
                const a = (f.attributes as Record<string, unknown>) ?? {}
                return !((a.rating as number | undefined) && (a.review_count as number | undefined))
              })
              const hasEnoughRated = ratedFood.length >= 1
              // Always show rated food first — unrated food hidden under "Show more"
              const primaryFood = ratedFood
                .filter((f) => !curatedNames.has(f.name.toLowerCase())) // don't duplicate curated items

              const FOOD_CAT_LABEL: Record<string, string> = {
                cafe: 'Cafe', restaurant: 'Restaurant', winery: 'Winery',
                pub: 'Pub', bakery: 'Bakery', distillery: 'Distillery',
                brewery: 'Brewery', fast_food: 'Takeaway', bar: 'Bar',
                ice_cream: 'Ice Cream', food_truck: 'Food Truck',
              }
              const catCounts = new Map<string, number>()
              for (const f of primaryFood) {
                const c = f.category.toLowerCase()
                catCounts.set(c, (catCounts.get(c) ?? 0) + 1)
              }
              const foodCats = [...catCounts.entries()]
                .filter(([, n]) => n >= 1)
                .sort((a, b) => b[1] - a[1])
                .map(([c]) => c)

              const filteredFood = foodCategoryFilter === 'all'
                ? primaryFood
                : primaryFood.filter((f) => f.category.toLowerCase() === foodCategoryFilter)
              const displayed = showAllFood ? filteredFood : filteredFood.slice(0, RESULT_LIMIT)
              const hidden = filteredFood.length - RESULT_LIMIT
              return (
                <>
                  {/* Category filter chips */}
                  {foodCats.length > 1 && (
                    <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
                      <button onClick={() => setFoodCategoryFilter('all')} style={{
                        padding: '5px 12px', borderRadius: 20, flexShrink: 0, cursor: 'pointer', fontSize: 11, fontWeight: foodCategoryFilter === 'all' ? 700 : 500,
                        background: foodCategoryFilter === 'all' ? '#1C1B1F' : '#fff', color: foodCategoryFilter === 'all' ? '#fff' : '#6B7280',
                        border: `1.5px solid ${foodCategoryFilter === 'all' ? '#1C1B1F' : 'var(--border)'}`,
                      }}>All</button>
                      {foodCats.map((c) => (
                        <button key={c} onClick={() => { setFoodCategoryFilter(foodCategoryFilter === c ? 'all' : c); setShowAllFood(false) }} style={{
                          padding: '5px 12px', borderRadius: 20, flexShrink: 0, cursor: 'pointer', fontSize: 11, fontWeight: foodCategoryFilter === c ? 700 : 500,
                          background: foodCategoryFilter === c ? '#1C1B1F' : '#fff', color: foodCategoryFilter === c ? '#fff' : '#6B7280',
                          border: `1.5px solid ${foodCategoryFilter === c ? '#1C1B1F' : 'var(--border)'}`,
                          whiteSpace: 'nowrap',
                        }}>{FOOD_CAT_LABEL[c] ?? c}</button>
                      ))}
                    </div>
                  )}
                  <div className="activity-grid" style={{ padding: '0 16px' }}>
                    {/* Curated local favs pinned at top with ◆ */}
                    {foodCategoryFilter === 'all' && curatedItems.map((f) => (
                      <FoodCard key={`curated-${f.id}`} poi={{ ...f, description: f.description }} destName={d.shortDest} isLocalFav />
                    ))}
                    {displayed.map((f) => {
                      const attr = (f.attributes as Record<string, unknown>) ?? {}
                      const placeId = attr.google_place_id as string | undefined
                      const cuisineTags = attr.cuisine_tags as string[] | undefined
                      const pinId = String(f.food_place_id)
                      // website: only the actual business URL, not a google maps link
                      const websiteUri = attr.website_uri as string | undefined
                      return (
                        <FoodCard key={f.food_place_id} poi={{
                          id: pinId,
                          type: f.category.toLowerCase() as LivePOI['type'],
                          name: f.name,
                          lat: f.lat, lng: f.lng,
                          rating: attr.rating as number | undefined,
                          totalRatings: attr.review_count as number | undefined,
                          cuisine: cuisineTags?.join(' · '),
                          website: websiteUri && !websiteUri.includes('google.com') ? websiteUri : undefined,
                          placeId,
                          editorialSummary: attr.editorial_summary as string | undefined,
                          description: f.description || undefined,
                          openingHoursPeriods: attr.opening_hours_periods as import('@/lib/overpass').OpenHoursPeriod[] | undefined,
                        }} destName={d.shortDest}
                        highlighted={selectedPinId === pinId}
                        onMapPin={f.lat && f.lng ? () => setSelectedPinId(pinId) : undefined} />
                      )
                    })}
                  </div>
                  {!showAllFood && hidden > 0 && (
                    <button onClick={() => setShowAllFood(true)} style={{
                      margin: '4px 16px 0', width: 'calc(100% - 32px)',
                      padding: '10px', borderRadius: 10,
                      border: '1px dashed var(--border)', background: 'none',
                      fontSize: 12, color: '#6B7280', fontWeight: 600, cursor: 'pointer',
                    }}>
                      Show more rated places ↓
                    </button>
                  )}
                  {hasEnoughRated && unratedFood.length > 0 && showAllFood && (
                    <div style={{ margin: '12px 16px 0' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>No reviews yet</div>
                      <div className="activity-grid">
                        {unratedFood.map((f) => {
                          const attr = (f.attributes as Record<string, unknown>) ?? {}
                          const placeId = attr.google_place_id as string | undefined
                          const websiteUri = attr.website_uri as string | undefined
                          return (
                            <FoodCard key={f.food_place_id} poi={{
                              id: String(f.food_place_id),
                              type: f.category.toLowerCase() as LivePOI['type'],
                              name: f.name, lat: f.lat, lng: f.lng,
                              placeId,
                              website: websiteUri && !websiteUri.includes('google.com') ? websiteUri : undefined,
                            }} destName={d.shortDest} />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            {d.livePOIs !== null && d.foodPOIs.length === 0 && d.curatedDining.length === 0 && (
              <div style={{ margin: '0 16px 12px', padding: '16px', background: '#F8F7F4', borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
                  No venue data in our directory for {d.shortDest} yet.
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=cafes+restaurants+near+${encodeURIComponent(d.shortDest + ' Victoria')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '9px 18px', borderRadius: 9, background: '#1C1B1F', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                >
                  Find food near {d.shortDest} on Google Maps ↗
                </a>
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


        {/* Nature merged into Things to Do above */}

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
              loading={d.dbLoading}
              empty={!d.dbLoading && (d.accommodationPOIs ?? []).length === 0}
            >
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="activity-grid" style={{ gap: 8 }}>
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

        {/* ── Fuel Stops ── */}
        {filter === 'fuel' && (
          <div style={{ padding: '16px 16px 0' }}>
            <SectionHeader title="Best Fuel Along Your Route" icon="⛽" count={0} />
            {fuelLoading ? (
              <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>Finding stations…</div>
            ) : fuelStops.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>No fuel data available.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {fuelStops.map((stop) => (
                  <div key={stop.label} style={{
                    background: '#fff', borderRadius: 14, border: '1px solid var(--border)',
                    padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>{stop.label}</div>
                    {stop.brandNotFound ? (
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                        No {(d.vehicleProfile as unknown as { fuel_brand?: string }).fuel_brand} stations found nearby — try selecting "Any" brand in trip settings.
                      </div>
                    ) : stop.station ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 12, background: '#F0FDF4',
                          border: '1.5px solid #BBF7D0', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: '#16A34A', lineHeight: 1 }}>${stop.station.pricePerLitre.toFixed(3)}</span>
                          <span style={{ fontSize: 8, color: '#6B7280', marginTop: 1 }}>/litre</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A', marginBottom: 1 }}>{stop.station.name}</div>
                          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>{stop.station.brand} · Service Station</div>
                          {stop.station.address && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{stop.station.address}</div>}
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{stop.station.distanceKm} km from your route</div>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.station.brand + ' ' + stop.station.address)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#16A34A', padding: '7px 11px', borderRadius: 9, textDecoration: 'none', flexShrink: 0 }}
                        >Maps ↗</a>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>No stations found nearby.</div>
                    )}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingBottom: 4 }}>
                  Prices from Service Victoria — updated daily
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ padding: '24px 16px 20px', borderTop: '1px solid var(--border)', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Place data © Google · Map © OpenStreetMap</span>
            <span style={{ fontSize: 10, color: '#C8C4BD', fontWeight: 600 }}>v1.3.6</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => window.dispatchEvent(new CustomEvent('show-privacy'))} style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>Privacy & Attribution</button>
            <a href="mailto:support@cubixit.com.au" style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>Feedback</a>
          </div>
        </div>
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

function FoodCard({ poi, destName, highlighted, onMapPin, isLocalFav }: {
  poi: LivePOI; destName: string; highlighted?: boolean; onMapPin?: () => void; isLocalFav?: boolean
}) {
  const tag = POI_TAG[poi.type] ?? { emoji: '🍽', label: poi.type, color: '#B45309', bg: '#FEF3C7' }
  const mapsUrl = poi.placeId
    ? `https://www.google.com/maps/place/?q=place_id:${poi.placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name + ' ' + destName)}`

  const openStatus = getOpenStatus(poi.openingHoursPeriods)

  return (
    <div data-poi-id={poi.id} onClick={onMapPin} style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      background: highlighted ? '#F0F9FF' : isLocalFav ? '#F0FDF4' : '#fff', borderRadius: 14,
      border: `1.5px solid ${highlighted ? '#3B82F6' : isLocalFav ? 'rgba(58,107,79,0.25)' : 'var(--border)'}`,
      padding: '14px',
      boxShadow: highlighted ? '0 0 0 3px rgba(59,130,246,0.15)' : isLocalFav ? '0 2px 8px rgba(58,107,79,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'all 0.15s', cursor: onMapPin ? 'pointer' : 'default',
    }}>
      {/* Type chip + local fav or map pin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18 }}>{tag.emoji}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: tag.color, background: tag.bg, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tag.label}
        </span>
        {isLocalFav
          ? <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: '#E8F5EE', border: '1px solid rgba(58,107,79,0.2)', borderRadius: 20, padding: '2px 8px' }}>
              <span style={{ fontSize: 11, color: GREEN }}>◆</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.02em' }}>Local gem</span>
            </span>
          : onMapPin && <span style={{ marginLeft: 'auto', fontSize: 12, color: highlighted ? '#3B82F6' : '#9CA3AF' }} title="Show on map">📍</span>
        }
      </div>

      {/* Name */}
      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1C1B1F', lineHeight: 1.3 }}>
        {poi.name}
      </div>

      {/* Rating */}
      {poi.rating && (
        <StarRating rating={poi.rating} count={poi.totalRatings} />
      )}

      {/* Description — editorial summary from Google, or hand-written for curated items */}
      {(poi.editorialSummary || poi.description) && (
        <div style={{ fontSize: 11.5, color: '#49454F', lineHeight: 1.55 }}>
          {poi.editorialSummary || poi.description}
        </div>
      )}

      {/* Cuisine tag */}
      {poi.cuisine && (
        <span style={{ fontSize: 11, color: '#6B7280' }}>{poi.cuisine}</span>
      )}

      {/* Open/closed */}
      {openStatus && (
        <div style={{ fontSize: 11, fontWeight: 600, color: openStatus.isOpen ? '#16A34A' : '#DC2626' }}>
          {openStatus.isOpen ? 'Open now' : `Closed${openStatus.nextOpen ? ` — opens ${openStatus.nextOpen}` : ''}`}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        {poi.website && !poi.website.includes('google.com') && (
          <a href={poi.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: '#F8F7F4', border: '1px solid var(--border)', color: '#374151', fontSize: 11.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Website ↗
          </a>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: '#1C1B1F', color: '#fff', fontSize: 11.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Open in Maps ↗
        </a>
      </div>
    </div>
  )
}

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({ act, expanded, highlighted, onToggle, isAdded, onAdd, onRemove, onMapPin }: {
  act: Activity; expanded: boolean; highlighted?: boolean; onToggle: () => void
  isAdded?: boolean; onAdd?: () => void; onRemove?: () => void; onMapPin?: () => void
}) {
  const tag = CAT_TAG[act.category] ?? { label: act.category, color: '#374151', bg: '#F3F4F6' }
  const mapsUrl = act.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' Victoria AU')}`
  const websiteUrl = act.websiteUri && !act.websiteUri.includes('google.com') ? act.websiteUri : null
  const openStatus = getOpenStatus(act.openingHoursPeriods)

  const handleToggle = () => {
    onToggle()
    if (!expanded && onMapPin) onMapPin()
  }

  return (
    <div data-poi-id={act.id} onClick={handleToggle} style={{
      background: highlighted ? '#F0F9FF' : isAdded ? '#F0FDF4' : act.isHiddenGem ? '#F0FDF4' : '#fff',
      borderRadius: 14,
      border: `1.5px solid ${highlighted ? '#3B82F6' : isAdded ? 'rgba(58,107,79,0.4)' : act.isHiddenGem ? 'rgba(58,107,79,0.25)' : 'var(--border)'}`,
      padding: '13px 15px', cursor: 'pointer',
      transition: 'all 0.15s',
      boxShadow: highlighted ? '0 0 0 3px rgba(59,130,246,0.2)' : act.isHiddenGem ? '0 2px 8px rgba(58,107,79,0.1)' : expanded ? '0 4px 20px rgba(0,0,0,0.09)' : '0 1px 3px rgba(0,0,0,0.04)',
      transform: expanded ? 'translateY(-1px)' : 'none',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            <Chip label={tag.label} color={tag.color} bg={tag.bg} />
            {act.cost === 'free' && <Chip label="Free" color={GREEN} bg="#E8F5EE" />}
            {isAdded && <Chip label="In your plan" color={GREEN} bg="#E8F5EE" />}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1C1B1F', marginBottom: 3, lineHeight: 1.3 }}>{act.name}</div>
          {act.rating && (
            <div style={{ marginBottom: 3 }}>
              <StarRating rating={act.rating} count={act.reviewCount} />
            </div>
          )}
          {!expanded && act.description && (
            <div style={{ fontSize: 11.5, color: '#49454F', lineHeight: 1.55 }}>
              {act.description.length > 90 ? act.description.slice(0, 90) + '…' : act.description}
            </div>
          )}
          {openStatus && !expanded && (
            <div style={{ fontSize: 10.5, fontWeight: 600, color: openStatus.isOpen ? '#16A34A' : '#DC2626', marginTop: 3 }}>
              {openStatus.isOpen ? 'Open now' : `Closed${openStatus.nextOpen ? ` — opens ${openStatus.nextOpen}` : ''}`}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 4 }}>⏱ {act.duration}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {act.isHiddenGem
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#E8F5EE', border: '1px solid rgba(58,107,79,0.2)', borderRadius: 20, padding: '3px 8px', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: GREEN }}>◆</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: GREEN, letterSpacing: '0.02em' }}>Local gem</span>
              </span>
            : onMapPin && (
                <button onClick={(e) => { e.stopPropagation(); onMapPin() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: highlighted ? '#3B82F6' : '#C8C4BD', padding: 0, lineHeight: 1 }} title="Show on map">📍</button>
              )
          }
          <span style={{ fontSize: 12, color: '#9CA3AF', transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none', marginTop: 2 }}>▾</span>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {act.description && (
            <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.65, margin: 0 }}>{act.description}</p>
          )}
          {openStatus && (
            <div style={{ fontSize: 11.5, fontWeight: 600, color: openStatus.isOpen ? '#16A34A' : '#DC2626' }}>
              {openStatus.isOpen ? 'Open now' : `Closed${openStatus.nextOpen ? ` — opens ${openStatus.nextOpen}` : ''}`}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                style={{ padding: '9px 14px', borderRadius: 9, background: '#F8F7F4', border: '1px solid var(--border)', color: '#374151', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Website ↗
              </a>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              style={{ flex: websiteUrl ? undefined : 1, display: 'block', textAlign: 'center', padding: '9px 14px', borderRadius: 9, background: '#1C1B1F', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Open in Maps ↗
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


// ── Accommodation grid card ───────────────────────────────────────────────────

function AccommodationGridCard({ poi, destName }: { poi: AccommodationPOI; destName: string }) {
  const cfg = ACCOM_POI_CFG[poi.type]
  const attr = (poi as unknown as { attributes?: Record<string, unknown> }).attributes ?? {}
  const accomPlaceId = attr.google_place_id as string | undefined
  const mapsUrl = accomPlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${accomPlaceId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name + ' ' + destName)}`
  const editorialSummary = attr.editorial_summary as string | undefined
  const websiteUri = attr.website_uri as string | undefined
  const websiteUrl = websiteUri && !websiteUri.includes('google.com') ? websiteUri : null
  const openStatus = getOpenStatus(attr.opening_hours_periods as import('@/lib/overpass').OpenHoursPeriod[] | undefined)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      background: '#fff', borderRadius: 14, border: '1px solid var(--border)',
      padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Type chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {cfg.label}
        </span>
      </div>

      {/* Name */}
      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1C1B1F', lineHeight: 1.3 }}>
        {poi.name}
      </div>

      {/* Hotel stars */}
      {poi.stars && (
        <div style={{ fontSize: 12, color: '#F59E0B' }}>{'★'.repeat(poi.stars)}{'☆'.repeat(Math.max(0, 5 - poi.stars))}</div>
      )}

      {/* Editorial summary */}
      {editorialSummary && (
        <div style={{ fontSize: 11.5, color: '#49454F', lineHeight: 1.55 }}>{editorialSummary}</div>
      )}

      {/* Open/closed */}
      {openStatus && (
        <div style={{ fontSize: 11, fontWeight: 600, color: openStatus.isOpen ? '#16A34A' : '#DC2626' }}>
          {openStatus.isOpen ? 'Open now' : `Closed${openStatus.nextOpen ? ` — opens ${openStatus.nextOpen}` : ''}`}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        {websiteUrl && (
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: '#F8F7F4', border: '1px solid var(--border)', color: '#374151', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>
            Website ↗
          </a>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: '#1C1B1F', color: '#fff', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>
          Open in Maps ↗
        </a>
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



// suppress unused import warning
void (null as unknown as AddedDiningStop)
void (null as unknown as AddedActivity)
