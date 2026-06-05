import { useState, useEffect, useCallback, useRef } from 'react'
import { usePlannerData } from '@/hooks/usePlannerData'
import { useAppStore } from '@/store/useAppStore'
import { useTrails } from '@/hooks/useTrails'
import { CORRIDORS } from '@/data/corridors.ts'
import type { Coordinate } from '@/types'
import type { LivePOI, AccommodationPOI } from '@/lib/overpass'
import type { HazardAlert } from '@/lib/vicEmergency'
import type { Activity } from '@/data/victorianActivities'
import type { GuardrailWarning } from '@/types'
import { ResultCard } from './ResultCard'

const GREEN = '#3A6B4F'
const WARM  = '#B87333'

// Build a Google Maps URL that opens pinned to exact coordinates when available.
// Coordinate-based URLs open the right location on the map immediately.
// Coordinate pin link — always opens at the exact location, no Google Place ID needed
function safeMapsUrl(mapsUrl: string | undefined | null, name: string, lat?: number | null, lng?: number | null): string {
  if (lat && lng) return `https://maps.google.com/?q=${lat},${lng}`
  if (mapsUrl && mapsUrl.includes('query_place_id=')) return mapsUrl
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Victoria')}`
}

function coordMapsUrl(name: string, lat?: number | null, lng?: number | null): string {
  if (lat && lng) return `https://maps.google.com/?q=${lat},${lng}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Victoria')}`
}

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
  winery:        { label: 'Winery',        color: '#7E22CE', bg: '#FAF5FF' },
  brewery:       { label: 'Brewery',       color: '#92400E', bg: '#FEF3C7' },
  distillery:    { label: 'Distillery',    color: '#374151', bg: '#F3F4F6' },
  markets:       { label: 'Markets',       color: '#059669', bg: '#ECFDF5' },
  viewpoint:     { label: 'Scenic View',   color: '#4338CA', bg: '#EEF2FF' },
  beach:         { label: 'Beach',         color: '#0369A1', bg: '#E0F2FE' },
  wellness:      { label: 'Wellness',      color: '#0891B2', bg: '#ECFEFF' },
  entertainment: { label: 'Entertainment', color: '#9333EA', bg: '#F3E8FF' },
  sports:        { label: 'Sports',        color: '#15803D', bg: '#DCFCE7' },
  shopping:      { label: 'Shopping',      color: '#BE185D', bg: '#FCE7F3' },
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

type FilterMode = 'all' | 'activities' | 'food' | 'stay' | 'fuel' | 'trails'

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

// ── Open/closed status from opening_hours (OSM) ─────────

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
  const destCoord = useAppStore((s) => s.destCoord)
  const vibes = d.userProfile?.preferred_vibe ?? []
  const { trails } = useTrails(destCoord, vibes)
  const hikingSelected = vibes.includes('Hiking') || vibes.includes('Cycling')
  const setDisplayedMapPins = useAppStore((s) => s.setDisplayedMapPins)
  const setActivePOIFilter = useAppStore((s) => s.setActivePOIFilter)
  const placesLimitedMode = false // Google Places removed — always Overpass/Supabase
  const selectedPinId = useAppStore((s) => s.selectedPinId)
  const setSelectedPinId = useAppStore((s) => s.setSelectedPinId)
  const panelRef = useRef<HTMLDivElement>(null)

  const [filter, setFilter] = useState<FilterMode>('all')
  const [actCategoryFilter, setActCategoryFilter] = useState<string>('all')
  const [expandedActId, setExpandedActId] = useState<string | null>(null)
  const [_expandedPoiId, setExpandedPoiId] = useState<string | null>(null)
  const [showAllAccom, setShowAllAccom] = useState(false)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [fuelStops, setFuelStops] = useState<FuelStop[]>([])
  const [fuelLoading, setFuelLoading] = useState(false)

  const RESULT_LIMIT = 10



  const CAT_EMOJI_MAP: Record<string, string> = {
    nature: '🌿', viewpoint: '🌄', history: '🏛️', art: '🎨', active: '🏄',
    wildlife: '🦘', relaxation: '🧖', wellness: '♨️', beach: '🏖️',
    entertainment: '🎵', markets: '🛒', family: '👨‍👩‍👧', hiking: '🥾',
    Winery: '🍷', Brewery: '🍺', Distillery: '🥃', Pub: '🍻',
    Restaurant: '🍽️', Cafe: '☕', Bakery: '🥐',
    hotel: '🏨', motel: '🏨', campsite: '⛺', cabin: '🏕️',
    caravan_park: '🚐', hostel: '🛏️', guest_house: '🏡',
  }

  const syncMapPins = useCallback((_f: FilterMode, _pois: LivePOI[], stops?: FuelStop[]) => {
    if (_f === 'all') {
      // Default view — no POI pins, just destination centred
      setDisplayedMapPins([])
      return
    }
    if (_f === 'fuel') {
      setDisplayedMapPins((stops ?? []).filter((s) => s.station).map((s) => ({
        id: `fuel-${s.label}`, lat: s.station!.lat, lng: s.station!.lng,
        type: 'fuel', emoji: '⛽',
        name: `${s.station!.brand} — $${s.station!.pricePerLitre.toFixed(3)}/L (${s.label})`,
      })))
      return
    }
    if (_f === 'food') {
      setDisplayedMapPins(
        (d.dbFood ?? []).filter(f => f.lat && f.lng).map(f => ({
          id: String(f.food_place_id),
          lat: f.lat!, lng: f.lng!,
          type: f.category,
          emoji: CAT_EMOJI_MAP[f.category] ?? '🍽️',
          name: f.name,
        }))
      )
      return
    }
    if (_f === 'stay') {
      setDisplayedMapPins(
        (d.accommodationPOIs ?? []).filter(a => a.lat && a.lng).map(a => ({
          id: a.id,
          lat: a.lat!, lng: a.lng!,
          type: a.type,
          emoji: CAT_EMOJI_MAP[a.type] ?? '🏨',
          name: a.name,
        }))
      )
      return
    }
    // activities / trails tab — DB activities + nature
    setDisplayedMapPins([
      ...d.dbActivities.filter(a => a.lat && a.lng).map(a => ({
        id: String(a.activity_id),
        lat: a.lat!, lng: a.lng!,
        type: a.category,
        emoji: CAT_EMOJI_MAP[a.category] ?? a.emoji ?? '📍',
        name: a.name,
      })),
      ...d.dbNature.filter(n => n.lat && n.lng).map(n => ({
        id: `nature-${n.nature_spot_id}`,
        lat: n.lat!, lng: n.lng!,
        type: n.type,
        emoji: CAT_EMOJI_MAP[n.type] ?? '🌿',
        name: n.name,
      })),
    ])
  }, [d.dbActivities, d.dbNature, d.dbFood, d.accommodationPOIs]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFuelStops = useCallback(async () => {
    if (!d.activeItinerary || !d.vehicleProfile) return
    if (d.vehicleProfile.fuel_type === 'Electric') return
    if ((d.vehicleProfile as unknown as { skip_fuel?: boolean }).skip_fuel) return
    const waypoints = d.activeItinerary.route?.waypoints
    if (!waypoints || waypoints.length < 2) return

    const origin = waypoints[0].coord
    const dest = waypoints[waypoints.length - 1].coord

    // Use corridor path_coordinates — actual road geometry, not straight-line guesses
    const corridorIds = d.activeItinerary.route?.corridor_ids ?? []
    const roadPath: Coordinate[] = corridorIds.flatMap(id =>
      CORRIDORS.find(c => c.id === id)?.path_coordinates ?? []
    )
    const pathToSample = roadPath.length >= 3 ? roadPath : [origin, dest]
    const q1 = pathToSample[Math.floor(pathToSample.length * 0.33)]
    const q2 = pathToSample[Math.floor(pathToSample.length * 0.67)]
    const spots = [
      { coord: q1,   label: 'Early on route' },
      { coord: q2,   label: 'Later on route' },
      { coord: dest, label: 'Near destination' },
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
    if (f === 'fuel') {
      const stops = fuelStops.length > 0 ? fuelStops : await fetchFuelStops()
      syncMapPins(f, [], stops)
    } else {
      syncMapPins(f, [])
    }
    setShowAllActivities(false)
  }

  useEffect(() => {
    syncMapPins(filter, [])
  }, [d.dbActivities.length, d.dbNature.length, d.dbFood?.length, d.accommodationPOIs?.length, d.livePOIs]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const addedActIds = new Set(d.addedActivities.map((a) => a.actId))
  const showStay  = (filter === 'all' || filter === 'stay')

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
        {(([
          ['all',        'All'],
          ['activities', '🗺 Things to Do'],
          ...((d.dbFood?.length ?? 0) > 0 ? [['food', '🍽 Food & Drinks']] : []),
          ...(trails.length > 0 ? [['trails', '🥾 Trails']] : []),
          ['stay', '🏨 Stay'],
          ...(d.vehicleProfile && d.vehicleProfile.fuel_type !== 'Electric' && !(d.vehicleProfile as unknown as { skip_fuel?: boolean }).skip_fuel ? [['fuel', '⛽ Fuel']] : []),
        ]) as [string, string][]).map(([f, label]) => (
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
        {(d.activeItinerary.all_warnings?.length ?? 0) > 0 && (
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
              description: a.description || '',
              duration: a.duration || '',
              cost: (a.cost as Activity['cost']) || 'free',
              kidsOk: a.kids_ok,
              isHiddenGem: a.is_hidden_gem,
              mapsUrl: safeMapsUrl(a.maps_url, a.name, a.lat, a.lng),
              tags: a.tags ?? [],
              websiteUri: aAttr.website_uri as string | undefined,
              phone: (a as any).phone as string | undefined,
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
            mapsUrl: coordMapsUrl(n.name, n.lat, n.lng),
            tags: [n.type],
          }))

          // All activities from Supabase (enriched via Overpass/OSM)
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

          // Filter by drive time — exclude POIs >45 min from destination (only when OSRM has loaded)
          const MAX_DRIVE_MIN = 45
          const withinRange = (slug: string) => {
            const mins = d.driveMinutes.get(slug)
            return mins == null || mins <= MAX_DRIVE_MIN // null = OSRM not yet loaded, show all
          }
          const rangeFiltered = d.driveMinutes.size > 0
            ? allThingsToDo.filter((a) => {
                const slug = a.id.startsWith('nature-')
                  ? (d.dbNature.find(n => `nature-${n.nature_spot_id}` === a.id)?.slug ?? '')
                  : (d.dbActivities.find(act => String(act.activity_id) === a.id)?.slug ?? '')
                return withinRange(slug)
              })
            : allThingsToDo

          const filtered = actCategoryFilter === 'all'
            ? rangeFiltered
            : rangeFiltered.filter((a) => a.category === actCategoryFilter)

          const CAT_LABEL: Record<string, string> = {
            nature: '🌿 Nature', viewpoint: '🌄 Viewpoints', history: '🏛️ History',
            art: '🎨 Art', active: '🏄 Active', wildlife: '🦘 Wildlife',
            relaxation: '🧖 Relax', wellness: '♨️ Wellness', beach: '🏖️ Beach',
            entertainment: '🎵 Entertainment', markets: '🛒 Markets', family: '👨‍👩‍👧 Family',
            winery: '🍷 Wineries', brewery: '🍺 Breweries', distillery: '🥃 Distilleries',
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
                const renderCard = (act: typeof filtered[0]) => {
                  const tag = CAT_TAG[act.category] ?? { label: act.category, color: '#374151', bg: '#F3F4F6' }
                  const openStatus = getOpenStatus(act.openingHoursPeriods)
                  const driveMin = act.id.startsWith('nature-')
                    ? d.driveMinutes.get(d.dbNature.find(n => `nature-${n.nature_spot_id}` === act.id)?.slug ?? '') ?? null
                    : d.driveMinutes.get(d.dbActivities.find(a => String(a.activity_id) === act.id)?.slug ?? '') ?? null
                  return (
                    <ResultCard
                      key={act.id}
                      name={act.name}
                      categoryLabel={tag.label}
                      categoryColor={tag.color}
                      categoryBg={tag.bg}
                      emoji={act.emoji}
                      description={act.description}
                      rating={act.rating}
                      reviewCount={act.reviewCount}
                      duration={act.duration}
                      openStatus={openStatus}
                      isHiddenGem={act.isHiddenGem}
                      isAdded={addedActIds.has(act.id)}
                      driveMinutes={driveMin}
                      highlighted={selectedPinId === act.id}
                      mapsUrl={act.mapsUrl || coordMapsUrl(act.name, (act as any).lat, (act as any).lng)}
                      website={act.websiteUri && !act.websiteUri.includes('google.com') ? act.websiteUri : undefined}
                      phone={(act as any).phone}
                      onAdd={() => d.addActivity({ actId: act.id, actName: act.name, emoji: act.emoji, dayNumber: 1 })}
                      onRemove={() => d.removeActivity(act.id)}
                      onMapPin={() => setSelectedPinId(act.id)}
                    />
                  )
                }
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


        {/* ── Food & Drinks ── */}
        {(filter === 'all' || filter === 'food') && (() => {
          const allFoods = d.dbFood ?? []
          if (allFoods.length === 0) return null

          const DRINK_CATS = new Set(['Winery', 'Brewery', 'Distillery'])
          const FOOD_CAT_EMOJI: Record<string, string> = {
            Winery: '🍷', Brewery: '🍺', Distillery: '🥃',
            Pub: '🍻', Restaurant: '🍽️', Cafe: '☕', Bakery: '🥐',
          }
          const FOOD_CAT_COLOR: Record<string, { color: string; bg: string }> = {
            Winery:     { color: '#7E22CE', bg: '#FAF5FF' },
            Brewery:    { color: '#92400E', bg: '#FEF3C7' },
            Distillery: { color: '#374151', bg: '#F3F4F6' },
            Pub:        { color: '#1D4ED8', bg: '#EFF6FF' },
            Restaurant: { color: '#B45309', bg: '#FFFBEB' },
            Cafe:       { color: '#0369A1', bg: '#E0F2FE' },
            Bakery:     { color: '#047857', bg: '#ECFDF5' },
          }

          // Category filter state — use actCategoryFilter reused for food when in food mode
          const [foodCatFilter, setFoodCatFilter] = [
            filter === 'food' ? actCategoryFilter : 'all',
            filter === 'food' ? setActCategoryFilter : (_: string) => {},
          ]

          // Available categories in this destination
          const availCats = [...new Set(allFoods.map(f => f.category))].sort((a, b) => {
            const order = ['Winery','Brewery','Distillery','Pub','Restaurant','Cafe','Bakery']
            return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99)
          })

          const rangeFilteredFood = d.driveMinutes.size > 0
            ? allFoods.filter(f => { const m = d.driveMinutes.get(f.slug); return m == null || m <= 45 })
            : allFoods
          const filtered = foodCatFilter === 'all' ? rangeFilteredFood : rangeFilteredFood.filter(f => f.category === foodCatFilter)

          // Split: drink venues first, then food
          const drinkVenues = filtered.filter(f => DRINK_CATS.has(f.category))
          const foodVenues  = filtered.filter(f => !DRINK_CATS.has(f.category))

          // In 'all' overview: show top 4 drink + 3 food
          const showDrinks = filter === 'food' ? drinkVenues : drinkVenues.slice(0, 4)
          const showFood   = filter === 'food' ? foodVenues  : foodVenues.slice(0, 3)
          const totalShown = showDrinks.length + showFood.length

          const renderFoodCard = (f: import('@/hooks/usePlannerData').DbFoodPlace) => {
            const attr = f.attributes as { website_uri?: string; opening_hours_text?: string }
            const emoji = FOOD_CAT_EMOJI[f.category] ?? '🍽️'
            const cfg = FOOD_CAT_COLOR[f.category] ?? { color: '#374151', bg: '#F9FAFB' }
            const website = attr.website_uri ?? f.website ?? undefined
            const mapsUrl = coordMapsUrl(f.name, f.lat, f.lng)
            const driveMin = d.driveMinutes.get(f.slug) ?? null
            const cardId = String(f.food_place_id)
            return (
              <ResultCard
                key={cardId}
                name={f.name}
                categoryLabel={f.category}
                categoryColor={cfg.color}
                categoryBg={cfg.bg}
                emoji={emoji}
                description={f.description ?? undefined}
                driveMinutes={driveMin}
                website={website}
                mapsUrl={mapsUrl}
                phone={f.phone ?? undefined}
                highlighted={selectedPinId === cardId}
                onMapPin={() => setSelectedPinId(cardId)}
              />
            )
          }

          return (
            <SectionBlock
              id="section-food"
              title="Food & Drinks"
              icon="🍽️"
              count={allFoods.length}
              loading={d.dbLoading}
              empty={!d.dbLoading && allFoods.length === 0}
            >
              {/* Category filter chips — only shown in food tab */}
              {filter === 'food' && availCats.length > 1 && (
                <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto', flexShrink: 0 }}>
                  <button onClick={() => setFoodCatFilter('all')} style={{
                    padding: '4px 12px', borderRadius: 16, flexShrink: 0, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: foodCatFilter === 'all' ? '#1C1B1F' : '#fff',
                    color: foodCatFilter === 'all' ? '#fff' : '#6B7280',
                    border: `1.5px solid ${foodCatFilter === 'all' ? '#1C1B1F' : 'var(--border)'}`,
                  }}>All</button>
                  {availCats.map(cat => (
                    <button key={cat} onClick={() => setFoodCatFilter(cat)} style={{
                      padding: '4px 12px', borderRadius: 16, flexShrink: 0, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: foodCatFilter === cat ? '#1C1B1F' : '#fff',
                      color: foodCatFilter === cat ? '#fff' : '#6B7280',
                      border: `1.5px solid ${foodCatFilter === cat ? '#1C1B1F' : 'var(--border)'}`,
                    }}>{FOOD_CAT_EMOJI[cat]} {cat}s</button>
                  ))}
                </div>
              )}

              <div style={{ padding: '0 16px' }}>
                {/* Drink venues: Wineries, Breweries, Distilleries — shown first */}
                {showDrinks.length > 0 && (
                  <>
                    {filter === 'food' && foodCatFilter === 'all' && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 4 }}>
                        🍷 Cellar Doors & Craft Drinks
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: showFood.length > 0 ? 12 : 0 }}>
                      {showDrinks.map(renderFoodCard)}
                    </div>
                  </>
                )}

                {/* Food venues: Pubs, Restaurants, Cafes — shown after drink venues */}
                {showFood.length > 0 && (
                  <>
                    {filter === 'food' && foodCatFilter === 'all' && drinkVenues.length > 0 && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4, marginBottom: 8 }}>
                        🍽️ Places to Eat
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {showFood.map(renderFoodCard)}
                    </div>
                  </>
                )}

                {filter === 'all' && allFoods.length > totalShown && (
                  <button onClick={() => handleFilterChange('food')} style={{
                    width: '100%', padding: '9px', borderRadius: 9,
                    border: '1px dashed var(--border)', background: 'none',
                    fontSize: 12, color: '#6B7280', fontWeight: 500, cursor: 'pointer',
                  }}>
                    View all {allFoods.length} food & drink spots ↓
                  </button>
                )}
              </div>
            </SectionBlock>
          )
        })()}

        {/* ── Trails ── */}
        {trails.length > 0 && (filter === 'all' || filter === 'trails' || (hikingSelected && filter === 'activities')) && (
          <SectionBlock id="section-trails" title="Trails" icon="🥾" count={trails.length} loading={false} empty={false}>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {trails.map((trail) => {
                const typeLabel = trail.type === 'walk' ? 'Walking' : trail.type === 'cycle' ? 'Cycling' : 'Mountain Bike'
                const typeColor = trail.type === 'walk' ? '#2563EB' : trail.type === 'cycle' ? GREEN : '#7C3AED'
                const typeBg   = trail.type === 'walk' ? '#EFF6FF' : trail.type === 'cycle' ? '#F0FDF4' : '#F5F3FF'
                const topWps   = (trail.waypoints ?? []).filter(w => w.description).slice(0, 2)
                return (
                  <div key={trail.slug} style={{
                    background: '#fff', borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A', letterSpacing: '-0.01em', marginBottom: 4 }}>
                          {trail.name}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: typeColor, background: typeBg, padding: '2px 8px', borderRadius: 6 }}>
                            {typeLabel}
                          </span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>
                            {trail.distance_km} km · {trail.region}
                          </span>
                        </div>
                      </div>
                      <a
                        href={coordMapsUrl(trail.name, trail.waypoints?.[0]?.lat, trail.waypoints?.[0]?.lng)}
                        target="_blank" rel="noopener noreferrer"
                        style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: GREEN, textDecoration: 'none', padding: '4px 10px', border: `1px solid ${GREEN}`, borderRadius: 8 }}
                      >
                        Maps →
                      </a>
                    </div>

                    {/* Top waypoints */}
                    {topWps.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {topWps.map((wp) => (
                          <div key={wp.name} style={{ fontSize: 12, color: '#4A4948', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600, color: '#1C1C1A' }}>{wp.name}</span>
                            {wp.description && <span style={{ color: '#6B7280' }}> — {wp.description.slice(0, 120)}{wp.description.length > 120 ? '…' : ''}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Parks Victoria link */}
                    <a
                      href={`https://www.parks.vic.gov.au/search#stq=${encodeURIComponent(trail.name)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#6B7280', textDecoration: 'underline' }}
                    >
                      Check closures & conditions at Parks Victoria →
                    </a>
                  </div>
                )
              })}
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 8px', lineHeight: 1.6 }}>
                Trail data © <a href="https://www.data.vic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>data.vic.gov.au</a> (CC BY 4.0)
              </p>
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
              loading={d.dbLoading}
              empty={!d.dbLoading && (d.accommodationPOIs ?? []).length === 0}
            >
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="activity-grid" style={{ gap: 8 }}>
                  {displayed.map((poi) => {
                    const cfg = ACCOM_POI_CFG[poi.type] ?? ACCOM_POI_CFG['hotel']
                    const attr = (poi as unknown as { attributes?: Record<string, unknown> }).attributes ?? {}
                    const websiteUrl = (attr.website_uri as string | undefined) || poi.website || undefined
                    return (
                      <ResultCard
                        key={poi.id}
                        name={poi.name}
                        categoryLabel={cfg.label}
                        categoryColor={cfg.color}
                        categoryBg={cfg.bg}
                        emoji={cfg.emoji}
                        description={poi.description}
                        address={poi.address}
                        mapsUrl={coordMapsUrl(poi.name, poi.lat, poi.lng)}
                        website={websiteUrl}
                        highlighted={selectedPinId === poi.id}
                        onMapPin={() => setSelectedPinId(poi.id)}
                      />
                    )
                  })}
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
                          href={coordMapsUrl(stop.station.brand + ' ' + stop.station.address, stop.station.lat, stop.station.lng)}
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
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>OpenStreetMap</a> (ODbL) · Tiles © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>CARTO</a> · Content © <a href="https://en.wikipedia.org" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>Wikipedia</a> (CC BY-SA) · Heritage © <a href="https://vhd.heritagecouncil.vic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>Heritage Council Vic</a> (CC BY 4.0)</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>Privacy & Attribution</a>
            <a href="mailto:support@cubixit.com.au" style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>Feedback</a>
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Drink card ───────────────────────────────────────────────────────────────

// ── Shared place card (food, drink, accommodation) ───────────────────────────

function PlaceCard({ emoji, name, categoryLabel, categoryColor, categoryBg, description, website, mapsUrl, phone }: {
  emoji: string
  name: string
  categoryLabel: string
  categoryColor: string
  categoryBg: string
  description?: string
  website?: string
  mapsUrl: string
  phone?: string
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '12px', borderRadius: 12, cursor: 'pointer',
        border: `1.5px solid ${expanded ? 'rgba(58,107,79,0.35)' : 'var(--border)'}`,
        background: expanded ? '#F8FBF9' : 'var(--bg-card)',
        boxShadow: expanded ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.15s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: categoryBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>{emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap' }}>{name}</div>
          <span style={{
            display: 'inline-block', fontSize: 9.5, fontWeight: 700,
            color: categoryColor, background: categoryBg,
            padding: '1px 6px', borderRadius: 10, marginTop: 2,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{categoryLabel}</span>
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0, marginTop: 2, transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>

      {/* Description — collapsed: 2-line clamp; expanded: full */}
      {description && (
        <div style={{
          fontSize: 11, color: '#6B7280', lineHeight: 1.45, marginTop: 7,
          ...(expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
        }}>{description}</div>
      )}

      {/* Action buttons — always visible */}
      <div style={{ display: 'flex', gap: 5, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
        {website && (
          <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" style={{
            flex: 1, padding: '6px 0', borderRadius: 7, background: '#3A6B4F', color: '#fff',
            fontSize: 11, fontWeight: 600, textDecoration: 'none', textAlign: 'center',
          }}>Web ↗</a>
        )}
        {phone && expanded && (
          <a href={`tel:${phone}`} target="_blank" rel="noopener noreferrer" style={{
            padding: '6px 10px', borderRadius: 7, background: '#F0FDF4', border: '1px solid #BBF7D0',
            fontSize: 11, fontWeight: 600, color: '#16A34A', textDecoration: 'none',
          }}>📞</a>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
          flex: 1, padding: '6px 0', borderRadius: 7, textAlign: 'center',
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none',
        }}>Maps ↗</a>
      </div>
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

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({ act, expanded, highlighted, onToggle, isAdded, onAdd, onRemove, onMapPin }: {
  act: Activity; expanded: boolean; highlighted?: boolean; onToggle: () => void
  isAdded?: boolean; onAdd?: () => void; onRemove?: () => void; onMapPin?: () => void
}) {
  const tag = CAT_TAG[act.category] ?? { label: act.category, color: '#374151', bg: '#F3F4F6' }
  const mapsUrl = act.mapsUrl || coordMapsUrl(act.name, (act as any).lat, (act as any).lng)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                style={{ padding: '9px 14px', borderRadius: 9, background: '#F8F7F4', border: '1px solid var(--border)', color: '#374151', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Website ↗
              </a>
            )}
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {act.phone && (
                <a href={`tel:${act.phone}`} onClick={(e) => e.stopPropagation()}
                  title={act.phone}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', textDecoration: 'none', fontSize: 16 }}>
                  📞
                </a>
              )}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                title="Open in Google Maps"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, background: '#1C1B1F', color: '#fff', textDecoration: 'none', fontSize: 16 }}>
                📍
              </a>
            </div>
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

function AccommodationGridCard({ poi }: { poi: AccommodationPOI; destName?: string }) {
  const cfg = ACCOM_POI_CFG[poi.type]
  const attr = (poi as unknown as { attributes?: Record<string, unknown> }).attributes ?? {}
  const mapsUrl = coordMapsUrl(poi.name, poi.lat, poi.lng)
  const websiteUri = attr.website_uri as string | undefined
  const websiteUrl = websiteUri || poi.website || null

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

      {/* Description */}
      {poi.description && (
        <div style={{ fontSize: 11.5, color: '#49454F', lineHeight: 1.55 }}>{poi.description}</div>
      )}

      {/* Address */}
      {poi.address && (
        <div style={{ fontSize: 11, color: '#6B7280' }}>📍 {poi.address}</div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        {websiteUrl ? (
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: '#3A6B4F', color: '#fff', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>
            Website ↗
          </a>
        ) : (
          <a href={`https://www.google.com/search?q=${encodeURIComponent(poi.name + ' ' + (poi.address ?? 'Victoria Australia'))}`}
            target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: '#F8F7F4', border: '1px solid var(--border)', color: '#374151', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>
            Search ↗
          </a>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: '#1C1B1F', color: '#fff', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>
          Maps ↗
        </a>
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

