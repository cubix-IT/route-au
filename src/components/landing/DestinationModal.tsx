import { GREEN, WARM } from '@/lib/brand'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '@/hooks/useScrollLock'
import { fetchWikipediaThumb, fetchWikipediaSummary } from '@/lib/overpass'
import { fetchWeatherForCoord } from '@/api/weather'
import type { Activity } from '@/data/victorianActivities.ts'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { VICTORIAN_CLUSTERS } from '@/data/victorianClusters.ts'
import { ResultCard } from '@/components/planner/ResultCard'
import { useTrails } from '@/hooks/useTrails'
import type { Trail } from '@/hooks/useTrails'
import type { DbActivity, DbFoodPlace, DbNatureSpot, DbAccommodation } from '@/hooks/usePlannerData'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubDest {
  id: string
  name: string
  coord: { lat: number; lng: number }
  imageUrl?: string | null
}

interface AISummary { summary: string | null; bestFor: string[] }

// ── Maps URL helpers (mirrors ExperiencePanel) ────────────────────────────────

function coordMapsUrl(name: string, lat?: number | null, lng?: number | null): string {
  // maps.google.com/maps — the /maps/maps double-path breaks Google's label
  // parsing and shows raw DMS coordinates (the "38°12'53.3\"S" bug)
  if (lat && lng) return `https://maps.google.com/maps?q=${lat},${lng}+(${encodeURIComponent(name)})`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Victoria')}`
}

function safeMapsUrl(mapsUrl: string | undefined | null, name: string, lat?: number | null, lng?: number | null): string {
  if (mapsUrl) {
    const coordMatch = mapsUrl.match(/q=([-\d.]+),([-\d.]+)$/)
    if (coordMatch) return coordMapsUrl(name, parseFloat(coordMatch[1]), parseFloat(coordMatch[2]))
    if (!mapsUrl.match(/\?q=[-\d.]+,[-\d.]+$/)) return mapsUrl
  }
  return coordMapsUrl(name, lat, lng)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUIT_EMOJI: Record<string, string> = {
  'Couples': '❤️', 'Families': '👨‍👩‍👧', 'Solo travellers': '🧍',
  'Nature lovers': '🌿', 'Foodies': '🍽', 'Wine lovers': '🍷',
  'Hikers': '🥾', 'History buffs': '🏛', 'Beach lovers': '🌊',
  'Adventure seekers': '🏃',
}

const CAT_EMOJI: Record<string, string> = {
  nature: '🌿', viewpoint: '🌄', history: '🏛️', art: '🎨', active: '🏄',
  wildlife: '🦘', relaxation: '🧖', drink: '🍷', entertainment: '🎵',
  beach: '🏖️', wellness: '♨️', family: '👨‍👩‍👧', markets: '🛒',
}

const NATURE_EMOJI: Record<string, string> = {
  hiking: '🥾', viewpoint: '🌄', beach: '🏖️', waterfall: '💧',
  national_park: '🌿', nature_reserve: '🌿', hot_spring: '♨️',
  lake: '💧', river: '💧', cave: '🦇', forest: '🌳',
  wetland: '🌿', summit: '⛰️', gorge: '🏔️',
}

const FOOD_CAT_EMOJI: Record<string, string> = {
  Winery: '🍷', Brewery: '🍺', Distillery: '🥃',
  Pub: '🍻', Restaurant: '🍽️', Cafe: '☕', Bakery: '🥐',
}

const FOOD_CAT_COLOR: Record<string, { color: string; bg: string }> = {
  Winery:     { color: '#7E22CE', bg: '#FAF5FF' },
  Brewery:    { color: '#92400E', bg: '#FEF3C7' },
  Distillery: { color: 'var(--text-secondary)', bg: '#F3F4F6' },
  Pub:        { color: '#1D4ED8', bg: '#EFF6FF' },
  Restaurant: { color: '#B45309', bg: '#FFFBEB' },
  Cafe:       { color: '#0369A1', bg: '#E0F2FE' },
  Bakery:     { color: '#047857', bg: '#ECFDF5' },
}

const ACCOM_CFG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  hotel:        { emoji: '🏨', label: 'Hotel',        color: '#1D4ED8', bg: '#EFF6FF' },
  motel:        { emoji: '🏩', label: 'Motel',        color: '#0369A1', bg: '#E0F2FE' },
  campsite:     { emoji: '⛺', label: 'Campsite',     color: '#047857', bg: '#ECFDF5' },
  caravan_park: { emoji: '🚐', label: 'Caravan Park', color: '#B45309', bg: '#FEF3C7' },
  hostel:       { emoji: '🏠', label: 'Hostel',       color: '#7C3AED', bg: '#F5F3FF' },
  cabin:        { emoji: '🏕️', label: 'Cabin',       color: '#047857', bg: '#ECFDF5' },
  guest_house:  { emoji: '🏡', label: 'Guest House',  color: '#B45309', bg: '#FFFBEB' },
}

const CAT_LABEL: Record<string, string> = {
  nature: '🌿 Nature', viewpoint: '🌄 Viewpoints', history: '🏛️ History',
  art: '🎨 Art', active: '🏄 Active', wildlife: '🦘 Wildlife',
  relaxation: '🧖 Relax', wellness: '♨️ Wellness', beach: '🏖️ Beach',
  entertainment: '🎵 Entertain', markets: '🛒 Markets',
}

const FOOD_GROUPS = [
  { key: 'cellar', label: '🍷 Cellar Doors', cats: new Set(['Winery', 'Brewery', 'Distillery']) },
  { key: 'eat',    label: '🍽 Eat',          cats: new Set(['Restaurant', 'Cafe', 'Bakery']) },
  { key: 'pub',    label: '🍻 Pubs',         cats: new Set(['Pub']) },
]

const VALID_ACCOM_TYPES = new Set(['hotel', 'motel', 'campsite', 'caravan_park', 'hostel', 'cabin', 'guest_house'])

function weatherEmoji(d: string): string {
  if (d === 'Clear sky') return '☀️'
  if (d === 'Partly cloudy') return '⛅'
  if (d === 'Foggy') return '🌫️'
  if (d === 'Rainy' || d === 'Showers') return '🌧️'
  if (d === 'Snowfall') return '❄️'
  if (d === 'Thunderstorm') return '⛈️'
  return '🌤️'
}

// ── Main component ────────────────────────────────────────────────────────────

type TabId = 'overview' | 'activities' | 'food' | 'stay' | 'trails'

export function DestinationModal({
  sub, driveLabel, activities, onPlan, onClose,
}: {
  sub: SubDest
  driveLabel: string
  activities: Activity[]
  onPlan: () => void
  onClose: () => void
}) {
  useScrollLock()
  const userProfile = useAppStore((s) => s.userProfile)
  const clusterFallback = VICTORIAN_CLUSTERS.find(c => c.subDests.some(s => s.id === sub.id))?.imageUrl ?? null
  const [heroImg, setHeroImg] = useState<string | null>(sub.imageUrl ?? clusterFallback)
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [weather, setWeather] = useState<{ emoji: string; max: number; min: number } | null>(null)
  const [mainTab, setMainTab] = useState<TabId>('overview')
  const [actCatFilter, setActCatFilter] = useState('all')
  const [foodGroupFilter, setFoodGroupFilter] = useState('all')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [showAllAccom, setShowAllAccom] = useState(false)

  // Supabase data
  const [dbActivities, setDbActivities] = useState<DbActivity[]>([])
  const [dbNature, setDbNature] = useState<DbNatureSpot[]>([])
  const [dbFood, setDbFood] = useState<DbFoodPlace[]>([])
  const [dbAccom, setDbAccom] = useState<DbAccommodation[]>([])
  const [dbLoading, setDbLoading] = useState(true)

  // Trails via useTrails hook (same as ExperiencePanel)
  const { trails } = useTrails(sub.coord, [])

  useEffect(() => {
    let cancelled = false
    setDbLoading(true)
    setDbActivities([])
    setDbNature([])
    setDbFood([])
    setDbAccom([])
    setAiSummary(null)
    setSummaryLoading(true)
    setHeroImg(sub.imageUrl ?? clusterFallback)
    setMainTab('overview')
    setActCatFilter('all')
    setFoodGroupFilter('all')

    async function load() {
      fetchWikipediaThumb(sub.id, sub.name)
        .then((t) => { if (!cancelled && t) setHeroImg(t) })
        .catch(() => {})

      if (!supabase) { setDbLoading(false); setSummaryLoading(false); return }

      const { data: sdRow } = await supabase
        .from('sub_destinations')
        .select('sub_dest_id,lat,lng')
        .eq('slug', sub.id)
        .single()

      if (!sdRow || cancelled) {
        setDbLoading(false)
        fetchWikipediaSummary(sub.id, sub.name)
          .then((wiki) => { if (!cancelled) fetchFromClaude(sub, userProfile, activities, cancelled, setAiSummary, setSummaryLoading, wiki ?? undefined) })
          .catch(() => { if (!cancelled) setSummaryLoading(false) })
        return
      }

      const id = sdRow.sub_dest_id
      const cLat = (sdRow as any).lat as number | null
      const cLng = (sdRow as any).lng as number | null
      const MELB_CBD_LAT = -37.814, MELB_CBD_LNG = 144.963
      const distFromCBD = cLat && cLng ? Math.abs(cLat - MELB_CBD_LAT) + Math.abs(cLng - MELB_CBD_LNG) : 1
      const DELTA = distFromCBD < 0.5 ? 0.08 : 0.23
      const latMin = (cLat ?? 0) - DELTA, latMax = (cLat ?? 0) + DELTA
      const lngMin = (cLng ?? 0) - DELTA, lngMax = (cLng ?? 0) + DELTA
      const bboxQuery = cLat && cLng

      const [actsRes, natureRes, foodRes, accomRes, summaryRes] = await Promise.all([
        supabase.from('activities').select('activity_id,name,category,emoji,description,duration,cost,kids_ok,is_hidden_gem,maps_url,lat,lng,tags,attributes').eq('sub_dest_id', id).order('is_hidden_gem', { ascending: false }).limit(100),
        bboxQuery
          ? supabase.from('nature_spots').select('nature_spot_id,name,type,description,lat,lng,attributes').gte('lat', latMin).lte('lat', latMax).gte('lng', lngMin).lte('lng', lngMax).limit(50)
          : supabase.from('nature_spots').select('nature_spot_id,name,type,description,lat,lng,attributes').eq('sub_dest_id', id).limit(50),
        bboxQuery
          ? supabase.from('food_places').select('food_place_id,name,category,description,address,lat,lng,phone,website,attributes').gte('lat', latMin).lte('lat', latMax).gte('lng', lngMin).lte('lng', lngMax).limit(100)
          : supabase.from('food_places').select('food_place_id,name,category,description,address,lat,lng,phone,website,attributes').eq('sub_dest_id', id).limit(100),
        supabase.from('accommodation').select('accommodation_id,name,type,address,lat,lng,phone,website,attributes,description').eq('sub_dest_id', id).limit(50),
        supabase.from('destination_summaries').select('ai_summary,best_for').eq('sub_dest_id', id).single(),
      ])

      if (cancelled) return

      setDbActivities((actsRes.data ?? []) as DbActivity[])
      setDbNature((natureRes.data ?? []) as DbNatureSpot[])
      setDbFood((foodRes.data ?? []) as DbFoodPlace[])
      setDbAccom((accomRes.data ?? []) as DbAccommodation[])
      setDbLoading(false)

      if (summaryRes.data?.ai_summary) {
        setAiSummary({ summary: summaryRes.data.ai_summary, bestFor: summaryRes.data.best_for ?? [] })
        setSummaryLoading(false)
      } else {
        fetchFromClaude(sub, userProfile, activities, cancelled, setAiSummary, setSummaryLoading)
      }
    }

    load().catch(() => { if (!cancelled) { setDbLoading(false); setSummaryLoading(false) } })

    fetchWeatherForCoord(sub.coord, 3)
      .then((days) => {
        const today = days[0]
        if (today && !cancelled) setWeather({ emoji: weatherEmoji(today.description), max: Math.round(today.temp_max_c), min: Math.round(today.temp_min_c) })
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [sub.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const suitability = aiSummary?.bestFor?.length ? aiSummary.bestFor : deriveSuitability(activities, dbActivities)

  // Merge activities + nature into "Things to Do" (same logic as ExperiencePanel)
  const dbNatureActs: DbActivity[] = dbNature.map((n) => ({
    activity_id: -(n.nature_spot_id),
    name: n.name,
    category: n.type === 'viewpoint' ? 'viewpoint' : n.type === 'beach' ? 'beach' : 'nature',
    emoji: NATURE_EMOJI[n.type] ?? '🌿',
    description: n.description ?? '',
    duration: n.type === 'hiking' ? '1–3 hrs' : '30–60 min',
    cost: 'free',
    kids_ok: true,
    is_hidden_gem: false,
    maps_url: coordMapsUrl(n.name, n.lat, n.lng),
    lat: n.lat,
    lng: n.lng,
    tags: [n.type],
    attributes: n.attributes,
    slug: `nature-${n.nature_spot_id}`,
    sub_dest_id: 0,
  }))

  const seenNames = new Set<string>()
  const allThingsToDo = [...dbActivities, ...dbNatureActs].filter((a) => {
    const k = a.name.toLowerCase()
    if (seenNames.has(k)) return false
    seenNames.add(k)
    return true
  })

  // Category filter chips for Things to Do
  const catCounts = new Map<string, number>()
  for (const a of allThingsToDo) catCounts.set(a.category, (catCounts.get(a.category) ?? 0) + 1)
  const topCats = [...catCounts.entries()].filter(([c]) => c !== 'family').sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c)

  const filteredActs = actCatFilter === 'all' ? allThingsToDo : allThingsToDo.filter((a) => a.category === actCatFilter)

  // Food grouped filter
  const activeFood = FOOD_GROUPS.find(g => g.key === foodGroupFilter)
  const filteredFood = activeFood ? dbFood.filter(f => activeFood.cats.has(f.category)) : dbFood
  const availFoodGroups = FOOD_GROUPS.filter(g => dbFood.some(f => g.cats.has(f.category)))
  const DRINK_CATS = new Set(['Winery', 'Brewery', 'Distillery'])
  const drinkVenues = filteredFood.filter(f => DRINK_CATS.has(f.category))
  const eatVenues   = filteredFood.filter(f => !DRINK_CATS.has(f.category))

  // Accommodation
  const accom = dbAccom.filter(a => VALID_ACCOM_TYPES.has(a.type)).slice(0, showAllAccom ? 999 : 6)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview',    label: '📍 Overview' },
    { id: 'activities',  label: '🗺 Things to Do' },
    { id: 'food',        label: '🍽 Food & Drinks' },
    { id: 'stay',        label: '🏨 Stay' },
    ...(trails.length > 0 ? [{ id: 'trails' as TabId, label: '🥾 Trails' }] : []),
  ]

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--surface-container, #f0f4ef)',
        borderRadius: isMobile ? '20px 20px 0 0' : 20,
        width: '100%', maxWidth: isMobile ? '100%' : 860,
        height: isMobile ? '92dvh' : undefined,
        maxHeight: isMobile ? '92dvh' : '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        overflow: 'hidden',
      }}>

        {/* Drag handle — mobile only */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D1CFC9' }} />
          </div>
        )}

        {/* Hero */}
        <div style={{
          position: 'relative',
          height: heroImg ? 220 : 100,
          flexShrink: 0,
          background: heroImg
            ? `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)), url(${heroImg}) center/cover no-repeat`
            : 'linear-gradient(135deg, #2D5540, #3A6B4F)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '18px 20px',
        }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{sub.name}</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>{driveLabel} drive · Victoria, AU</span>
            {weather && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.25)', padding: '2px 8px', borderRadius: 8 }}>
                {weather.emoji} {weather.max}°/{weather.min}°
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#fff', flexShrink: 0, overflowX: 'auto' }}>
          {tabs.map(({ id, label }) => (
            <button key={id} onClick={() => { setMainTab(id); setExpandedCard(null) }}
              style={{
                flexShrink: 0,
                padding: isMobile ? '10px 10px' : '11px 14px',
                border: 'none', background: 'none',
                fontSize: isMobile ? 11.5 : 12.5,
                fontWeight: mainTab === id ? 700 : 500,
                color: mainTab === id ? GREEN : 'var(--text-muted)',
                borderBottom: mainTab === id ? `2px solid ${GREEN}` : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base, #fafaf8)' }}>

          {/* ── OVERVIEW ── */}
          {mainTab === 'overview' && (
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Best For chips */}
              {!summaryLoading && suitability.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Best for</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {suitability.map((s) => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, background: '#fff', border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span>{SUIT_EMOJI[s] ?? '•'}</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI summary */}
              <div style={{ background: 'linear-gradient(135deg, #F5FAF7, #fff)', border: '1px solid rgba(58,107,79,0.15)', borderRadius: 14, padding: '14px 16px' }}>
                {summaryLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>✨</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>Curating local insights…</span>
                    </div>
                    {[92, 78, 65].map((w) => <div key={w} className="ai-skeleton-line" style={{ height: 12, width: `${w}%` }} />)}
                  </div>
                ) : aiSummary?.summary ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 12 }}>✨</span>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.08em' }}>About {sub.name.split('&')[0].trim()}</div>
                    </div>
                    <p style={{ fontSize: 13.5, color: '#333', lineHeight: 1.75, margin: 0 }}>{aiSummary.summary}</p>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No summary available yet.</p>
                )}
              </div>

              {/* Top attractions preview */}
              {(allThingsToDo.length > 0 || dbLoading) && (
                <OverviewSection
                  title="Top Attractions"
                  count={allThingsToDo.length}
                  loading={dbLoading}
                  onShowAll={() => setMainTab('activities')}
                >
                  {allThingsToDo.slice(0, 4).map((a) => <PreviewRow key={a.activity_id} name={a.name} emoji={a.emoji || CAT_EMOJI[a.category] || '📍'} sub={a.category} mapsUrl={safeMapsUrl(a.maps_url, a.name, a.lat, a.lng)} />)}
                </OverviewSection>
              )}

              {/* Food preview */}
              {(dbFood.length > 0 || dbLoading) && (
                <OverviewSection
                  title="Best Places to Eat & Drink"
                  count={dbFood.length}
                  loading={dbLoading}
                  onShowAll={() => setMainTab('food')}
                >
                  {dbFood.slice(0, 4).map((f) => <PreviewRow key={f.food_place_id} name={f.name} emoji={FOOD_CAT_EMOJI[f.category] ?? '🍽'} sub={f.category} mapsUrl={coordMapsUrl(f.name, f.lat, f.lng)} />)}
                </OverviewSection>
              )}

              {/* Stay preview */}
              {dbAccom.length > 0 && (
                <OverviewSection title="Where to Stay" count={dbAccom.length} loading={false} onShowAll={() => setMainTab('stay')}>
                  {dbAccom.slice(0, 3).map((a) => {
                    const cfg = ACCOM_CFG[a.type] ?? ACCOM_CFG.hotel
                    return <PreviewRow key={a.accommodation_id} name={a.name} emoji={cfg.emoji} sub={cfg.label} mapsUrl={coordMapsUrl(a.name, a.lat, a.lng)} />
                  })}
                </OverviewSection>
              )}

              {/* Trails preview */}
              {trails.length > 0 && (
                <OverviewSection title="Nearby Trails" count={trails.length} loading={false} onShowAll={() => setMainTab('trails')}>
                  {trails.slice(0, 3).map((t) => <PreviewRow key={t.id} name={t.name} emoji={t.type === 'walk' ? '🥾' : '🚴'} sub={`${t.distance_km} km · ${t.region}`} mapsUrl={coordMapsUrl(t.name, t.waypoints?.[0]?.lat, t.waypoints?.[0]?.lng)} />)}
                </OverviewSection>
              )}
            </div>
          )}

          {/* ── THINGS TO DO ── */}
          {mainTab === 'activities' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Category chips */}
              {topCats.length > 1 && (
                <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', flexShrink: 0, background: '#fff', borderBottom: '1px solid var(--border)' }}>
                  <FilterChip label="All" active={actCatFilter === 'all'} onClick={() => setActCatFilter('all')} />
                  {topCats.map((cat) => (
                    <FilterChip key={cat} label={CAT_LABEL[cat] ?? cat} active={actCatFilter === cat} onClick={() => setActCatFilter(cat)} />
                  ))}
                </div>
              )}
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, alignItems: 'start' }}>
                {dbLoading && <LoadingSkeleton />}
                {!dbLoading && filteredActs.length === 0 && <Empty text="No activities found for this filter." />}
                {filteredActs.map((a) => {
                  const aAttr = (a.attributes as Record<string, unknown>) ?? {}
                  const catCfg = (() => {
                    const cat = a.category
                    const catColors: Record<string, { color: string; bg: string }> = {
                      nature: { color: '#047857', bg: '#ECFDF5' }, viewpoint: { color: '#0369A1', bg: '#E0F2FE' },
                      history: { color: '#92400E', bg: '#FEF3C7' }, art: { color: '#7E22CE', bg: '#FAF5FF' },
                      active: { color: '#B45309', bg: '#FFFBEB' }, wildlife: { color: '#047857', bg: '#F0FDF4' },
                      beach: { color: '#0284C7', bg: '#E0F7FF' }, wellness: { color: '#7C3AED', bg: '#F5F3FF' },
                      relaxation: { color: '#9D174D', bg: '#FFF1F2' }, markets: { color: '#B45309', bg: '#FFFBEB' },
                    }
                    return catColors[cat] ?? { color: 'var(--text-secondary)', bg: '#F3F4F6' }
                  })()
                  const badges = [
                    ...(a.is_hidden_gem ? [{ label: 'Local gem', color: WARM, bg: '#FFF5EB' }] : []),
                    ...(a.kids_ok ? [{ label: 'Kid friendly', color: GREEN, bg: '#E8F5EE' }] : []),
                  ]
                  const cardId = String(a.activity_id)
                  return (
                    <ResultCard
                      key={cardId}
                      name={a.name}
                      categoryLabel={a.category.charAt(0).toUpperCase() + a.category.slice(1)}
                      categoryColor={catCfg.color}
                      categoryBg={catCfg.bg}
                      emoji={a.emoji || CAT_EMOJI[a.category] || '📍'}
                      description={a.description || undefined}
                      duration={a.duration || undefined}
                      badges={badges}
                      mapsUrl={safeMapsUrl(a.maps_url, a.name, a.lat, a.lng)}
                      website={aAttr.website_uri as string | undefined}
                      phone={(a as any).phone as string | undefined}
                      expanded={expandedCard === cardId}
                      onExpand={() => setExpandedCard(expandedCard === cardId ? null : cardId)}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* ── FOOD & DRINKS ── */}
          {mainTab === 'food' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {availFoodGroups.length > 0 && (
                <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', flexShrink: 0, background: '#fff', borderBottom: '1px solid var(--border)' }}>
                  <FilterChip label="All" active={foodGroupFilter === 'all'} onClick={() => setFoodGroupFilter('all')} />
                  {availFoodGroups.map((g) => (
                    <FilterChip key={g.key} label={g.label} active={foodGroupFilter === g.key} onClick={() => setFoodGroupFilter(g.key)} />
                  ))}
                </div>
              )}
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, alignItems: 'start' }}>
                {dbLoading && <LoadingSkeleton />}
                {!dbLoading && filteredFood.length === 0 && <Empty text="No food places found for this filter." />}
                {[...drinkVenues, ...eatVenues].map((f) => {
                  const attr = f.attributes as { website_uri?: string; opening_hours_text?: string; cuisine?: string }
                  const emoji = FOOD_CAT_EMOJI[f.category] ?? '🍽️'
                  const cfg = FOOD_CAT_COLOR[f.category] ?? { color: 'var(--text-secondary)', bg: '#F9FAFB' }
                  const website = attr.website_uri ?? f.website ?? undefined
                  const cuisine = attr.cuisine ? attr.cuisine.split(';')[0].trim().replace(/^./, c => c.toUpperCase()) : undefined
                  const cardId = String(f.food_place_id)
                  return (
                    <ResultCard
                      key={cardId}
                      name={f.name}
                      categoryLabel={cuisine ? `${f.category} · ${cuisine}` : f.category}
                      categoryColor={cfg.color}
                      categoryBg={cfg.bg}
                      emoji={emoji}
                      description={f.description ?? undefined}
                      address={f.address ?? undefined}
                      mapsUrl={coordMapsUrl(f.name, f.lat, f.lng)}
                      website={website}
                      phone={f.phone ?? undefined}
                      expanded={expandedCard === cardId}
                      onExpand={() => setExpandedCard(expandedCard === cardId ? null : cardId)}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STAY ── */}
          {mainTab === 'stay' && (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dbLoading && <LoadingSkeleton />}
              {!dbLoading && dbAccom.length === 0 && <Empty text="No accommodation found — try searching directly on Booking.com or Airbnb." />}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                {accom.map((a) => {
                  const cfg = ACCOM_CFG[a.type] ?? ACCOM_CFG.hotel
                  const attr = (a.attributes as Record<string, unknown>) ?? {}
                  const website = (attr.website_uri as string | undefined) ?? a.website ?? undefined
                  const mapsUrl = coordMapsUrl(a.name, a.lat, a.lng)
                  return (
                    <div key={a.accommodation_id} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>{a.name}</div>
                      {a.description && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{a.description}</div>}
                      {a.address && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📍 {a.address}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                        {website ? (
                          <a href={website} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: GREEN, color: '#fff', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>Website ↗</a>
                        ) : (
                          <a href={`https://www.google.com/search?q=${encodeURIComponent(a.name + ' ' + (a.address ?? 'Victoria Australia'))}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: '#F8F7F4', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>Search ↗</a>
                        )}
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: 8, background: '#1C1B1F', color: '#fff', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>Maps ↗</a>
                      </div>
                    </div>
                  )
                })}
              </div>
              {dbAccom.filter(a => VALID_ACCOM_TYPES.has(a.type)).length > 6 && !showAllAccom && (
                <button onClick={() => setShowAllAccom(true)} style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Show {dbAccom.filter(a => VALID_ACCOM_TYPES.has(a.type)).length - 6} more →
                </button>
              )}
            </div>
          )}

          {/* ── TRAILS ── */}
          {mainTab === 'trails' && (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {trails.length === 0 && <Empty text="No nearby trails found." />}
              {trails.map((trail) => <TrailCard key={trail.id} trail={trail} />)}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 8px', lineHeight: 1.6 }}>
                Trail data © <a href="https://www.data.vic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>data.vic.gov.au</a> (CC BY 4.0)
              </p>
            </div>
          )}

        </div>

        {/* CTA */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
          <button onClick={onPlan} style={{ width: '100%', padding: '14px', borderRadius: 12, background: GREEN, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}>
            Plan this escape →
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, flexShrink: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
      background: active ? GREEN : '#F3F4F6',
      color: active ? '#fff' : 'var(--text-secondary)',
    }}>{label}</button>
  )
}

function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => <div key={i} className="ai-skeleton-line" style={{ height: 120, borderRadius: 12 }} />)}
    </>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>{text}</div>
}

function OverviewSection({ title, count, loading, onShowAll, children }: { title: string; count: number; loading: boolean; onShowAll: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>
        {count > 3 && <button onClick={onShowAll} style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: 'none', border: 'none', cursor: 'pointer' }}>All {count} →</button>}
      </div>
      {loading ? <LoadingSkeleton /> : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>}
    </div>
  )
}

function PreviewRow({ name, emoji, sub, mapsUrl }: { name: string; emoji: string; sub: string; mapsUrl: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
      </div>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1C1C1A', padding: '4px 10px', borderRadius: 7, textDecoration: 'none', flexShrink: 0 }}>Map ↗</a>
    </div>
  )
}

function TrailCard({ trail }: { trail: Trail }) {
  const typeLabel = trail.type === 'walk' ? 'Walking' : trail.type === 'cycle' ? 'Cycling' : 'Mountain Bike'
  const typeColor = trail.type === 'walk' ? '#2563EB' : trail.type === 'cycle' ? GREEN : '#7C3AED'
  const typeBg   = trail.type === 'walk' ? '#EFF6FF' : trail.type === 'cycle' ? '#E8F5EE' : '#F5F3FF'
  const topWps = (trail.waypoints ?? []).filter(w => w.description).slice(0, 2)
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A', letterSpacing: '-0.01em', marginBottom: 4 }}>{trail.name}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: typeColor, background: typeBg, padding: '2px 8px', borderRadius: 6 }}>{typeLabel}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{trail.distance_km} km · {trail.region}</span>
          </div>
        </div>
        <a href={coordMapsUrl(trail.name, trail.waypoints?.[0]?.lat, trail.waypoints?.[0]?.lng)} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: GREEN, textDecoration: 'none', padding: '4px 10px', border: `1px solid ${GREEN}`, borderRadius: 8 }}>Maps →</a>
      </div>
      {topWps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {topWps.map((wp) => (
            <div key={wp.name} style={{ fontSize: 12, color: '#4A4948', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: '#1C1C1A' }}>{wp.name}</span>
              {wp.description && <span style={{ color: 'var(--text-muted)' }}> — {wp.description.slice(0, 120)}{wp.description.length > 120 ? '…' : ''}</span>}
            </div>
          ))}
        </div>
      )}
      <a href={`https://www.parks.vic.gov.au/search#stq=${encodeURIComponent(trail.name)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'underline' }}>
        Check closures & conditions at Parks Victoria →
      </a>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchFromClaude(
  sub: SubDest,
  userProfile: { has_kids?: boolean; preferred_vibe?: string[] } | null,
  activities: Activity[],
  cancelled: boolean,
  setAiSummary: (s: AISummary) => void,
  setSummaryLoading: (b: boolean) => void,
  wiki?: string,
) {
  try {
    const params = new URLSearchParams({ dest: sub.name, slug: sub.id })
    if (wiki) params.set('wiki', wiki.slice(0, 400))
    if (userProfile?.has_kids) params.set('hasKids', 'true')
    if (userProfile?.preferred_vibe?.length) params.set('interests', userProfile.preferred_vibe.join(','))
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(`/api/destination-summary?${params}`, { signal: ctrl.signal })
    clearTimeout(timeout)
    const data = await r.json() as AISummary
    if (!cancelled) setAiSummary(data)
  } catch {
    if (!cancelled) setAiSummary({ summary: wiki ?? null, bestFor: deriveSuitability(activities, []) })
  } finally {
    if (!cancelled) setSummaryLoading(false)
  }
}

function deriveSuitability(activities: Activity[], dbActs: DbActivity[]): string[] {
  const result: string[] = ['Couples']
  const allCats = [...activities.map((a) => a.category), ...dbActs.map((a) => a.category)]
  if (activities.some((a) => a.kidsOk) || allCats.includes('family')) result.push('Families')
  if (allCats.includes('active') || allCats.includes('beach')) result.push('Adventure seekers')
  if (allCats.includes('wildlife') || allCats.includes('nature')) result.push('Nature lovers')
  if (allCats.includes('drink') || activities.some((a) => a.category === 'drink')) result.push('Wine lovers')
  if (allCats.includes('history')) result.push('History buffs')
  if (result.length < 3) result.push('Solo travellers')
  return result.slice(0, 4)
}
