import { GREEN, WARM, SECONDARY } from '@/lib/brand'
import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer } from '@/components/map/MapContainer'
import { usePlannerData } from '@/hooks/usePlannerData'
import { useAppStore } from '@/store/useAppStore'
import { useWeather } from '@/hooks/useWeather'
import type { LivePOI } from '@/lib/overpass'
import type { HazardAlert } from '@/lib/vicEmergency'
import type { Activity } from '@/data/victorianActivities.ts'
import { ResultCard } from './ResultCard'


interface OpenPeriod { open: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }
function getOpenStatus(periods?: OpenPeriod[]): { isOpen: boolean; nextOpen?: string } | null {
  if (!periods || periods.length === 0) return null
  const now = new Date(); const day = now.getDay()
  const nowMins = day * 24 * 60 + now.getHours() * 60 + now.getMinutes()
  const toMins = (d: number, h: number, m: number) => d * 24 * 60 + h * 60 + m
  for (const p of periods) {
    const openM = toMins(p.open.day, p.open.hour, p.open.minute)
    if (!p.close) { if (nowMins >= openM) return { isOpen: true }; continue }
    const closeM = toMins(p.close.day, p.close.hour, p.close.minute)
    if (closeM > openM) { if (nowMins >= openM && nowMins < closeM) return { isOpen: true } }
    else { if (nowMins >= openM || nowMins < closeM) return { isOpen: true } }
  }
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  let minDiff = Infinity; let nextOpen: string | undefined
  for (const p of periods) {
    let diff = toMins(p.open.day, p.open.hour, p.open.minute) - nowMins
    if (diff <= 0) diff += 7 * 24 * 60
    if (diff < minDiff) {
      minDiff = diff; const h = p.open.hour; const m = p.open.minute
      const ampm = h >= 12 ? 'pm' : 'am'; const hd = h > 12 ? h - 12 : h === 0 ? 12 : h
      const md = m === 0 ? '' : `:${String(m).padStart(2, '0')}`
      nextOpen = (p.open.day === day && diff < 24 * 60) ? `${hd}${md} ${ampm}` : `${DAYS[p.open.day]} ${hd}${md} ${ampm}`
    }
  }
  return { isOpen: false, nextOpen }
}

const POI_TAG: Record<LivePOI['type'], { emoji: string; label: string; color: string; bg: string }> = {
  hiking:     { emoji: '🥾', label: 'Hiking',      color: '#2563EB', bg: '#EFF6FF' },
  viewpoint:  { emoji: '👁',  label: 'Scenic View', color: '#4338CA', bg: '#EEF2FF' },
  attraction: { emoji: '🏛',  label: 'Attraction',  color: '#7C3AED', bg: '#F5F3FF' },
  pub:        { emoji: '🍺',  label: 'Pub',         color: '#B87333', bg: '#FFF5EB' },
  winery:     { emoji: '🍷',  label: 'Winery',      color: '#7E22CE', bg: '#FAF5FF' },
  brewery:    { emoji: '🍺',  label: 'Brewery',     color: '#92400E', bg: '#FFFBEB' },
  distillery: { emoji: '🥃',  label: 'Distillery',  color: '#374151', bg: '#F3F4F6' },
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


function formatDrive(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

type FilterTab = 'explore' | 'food' | 'stay' | 'plan' | 'fuel'

const CAT_LABEL: Record<string, string> = {
  nature: '🌿 Nature', viewpoint: '🌄 Views', history: '🏛️ History',
  art: '🎨 Art', active: '🏄 Active', wildlife: '🦘 Wildlife',
  relaxation: '🧖 Relax', wellness: '♨️ Wellness', beach: '🏖️ Beach',
  entertainment: '🎵 Music', markets: '🛒 Markets', family: '👨‍👩‍👧 Family',
  drink: '🍷 Drink', food: '🍽️ Food',
}

const NATURE_EMOJI: Record<string, string> = {
  hiking: '🥾', viewpoint: '🌄', beach: '🏖️', waterfall: '💧',
  national_park: '🌿', nature_reserve: '🌿', hot_spring: '♨️',
  lake: '💧', river: '💧', cave: '🦇', forest: '🌳',
  wetland: '🌿', summit: '⛰️', gorge: '🏔️',
}

// ── Plan builder helpers ──────────────────────────────────────────────────────

function parseDurationMins(dur: string): number {
  if (!dur) return 60
  const lower = dur.toLowerCase()
  if (lower.includes('all day') || lower.includes('full day')) return 240
  const range = lower.match(/(\d+)\s*[–\-]\s*(\d+)\s*(hr|hour|min)/i)
  if (range) {
    const avg = (parseInt(range[1]) + parseInt(range[2])) / 2
    return range[3].startsWith('h') ? Math.round(avg * 60) : Math.round(avg)
  }
  const single = lower.match(/(\d+)\s*(hr|hour|h|min|m)/i)
  if (single) return single[2].startsWith('h') ? parseInt(single[1]) * 60 : parseInt(single[1])
  return 60
}

const CAT_REASON: Record<string, string> = {
  nature:        'Great first-up — nature spots are freshest in the morning',
  active:        'Best tackled early before the day heats up',
  hiking:        'Morning hikes are cooler and trails are quieter',
  viewpoint:     'Viewpoints look stunning in morning light',
  wildlife:      'Wildlife is most active in the morning hours',
  beach:         'Hit the beach early for the best conditions',
  history:       'History sites are easy going — a great mid-morning or afternoon activity',
  art:           'Galleries and art spaces are ideal for a relaxed afternoon',
  relaxation:    'A great afternoon wind-down activity',
  wellness:      'Afternoon is perfect for unwinding at a wellness experience',
  markets:       'Markets wind down early — aim for morning or mid-morning',
  family:        'Family attractions are best visited when energy is high in the morning',
  entertainment: 'Entertainment venues tend to open mid-day',
  food:          'Well-timed for lunch or a mid-trip break',
  drink:         'Enjoy a cellar door or brewery in the afternoon',
}

function formatTime(hour: number, min: number): string {
  const h = Math.floor((hour * 60 + min) / 60) % 24
  const m = (hour * 60 + min) % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function MobilePlanner() {
  const d = usePlannerData()
  const clearItinerary = useAppStore((s) => s.clearItinerary)
  const setDisplayedMapPins = useAppStore((s) => s.setDisplayedMapPins)
  const [tab, setTab] = useState<FilterTab>('explore')
  const [catFilter, setCatFilter] = useState('all')
  const [mapVisible, setMapVisible] = useState(true)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  interface MFuelStop { label: string; station: { name: string; brand: string; address: string; lat: number; lng: number; pricePerLitre: number; distanceKm: number } | null; brandNotFound?: boolean }
  const [fuelStops, setFuelStops] = useState<MFuelStop[]>([])
  const [fuelLoading, setFuelLoading] = useState(false)
  const [foodFilter, setFoodFilter] = useState('all')

  const hasFuel = !!(d.vehicleProfile && d.vehicleProfile.fuel_type !== 'Electric' && !(d.vehicleProfile as unknown as { skip_fuel?: boolean }).skip_fuel)

  const fetchFuel = async () => {
    if (!d.activeItinerary || !d.vehicleProfile || !hasFuel) return
    const wp = d.activeItinerary.route?.waypoints
    if (!wp || wp.length < 2) return
    const origin = wp[0].coord
    const dest = wp[wp.length - 1].coord
    const mid = { lat: (origin.lat + dest.lat) / 2, lng: (origin.lng + dest.lng) / 2 }
    const spots = [{ coord: origin, label: 'Near start' }, { coord: mid, label: 'En route' }, { coord: dest, label: 'Near destination' }]
    const brand = (d.vehicleProfile as unknown as { fuel_brand?: string | null }).fuel_brand
    const brandQ = brand && brand !== 'Any' ? `&brand=${encodeURIComponent(brand)}` : ''
    setFuelLoading(true)
    const results = await Promise.all(spots.map(async ({ coord, label }) => {
      try {
        const r = await fetch(`/api/fuel?lat=${coord.lat}&lng=${coord.lng}&fuelType=${d.vehicleProfile!.fuel_type}&limit=1&radius=50${brandQ}`)
        const data = await r.json() as { stations?: MFuelStop['station'][]; brandNotFound?: boolean }
        return { label, station: data.stations?.[0] ?? null, brandNotFound: data.brandNotFound }
      } catch { return { label, station: null } }
    }))
    setFuelStops(results)
    setFuelLoading(false)
  }

  // Weather for destination on trip date
  const destCoord = useAppStore((s) => s.destCoord)
  const startDate = useAppStore((s) => s.startDate)
  const weather = useWeather(destCoord)
  const tripDayForecast = useMemo(() => {
    if (!weather || !startDate) return null
    return weather.forecast.find((f) => f.date === startDate) ?? weather.forecast[0] ?? null
  }, [weather, startDate])
  const isBadWeather = !!(tripDayForecast && (tripDayForecast.weatherCode >= 61 || tripDayForecast.precipMm >= 2))
  const OUTDOOR_CATS = new Set(['nature', 'active', 'hiking', 'viewpoint', 'wildlife', 'beach', 'markets'])

  // Build scheduled plan from added activities + dining stops
  const scheduledPlan = useMemo(() => {
    const activityMap = new Map(d.dbActivities.map((a) => [String(a.activity_id), a]))
    const arrivalMins = Math.round((d.departureHour + d.driveHours) * 60 / 30) * 30 // round to 30-min slots
    let cursor = arrivalMins // minutes since midnight

    type PlanItem = {
      id: string; name: string; emoji: string; category: string
      duration: string; durationMins: number; timeMins: number
      reason: string; isDining: boolean; isOutdoor: boolean
      mapsUrl?: string
    }

    const items: PlanItem[] = []

    // Sort: outdoor/active first (morning), food at natural meal times, relaxation last
    const ORDER = ['hiking', 'active', 'nature', 'viewpoint', 'wildlife', 'beach', 'history', 'art', 'family', 'markets', 'entertainment', 'food', 'drink', 'relaxation', 'wellness']
    const actsSorted = [...d.addedActivities].sort((a, b) => {
      const aAct = activityMap.get(a.actId)
      const bAct = activityMap.get(b.actId)
      const ai = ORDER.indexOf(aAct?.category ?? '') ?? 99
      const bi = ORDER.indexOf(bAct?.category ?? '') ?? 99
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

    for (const added of actsSorted) {
      const act = activityMap.get(added.actId)
      const durMins = parseDurationMins(act?.duration ?? '')
      const cat = act?.category ?? ''
      const reason = CAT_REASON[cat] ?? 'A great addition to your day'
      items.push({
        id: added.actId, name: added.actName, emoji: added.emoji,
        category: cat, duration: act?.duration ?? '', durationMins: durMins,
        timeMins: cursor, reason, isDining: false,
        isOutdoor: OUTDOOR_CATS.has(cat),
        mapsUrl: act?.maps_url || undefined,
      })
      cursor += durMins + 15 // 15 min buffer between stops
    }

    // Interleave dining stops at natural meal times
    for (const stop of d.addedDiningStops) {
      const isMorning = stop.timeOfDay === 'morning'
      const mealMins = isMorning ? Math.max(cursor, arrivalMins + 90) : Math.max(cursor, arrivalMins + 240)
      items.push({
        id: stop.foodId, name: stop.stopName, emoji: isMorning ? '☕' : '🍽',
        category: 'food', duration: '45–60 min', durationMins: 50,
        timeMins: mealMins, reason: isMorning ? 'A great morning coffee or bite after the drive' : 'Well-timed for a proper lunch break',
        isDining: true, isOutdoor: false,
      })
    }

    // Re-sort by timeMins for display
    items.sort((a, b) => a.timeMins - b.timeMins)
    return { items, arrivalMins }
  }, [d.addedActivities, d.addedDiningStops, d.dbActivities, d.departureHour, d.driveHours])

  // Auto-populate map pins — prefer DB data (curated), fall back to Overpass
  useEffect(() => {
    if (d.dbNature.length > 0) {
      const actPins = d.dbNature
        .filter((n) => n.lat && n.lng)
        .slice(0, 10)
        .map((n) => ({ id: `nature-${n.nature_spot_id}`, lat: n.lat!, lng: n.lng!, type: 'attraction' as LivePOI['type'], name: n.name }))
      setDisplayedMapPins(actPins)
      return
    }
    if (!d.livePOIs) return
    const ACT_TYPES: LivePOI['type'][] = ['hiking', 'viewpoint', 'attraction', 'winery', 'brewery', 'distillery', 'pub']
    const actPins = d.livePOIs.filter((p) => ACT_TYPES.includes(p.type) && p.lat && p.lng).slice(0, 10)
    setDisplayedMapPins(actPins.map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, type: p.type, name: p.name })))
  }, [d.livePOIs, d.dbNature, setDisplayedMapPins])

  if (!d.activeItinerary) return null


  // Build merged activity list (same logic as desktop)
  const dbActs: Activity[] = d.dbActivities.map((a) => {
    const aAttr = (a.attributes as Record<string, unknown>) ?? {}
    return {
      id: String(a.activity_id), name: a.name,
      category: a.category as Activity['category'],
      emoji: a.emoji || '📍',
      description: a.description || '',
      duration: a.duration || '', cost: (a.cost as Activity['cost']) || 'free',
      kidsOk: a.kids_ok, isHiddenGem: a.is_hidden_gem,
      mapsUrl: a.maps_url || '', tags: a.tags ?? [],
      websiteUri: aAttr.website_uri as string | undefined,
      editorialSummary: undefined,
      openingHoursPeriods: aAttr.opening_hours_periods as import('@/lib/overpass').OpenHoursPeriod[] | undefined,
      rating: undefined,
      reviewCount: undefined,
    }
  })
  const dbNatureActs: Activity[] = d.dbNature.map((n) => ({
    id: `nature-${n.nature_spot_id}`, name: n.name,
    category: (n.type === 'viewpoint' ? 'viewpoint' : n.type === 'beach' ? 'beach' : 'nature') as Activity['category'],
    emoji: NATURE_EMOJI[n.type] ?? '🌿', description: n.description || '',
    duration: n.type === 'hiking' ? '1–3 hrs' : '30–60 min',
    cost: 'free' as Activity['cost'], kidsOk: true, isHiddenGem: false,
    mapsUrl: n.slug?.startsWith('gp-')
      ? `https://www.google.com/maps/place/?q=place_id:${n.slug.slice(3)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.name + ' Victoria')}`,
    tags: [n.type],
  }))
  // All activities from Supabase (enriched via Overpass/OSM)
  const seenNames = new Set<string>()
  const allActivities = [...dbActs, ...dbNatureActs].filter((a) => {
    const k = a.name.toLowerCase(); if (seenNames.has(k)) return false; seenNames.add(k); return true
  })

  // Category chips
  const catCounts = new Map<string, number>()
  for (const a of allActivities) catCounts.set(a.category, (catCounts.get(a.category) ?? 0) + 1)
  const topCats = [...catCounts.entries()].filter(([c]) => c !== 'family').sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c)
  const filteredActivities = catFilter === 'all' ? allActivities : allActivities.filter((a) => a.category === catFilter)

  const panelExpanded = !mapVisible

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F5F4F1', overflow: 'hidden', position: 'relative' }}>

      {/* ── Map — visible on arrival, hides when scrolled up ── */}
      <div style={{
        flexShrink: 0,
        height: mapVisible ? '50vh' : 0,
        overflow: 'hidden',
        position: 'relative',
        transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <MapContainer />
        {/* Destination label + back on map */}
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          zIndex: 10, pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
            borderRadius: 12, padding: '8px 12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1C1B1F', letterSpacing: '-0.01em' }}>{d.shortDest}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>
              {formatDrive(d.driveHours)} · {d.totalKm} km
            </div>
          </div>
          <button onClick={clearItinerary} style={{
            pointerEvents: 'all',
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
            border: 'none', borderRadius: 10, padding: '8px 12px',
            fontSize: 12, fontWeight: 600, color: '#6B7280', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>← Back</button>
        </div>
      </div>

      {/* ── Bottom sheet panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        marginTop: -20, // overlap map slightly for seamless look
        zIndex: 5,
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DDD8' }} />
        </div>

        {/* ── Filter tab bar ── */}
        <div style={{
          flexShrink: 0, borderBottom: '1px solid rgba(0,0,0,0.07)',
          padding: '12px 12px 12px',
          display: 'flex', gap: 8, overflowX: 'auto',
        }}>
          {([
            ['explore', '🗺 Explore'],
            ...((d.dbFood?.length ?? 0) > 0 ? [['food', '🍽 Food & Drinks']] : []),
            ['stay', '🏨 Stay'],
            ...(scheduledPlan.items.length > 0 ? [['plan', `Your Plan (${scheduledPlan.items.length})`]] : []),
            ...(hasFuel ? [['fuel', '⛽ Fuel']] : []),
          ] as [FilterTab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => {
              setTab(t); setCatFilter('all')
              if (t === 'fuel' && fuelStops.length === 0) fetchFuel()
            }} style={{
              padding: '6px 14px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap',
              background: tab === t ? 'var(--green)' : 'var(--bg-base)',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
              border: `2px solid ${tab === t ? 'var(--green)' : 'var(--border)'}`,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              boxShadow: tab === t ? '0 2px 8px rgba(58,107,79,0.25)' : 'none',
            }}>{label}</button>
          ))}
        </div>

      {/* ── Scrollable content — hides map when scrolled down ── */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          if (el.scrollTop > 40 && mapVisible) setMapVisible(false)
        }}
        style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      >

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
                  {d.wikiSummary}
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
                    {(() => {
                      const rated = filteredActivities.filter(a => a.rating)
                      const unrated = filteredActivities.filter(a => !a.rating)
                      const primary = rated.length > 0 ? rated : filteredActivities
                      const renderCard = (act: typeof filteredActivities[0]) => {
                        const tag = CAT_TAG[act.category] ?? { label: act.category, color: '#374151', bg: '#F3F4F6' }
                        const driveMin = d.driveMinutes.get(
                          act.id.startsWith('nature-')
                            ? (d.dbNature.find(n => `nature-${n.nature_spot_id}` === act.id)?.slug ?? '')
                            : (d.dbActivities.find(a => String(a.activity_id) === act.id)?.slug ?? '')
                        ) ?? null
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
                            isHiddenGem={act.isHiddenGem}
                            isAdded={d.addedActivities.some((a) => a.actId === act.id)}
                            driveMinutes={driveMin}
                            mapsUrl={act.mapsUrl}
                            website={act.websiteUri && !act.websiteUri.includes('google.com') ? act.websiteUri : undefined}
                            onAdd={() => d.addActivity({ actId: act.id, actName: act.name, emoji: act.emoji, dayNumber: 1 })}
                            onRemove={() => d.removeActivity(act.id)}
                            expanded={expandedCardId === act.id}
                            onExpand={() => setExpandedCardId(expandedCardId === act.id ? null : act.id)}
                          />
                        )
                      }
                      return (
                        <>
                          {primary.map(renderCard)}
                          {unrated.length > 0 && rated.length > 0 && unrated.map(renderCard)}
                        </>
                      )
                    })()}
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

        {/* ── YOUR PLAN tab ── */}
        {tab === 'plan' && (
          <div style={{ padding: '12px 12px 0' }}>

            {/* Weather callout */}
            {isBadWeather && tripDayForecast && scheduledPlan.items.some((i) => i.isOutdoor) && (
              <div style={{ background: '#FFF7ED', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 16, padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{tripDayForecast.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Weather heads-up</div>
                  <div style={{ fontSize: 12, color: '#B45309', marginTop: 2, lineHeight: 1.5 }}>
                    {tripDayForecast.label} forecast on your trip day ({tripDayForecast.precipMm > 0 ? `${tripDayForecast.precipMm}mm rain, ` : ''}{tripDayForecast.maxTemp}°C max). Some outdoor activities on your plan may be affected — check conditions before you go.
                  </div>
                </div>
              </div>
            )}

            {/* Arrival banner */}
            <div style={{ background: '#E8F5EE', borderRadius: 16, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(58,107,79,0.18)' }}>
              <span style={{ fontSize: 20 }}>🚗</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>Depart {d.shortOrigin} at {d.departureHour}:00 {d.departureHour < 12 ? 'AM' : 'PM'}</div>
                <div style={{ fontSize: 11, color: '#49454F', marginTop: 1 }}>Arrive {d.shortDest} around {formatTime(0, scheduledPlan.arrivalMins)} · {d.totalKm} km drive</div>
              </div>
            </div>

            {/* Plan items */}
            {scheduledPlan.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>
                No items added yet. Tap <strong>Plan it</strong> on any activity or dining spot to build your day.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {scheduledPlan.items.map((item, idx) => (
                  <div key={item.id}>
                    {/* Time connector line */}
                    {idx > 0 && <div style={{ width: 2, height: 18, background: 'var(--border)', marginLeft: 23, marginTop: 0 }} />}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {/* Time dot */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.isDining ? WARM : GREEN, marginTop: 8, flexShrink: 0 }} />
                      </div>
                      {/* Card */}
                      <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: `1px solid ${item.isOutdoor && isBadWeather ? 'rgba(251,146,60,0.4)' : 'rgba(0,0,0,0.07)'}`, padding: '12px 14px', marginBottom: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: item.isDining ? WARM : GREEN }}>{formatTime(0, item.timeMins)}</span>
                          {item.duration && <span style={{ fontSize: 10, color: '#9CA3AF' }}>⏱ {item.duration}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A', lineHeight: 1.3 }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>{item.reason}</div>
                            {item.isOutdoor && isBadWeather && (
                              <div style={{ fontSize: 11, color: '#B45309', marginTop: 5, fontWeight: 600 }}>⚠ Weather may affect this — check before you go</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          {item.mapsUrl && (
                            <a href={item.mapsUrl} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1C1B1F', padding: '6px 12px', borderRadius: 100, textDecoration: 'none' }}>Maps ↗</a>
                          )}
                          <button onClick={() => item.isDining ? d.removeDiningStop(item.id) : d.removeActivity(item.id)}
                            style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', background: 'transparent', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 100, cursor: 'pointer' }}>Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ height: 32 }} />
              </div>
            )}
          </div>
        )}

        {/* ── FOOD & DRINKS tab ── */}
        {tab === 'food' && (() => {
          const FOOD_EMOJI: Record<string, string> = { Winery: '🍷', Brewery: '🍺', Distillery: '🥃', Pub: '🍻', Cafe: '☕', Bakery: '🥐', Restaurant: '🍽️' }
          const FOOD_COLOR: Record<string, { color: string; bg: string }> = {
            Winery: { color: '#7E22CE', bg: '#FAF5FF' }, Brewery: { color: '#92400E', bg: '#FEF3C7' },
            Distillery: { color: '#374151', bg: '#F3F4F6' }, Pub: { color: '#1D4ED8', bg: '#EFF6FF' },
            Restaurant: { color: '#B45309', bg: '#FFFBEB' }, Cafe: { color: '#0369A1', bg: '#E0F2FE' },
            Bakery: { color: '#047857', bg: '#ECFDF5' },
          }
          const allFoods = d.dbFood ?? []

          const availCats = [...new Set(allFoods.map(f => f.category))].sort((a, b) => {
            const order = ['Winery','Brewery','Distillery','Pub','Restaurant','Cafe','Bakery']
            return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99)
          })
          const filtered = foodFilter === 'all' ? allFoods : allFoods.filter(f => f.category === foodFilter)
          const DRINK_CATS = new Set(['Winery','Brewery','Distillery'])
          const drinks = filtered.filter(f => DRINK_CATS.has(f.category))
          const foods  = filtered.filter(f => !DRINK_CATS.has(f.category))

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Filter chips */}
              {availCats.length > 1 && (
                <div style={{ display: 'flex', gap: 6, padding: '12px 12px 8px', overflowX: 'auto', flexShrink: 0 }}>
                  <button onClick={() => setFoodFilter('all')} style={{
                    padding: '6px 14px', borderRadius: 20, flexShrink: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: foodFilter === 'all' ? '#1C1B1F' : '#fff', color: foodFilter === 'all' ? '#fff' : '#6B7280',
                    border: `1.5px solid ${foodFilter === 'all' ? '#1C1B1F' : 'rgba(0,0,0,0.1)'}`,
                  }}>All</button>
                  {availCats.map(cat => (
                    <button key={cat} onClick={() => setFoodFilter(cat)} style={{
                      padding: '6px 14px', borderRadius: 20, flexShrink: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                      background: foodFilter === cat ? '#1C1B1F' : '#fff', color: foodFilter === cat ? '#fff' : '#6B7280',
                      border: `1.5px solid ${foodFilter === cat ? '#1C1B1F' : 'rgba(0,0,0,0.1)'}`,
                    }}>{FOOD_EMOJI[cat]} {cat}s</button>
                  ))}
                </div>
              )}

              <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allFoods.length === 0 && <div style={{ fontSize: 13, color: '#9CA3AF', padding: '20px 0', textAlign: 'center' }}>No food & drink spots found nearby.</div>}

                {drinks.length > 0 && (
                  <>
                    {foodFilter === 'all' && <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>🍷 Cellar Doors & Craft Drinks</div>}
                    {drinks.map(f => {
                      const emoji = FOOD_EMOJI[f.category] ?? '🍽️'
                      const cfg = FOOD_COLOR[f.category] ?? { color: '#374151', bg: '#F9FAFB' }
                      const cardId = String(f.food_place_id)
                      return <ResultCard key={cardId} name={f.name} categoryLabel={f.category} categoryColor={cfg.color} categoryBg={cfg.bg} emoji={emoji} description={f.description ?? undefined} website={(f.attributes as any)?.website_uri ?? f.website ?? undefined} mapsUrl={f.lat && f.lng ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name + ", " + d.shortDest)}&ll=${f.lat},${f.lng}` : ""} phone={f.phone ?? undefined} driveMinutes={d.driveMinutes.get(f.slug) ?? null} expanded={expandedCardId === cardId} onExpand={() => setExpandedCardId(expandedCardId === cardId ? null : cardId)} />
                    })}
                  </>
                )}
                {foods.length > 0 && (
                  <>
                    {foodFilter === 'all' && drinks.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>🍽️ Places to Eat</div>}
                    {foods.map(f => {
                      const emoji = FOOD_EMOJI[f.category] ?? '🍽️'
                      const cfg = FOOD_COLOR[f.category] ?? { color: '#374151', bg: '#F9FAFB' }
                      const cardId = String(f.food_place_id)
                      return <ResultCard key={cardId} name={f.name} categoryLabel={f.category} categoryColor={cfg.color} categoryBg={cfg.bg} emoji={emoji} description={f.description ?? undefined} website={(f.attributes as any)?.website_uri ?? f.website ?? undefined} mapsUrl={f.lat && f.lng ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name + ", " + d.shortDest)}&ll=${f.lat},${f.lng}` : ""} phone={f.phone ?? undefined} driveMinutes={d.driveMinutes.get(f.slug) ?? null} expanded={expandedCardId === cardId} onExpand={() => setExpandedCardId(expandedCardId === cardId ? null : cardId)} />
                    })}
                  </>
                )}
                <div style={{ height: 32 }} />
              </div>
            </div>
          )
        })()}

        {/* ── STAY tab ── */}
        {tab === 'stay' && (
          <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(d.accommodationPOIs?.length ?? 0) === 0 ? (
              <div style={{ fontSize: 13, color: '#9CA3AF', padding: '20px 0', textAlign: 'center' }}>No accommodation found nearby.</div>
            ) : (d.accommodationPOIs ?? []).slice(0, 20).map((a) => {
              const ACCOM_EMOJI: Record<string, string> = { hotel: '🏨', motel: '🏩', campsite: '⛺', caravan_park: '🚐', hostel: '🛏️', cabin: '🛖', guest_house: '🏡' }
              const ACCOM_LABEL: Record<string, string> = { hotel: 'Hotel', motel: 'Motel', campsite: 'Campsite', caravan_park: 'Caravan Park', hostel: 'Hostel', cabin: 'Cabin', guest_house: 'Guest House' }
              const emoji = ACCOM_EMOJI[a.type] ?? '🏨'
              const label = ACCOM_LABEL[a.type] ?? a.type
              const mapsUrl = a.lat && a.lng ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.name + ', ' + d.shortDest)}&ll=${a.lat},${a.lng}` : undefined
              return (
                <div key={a.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 24, lineHeight: 1.2, flexShrink: 0 }}>{emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A', marginBottom: 2 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                      {a.description && <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginTop: 4 }}>{a.description}</div>}
                    </div>
                    {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#3A6B4F', padding: '6px 10px', borderRadius: 8, textDecoration: 'none', flexShrink: 0, alignSelf: 'center' }}>Maps ↗</a>}
                  </div>
                </div>
              )
            })}
            <div style={{ height: 32 }} />
          </div>
        )}

        {/* ── FUEL tab ── */}
        {tab === 'fuel' && (
          <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fuelLoading ? (
              <div style={{ fontSize: 13, color: '#9CA3AF', padding: '20px 0', textAlign: 'center' }}>Finding stations…</div>
            ) : fuelStops.length === 0 ? (
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>No fuel data available.</div>
            ) : fuelStops.map((stop) => (
              <div key={stop.label} style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 8 }}>{stop.label}</div>
                {stop.brandNotFound ? (
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                    No {(d.vehicleProfile as unknown as { fuel_brand?: string }).fuel_brand} stations found nearby.
                  </div>
                ) : stop.station ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: '#F0FDF4', border: '1.5px solid #BBF7D0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#16A34A', lineHeight: 1 }}>${stop.station.pricePerLitre.toFixed(3)}</span>
                      <span style={{ fontSize: 8, color: '#6B7280', marginTop: 1 }}>/litre</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A', marginBottom: 2 }}>{stop.station.brand}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>{stop.station.name}</div>
                      {stop.station.address && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{stop.station.address}</div>}
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{stop.station.distanceKm} km away</div>
                    </div>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.station.brand + ' ' + stop.station.address)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#16A34A', padding: '7px 11px', borderRadius: 9, textDecoration: 'none', flexShrink: 0 }}>Maps ↗</a>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>No stations found nearby.</div>
                )}
              </div>
            ))}
            <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingBottom: 4 }}>Prices from Service Victoria — updated daily</div>
            <div style={{ height: 32 }} />
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(0,0,0,0.07)', marginTop: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>OpenStreetMap</a> (ODbL) · Heritage © <a href="https://vhd.heritagecouncil.vic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>Heritage Council Vic</a> (CC BY 4.0)</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>Privacy & Attribution</a>
            <a href="mailto:support@cubixit.com.au" style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>Feedback</a>
          </div>
        </div>
      </div>{/* end scroll */}
      </div>{/* end bottom sheet */}

      {/* ── Map FAB — shows when map is hidden ── */}
      {!mapVisible && (
        <button
          onClick={() => setMapVisible(true)}
          style={{
            position: 'absolute', bottom: 24, right: 20, zIndex: 30,
            width: 52, height: 52, borderRadius: '50%',
            background: GREEN, border: 'none', color: '#fff',
            fontSize: 20, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(58,107,79,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >🗺</button>
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


// ── Activity card ─────────────────────────────────────────────────────────────

function MActivityCard({ act, isAdded, onAdd, onRemove }: {
  act: Activity; isAdded?: boolean; onAdd?: () => void; onRemove?: () => void
}) {
  const tag = CAT_TAG[act.category] ?? { label: act.category, color: '#374151', bg: '#F3F4F6' }
  const mapsUrl = act.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' Victoria AU')}`
  const websiteUrl = act.websiteUri && !act.websiteUri.includes('google.com') ? act.websiteUri : null
  const openStatus = getOpenStatus(act.openingHoursPeriods)

  return (
    <div style={{
      background: isAdded ? '#F0FDF4' : act.isHiddenGem ? '#F0FDF4' : '#fff',
      borderRadius: 20,
      border: isAdded ? `1.5px solid rgba(58,107,79,0.35)` : act.isHiddenGem ? '1.5px solid rgba(58,107,79,0.25)' : '1px solid rgba(0,0,0,0.07)',
      padding: '16px 16px 14px',
      boxShadow: act.isHiddenGem ? '0 2px 8px rgba(58,107,79,0.1)' : '0 1px 6px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <MPill label={tag.label} color={tag.color} bg={tag.bg} />
          {isAdded && <MPill label="In your plan" color={GREEN} bg="#E8F5EE" />}
        </div>
        {act.isHiddenGem && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#E8F5EE', border: '1px solid rgba(58,107,79,0.2)', borderRadius: 20, padding: '3px 8px', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: GREEN }}>◆</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: GREEN, letterSpacing: '0.02em' }}>Local gem</span>
          </span>
        )}
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#1C1B1F', lineHeight: 1.25, marginBottom: 6, letterSpacing: '-0.01em' }}>{act.name}</div>
      {act.rating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#F59E0B' }}>{'★'.repeat(Math.floor(act.rating))}{'☆'.repeat(Math.max(0, 5 - Math.floor(act.rating)))}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{act.rating.toFixed(1)}</span>
          {act.reviewCount && <span style={{ fontSize: 11, color: '#9CA3AF' }}>({act.reviewCount > 999 ? `${Math.round(act.reviewCount / 1000)}k` : act.reviewCount})</span>}
        </div>
      )}
      {act.description && (
        <div style={{ fontSize: 13.5, color: '#49454F', lineHeight: 1.7, marginBottom: 8 }}>
          {act.description.length > 160 ? act.description.slice(0, 160) + '…' : act.description}
        </div>
      )}
      {openStatus && (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: openStatus.isOpen ? '#16A34A' : '#DC2626', marginBottom: 10 }}>
          {openStatus.isOpen ? 'Open now' : `Closed${openStatus.nextOpen ? ` — opens ${openStatus.nextOpen}` : ''}`}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
        {websiteUrl && (
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#374151', background: '#F5F4F1', border: '1px solid rgba(0,0,0,0.1)', padding: '9px 14px', borderRadius: 100, textDecoration: 'none', whiteSpace: 'nowrap' }}>Website</a>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#1C1B1F', padding: '9px 16px', borderRadius: 100, textDecoration: 'none', whiteSpace: 'nowrap' }}>Open in Maps</a>
        {onAdd && !isAdded && (
          <button onClick={onAdd} style={{ fontSize: 12, fontWeight: 700, color: GREEN, background: '#E8F5EE', border: `1.5px solid rgba(58,107,79,0.4)`, padding: '9px 14px', borderRadius: 100, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Plan it</button>
        )}
        {onRemove && isAdded && (
          <button onClick={onRemove} style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C', background: '#FEF2F2', border: '1.5px solid rgba(220,38,38,0.25)', padding: '9px 14px', borderRadius: 100, cursor: 'pointer', whiteSpace: 'nowrap' }}>Remove</button>
        )}
      </div>
    </div>
  )
}

// ── POI card ──────────────────────────────────────────────────────────────────

function MFoodCard({ f, emoji, cfg }: { f: import('@/hooks/usePlannerData').DbFoodPlace; emoji: string; cfg: { color: string; bg: string } }) {
  const website = (f.attributes as Record<string,unknown>)?.website_uri as string | undefined ?? f.website ?? undefined
  const mapsUrl = f.lat && f.lng ? `https://www.google.com/maps/maps?q=${f.lat},${f.lng}+(${encodeURIComponent(f.name)})` : undefined
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A', marginBottom: 3 }}>{f.name}</div>
          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: f.description ? 5 : 0 }}>{f.category}</span>
          {f.description && <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginTop: 2 }}>{f.description}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
        {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#1C1B1F', padding: '8px 14px', borderRadius: 100, textDecoration: 'none', whiteSpace: 'nowrap' }}>Open in Maps</a>}
        {website && <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#374151', background: '#F5F4F1', border: '1px solid rgba(0,0,0,0.1)', padding: '8px 14px', borderRadius: 100, textDecoration: 'none', whiteSpace: 'nowrap' }}>Website</a>}
      </div>
    </div>
  )
}

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
