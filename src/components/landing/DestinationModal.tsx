import { useState, useEffect } from 'react'
import { fetchWikipediaThumb, fetchWikipediaSummary } from '@/lib/overpass'
import { fetchWeatherForCoord } from '@/api/weather'
import type { Activity } from '@/data/victorianActivities'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'

const GREEN = '#3A6B4F'
const WARM = '#B87333'
const PREVIEW_LIMIT = 5

interface SubDest {
  id: string
  name: string
  coord: { lat: number; lng: number }
}

interface AISummary { summary: string | null; bestFor: string[] }

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

const FOOD_CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Cafe: '☕', Winery: '🍷', Brewery: '🍺',
  Distillery: '🥃', Pub: '🍺', Bakery: '🥐', Bar: '🍸', Other: '🍴',
}

function weatherEmoji(d: string): string {
  if (d === 'Clear sky') return '☀️'
  if (d === 'Partly cloudy') return '⛅'
  if (d === 'Foggy') return '🌫️'
  if (d === 'Rainy' || d === 'Showers') return '🌧️'
  if (d === 'Snowfall') return '❄️'
  if (d === 'Thunderstorm') return '⛈️'
  return '🌤️'
}

interface DbActivity {
  activity_id: number; name: string; category: string; emoji: string
  description: string; duration: string; cost: string; kids_ok: boolean
  is_hidden_gem: boolean; maps_url: string
}
interface DbNature {
  nature_spot_id: number; name: string; type: string; description: string
  lat: number | null; lng: number | null; attributes: Record<string, unknown> | null
}
interface DbFood {
  food_place_id: number; name: string; category: string
  address: string | null; attributes: Record<string, unknown>
}

export function DestinationModal({
  sub, driveLabel, activities, onPlan, onClose,
}: {
  sub: SubDest
  driveLabel: string
  activities: Activity[]     // static curated — kept for deriveSuitability fallback
  onPlan: () => void
  onClose: () => void
}) {
  const userProfile = useAppStore((s) => s.userProfile)
  const [heroImg, setHeroImg] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [weather, setWeather] = useState<{ emoji: string; max: number; min: number } | null>(null)
  const [mainTab, setMainTab] = useState<'overview' | 'food' | 'activities'>('overview')

  // Supabase data
  const [dbActivities, setDbActivities] = useState<DbActivity[]>([])
  const [dbNature, setDbNature] = useState<DbNature[]>([])
  const [dbFood, setDbFood] = useState<DbFood[]>([])
  const [_subDestId, setSubDestId] = useState<number | null>(null)
  const [dbLoading, setDbLoading] = useState(true)

  // Resolve slug → sub_dest_id, then fetch activities + food + summary from Supabase
  useEffect(() => {
    let cancelled = false
    setDbLoading(true)
    setDbActivities([])
    setDbNature([])
    setDbFood([])
    setAiSummary(null)
    setSummaryLoading(true)
    setHeroImg(null)

    async function load() {
      // 1. Wikipedia thumbnail (fast, good photos)
      fetchWikipediaThumb(sub.id, sub.name)
        .then((t) => { if (!cancelled && t) setHeroImg(t) })
        .catch(() => {})

      // 2. Supabase data
      if (supabase) {
        const { data: sdRow } = await supabase
          .from('sub_destinations')
          .select('sub_dest_id,lat,lng')
          .eq('slug', sub.id)
          .single()

        if (!cancelled && sdRow) {
          const id = sdRow.sub_dest_id
          setSubDestId(id)

          // Bounding box for food/activities: use sub_dest coords
          const cLat = (sdRow as any).lat as number | null
          const cLng = (sdRow as any).lng as number | null
          const MELB_CBD_LAT = -37.814, MELB_CBD_LNG = 144.963
          const distFromCBD = cLat && cLng ? Math.abs(cLat - MELB_CBD_LAT) + Math.abs(cLng - MELB_CBD_LNG) : 1
          const DELTA = distFromCBD < 0.5 ? 0.08 : 0.23
          const latMin = (cLat ?? 0) - DELTA, latMax = (cLat ?? 0) + DELTA
          const lngMin = (cLng ?? 0) - DELTA, lngMax = (cLng ?? 0) + DELTA

          const [actsRes, natureRes, foodRes, summaryRes] = await Promise.all([
            supabase.from('activities').select('activity_id,name,category,emoji,description,duration,cost,kids_ok,is_hidden_gem,maps_url').eq('sub_dest_id', id).order('is_hidden_gem', { ascending: false }).limit(100),
            // Nature spots by bounding box — catches parks/reserves enriched under nearby sub_dests
            (cLat && cLng
              ? supabase.from('nature_spots').select('nature_spot_id,name,type,description,lat,lng,attributes').gte('lat', latMin).lte('lat', latMax).gte('lng', lngMin).lte('lng', lngMax).limit(50)
              : supabase.from('nature_spots').select('nature_spot_id,name,type,description,lat,lng,attributes').eq('sub_dest_id', id).limit(50)
            ),
            // Food by bounding box so places enriched under nearby sub_dests still show
            (cLat && cLng
              ? supabase.from('food_places').select('food_place_id,name,category,address,attributes').gte('lat', latMin).lte('lat', latMax).gte('lng', lngMin).lte('lng', lngMax).limit(100)
              : supabase.from('food_places').select('food_place_id,name,category,address,attributes').eq('sub_dest_id', id).limit(100)
            ),
            supabase.from('destination_summaries').select('ai_summary,best_for').eq('sub_dest_id', id).single(),
          ])

          if (!cancelled) {
            setDbActivities((actsRes.data ?? []) as DbActivity[])
            setDbNature((natureRes.data ?? []) as DbNature[])
            setDbFood((foodRes.data ?? []) as DbFood[])
            setDbLoading(false)

            if (summaryRes.data?.ai_summary) {
              setAiSummary({ summary: summaryRes.data.ai_summary, bestFor: summaryRes.data.best_for ?? [] })
              setSummaryLoading(false)
            } else {
              // Fallback: fetch from live Claude endpoint
              fetchFromClaude(sub, userProfile, activities, cancelled, setAiSummary, setSummaryLoading)
            }
          }
        } else {
          // No Supabase row — fall back to live Overpass + Claude
          if (!cancelled) setDbLoading(false)
          fetchWikipediaSummary(sub.id, sub.name)
            .then((wiki) => {
              if (!cancelled) fetchFromClaude(sub, userProfile, activities, cancelled, setAiSummary, setSummaryLoading, wiki ?? undefined)
            })
            .catch(() => { if (!cancelled) setSummaryLoading(false) })
        }
      } else {
        if (!cancelled) setDbLoading(false)
        setSummaryLoading(false)
      }
    }

    load().catch(() => { if (!cancelled) { setDbLoading(false); setSummaryLoading(false) } })

    // Weather
    fetchWeatherForCoord(sub.coord, 3)
      .then((days) => {
        const today = days[0]
        if (today && !cancelled) setWeather({ emoji: weatherEmoji(today.description), max: Math.round(today.temp_max_c), min: Math.round(today.temp_min_c) })
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [sub.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const suitability = aiSummary?.bestFor?.length ? aiSummary.bestFor : deriveSuitability(activities, dbActivities)

  // Merge activities + nature spots for "Things to Do" — activities first, then nature
  const allThingsToDo = [
    ...dbActivities,
    ...dbNature.map((n) => ({
      activity_id: -(n.nature_spot_id),
      name: n.name,
      category: n.type === 'national_park' ? 'nature' : 'nature',
      emoji: '🌿',
      description: n.description,
      duration: '',
      cost: 'Free',
      kids_ok: true,
      is_hidden_gem: false,
      maps_url: n.attributes?.google_place_id
        ? `https://www.google.com/maps/place/?q=place_id:${n.attributes.google_place_id}`
        : `https://www.google.com/maps/search/?q=${encodeURIComponent(n.name + ' Victoria')}`,
    } as DbActivity)),
  ]
  const previewActs = allThingsToDo.slice(0, PREVIEW_LIMIT)
  const moreActsCount = Math.max(0, allThingsToDo.length - PREVIEW_LIMIT)
  const previewFood = dbFood.slice(0, PREVIEW_LIMIT)
  const moreFoodCount = Math.max(0, dbFood.length - PREVIEW_LIMIT)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff',
        borderRadius: isMobile ? '20px 20px 0 0' : 20,
        width: '100%', maxWidth: isMobile ? '100%' : 840,
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
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
          {(['overview', 'activities', 'food'] as const).map((tab) => (
            <button key={tab} onClick={() => setMainTab(tab)} style={{
              flex: 1, padding: '11px 8px', border: 'none', background: 'none',
              fontSize: 12.5, fontWeight: mainTab === tab ? 700 : 500,
              color: mainTab === tab ? GREEN : 'var(--text-muted)',
              borderBottom: mainTab === tab ? `2px solid ${GREEN}` : '2px solid transparent',
              marginBottom: -1, cursor: 'pointer',
            }}>
              {tab === 'food' ? '🍽 Eat & Drink' : tab === 'activities' ? '🗺 Things to Do' : '📍 Overview'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── OVERVIEW ── */}
          {mainTab === 'overview' && (
            <>
              {/* Best For */}
              {!summaryLoading && suitability.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Best for</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {suitability.map((s) => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, background: 'var(--bg-base)', border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
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
                      <span className="ai-sparkle" style={{ fontSize: 18 }}>✨</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>Curating local insights…</span>
                    </div>
                    <div className="ai-skeleton-line" style={{ height: 12, width: '92%' }} />
                    <div className="ai-skeleton-line" style={{ height: 12, width: '78%' }} />
                    <div className="ai-skeleton-line" style={{ height: 12, width: '65%' }} />
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

              {/* Best 5 attractions preview */}
              {(previewActs.length > 0 || dbLoading) && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Attractions</div>
                    {moreActsCount > 0 && (
                      <button onClick={() => setMainTab('activities')} style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: 'none', border: 'none', cursor: 'pointer' }}>
                        +{moreActsCount} more →
                      </button>
                    )}
                  </div>
                  {dbLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[1,2,3].map((i) => <div key={i} className="ai-skeleton-line" style={{ height: 44, borderRadius: 10 }} />)}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {previewActs.map((a) => (
                        <PreviewActivityRow key={a.activity_id} act={a} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Best 5 food preview */}
              {(previewFood.length > 0 || dbLoading) && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best Places to Eat</div>
                    {moreFoodCount > 0 && (
                      <button onClick={() => setMainTab('food')} style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: 'none', border: 'none', cursor: 'pointer' }}>
                        +{moreFoodCount} more →
                      </button>
                    )}
                  </div>
                  {dbLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[1,2,3].map((i) => <div key={i} className="ai-skeleton-line" style={{ height: 44, borderRadius: 10 }} />)}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {previewFood.map((f) => (
                        <PreviewFoodRow key={f.food_place_id} food={f} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── THINGS TO DO ── */}
          {mainTab === 'activities' && (
            <>
              {dbLoading && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
              )}
              {!dbLoading && allThingsToDo.length === 0 && activities.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No activities found yet — check back after our daily refresh.</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Static curated first */}
                {activities.map((act) => (
                  <ActivityFullRow key={act.id} name={act.name} emoji={act.emoji} category={act.category} description={act.description} duration={act.duration} cost={act.cost} isHiddenGem={act.isHiddenGem} kidsOk={act.kidsOk} mapsUrl={act.mapsUrl} />
                ))}
                {/* DB activities + nature spots (dedupe by name) */}
                {(() => {
                  const staticNames = new Set(activities.map((a) => a.name.toLowerCase()))
                  return allThingsToDo
                    .filter((a) => !staticNames.has(a.name.toLowerCase()))
                    .map((a) => (
                      <ActivityFullRow key={`db-${a.activity_id}`} name={a.name} emoji={a.emoji} category={a.category} description={a.description} duration={a.duration} cost={a.cost} isHiddenGem={a.is_hidden_gem} kidsOk={a.kids_ok} mapsUrl={a.maps_url} />
                    ))
                })()}
              </div>
            </>
          )}

          {/* ── EAT & DRINK ── */}
          {mainTab === 'food' && (
            <>
              {dbLoading && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
              )}
              {!dbLoading && dbFood.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No food places found yet — check back after our daily refresh.</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dbFood.map((f) => <FoodFullRow key={f.food_place_id} food={f} />)}
              </div>
            </>
          )}
        </div>

        {/* CTA */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
          <button onClick={onPlan} style={{ width: '100%', padding: '14px', borderRadius: 12, background: GREEN, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}>
            Plan this escape →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Row components ─────────────────────────────────────────────────────────────

function PreviewActivityRow({ act }: { act: DbActivity }) {
  const emoji = act.emoji || CAT_EMOJI[act.category] || '📍'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>⏱ {act.duration || '1–2 hrs'}</div>
      </div>
      <a href={(act.maps_url && (act.maps_url.includes('query_place_id=') || act.maps_url.includes('api=1'))) ? act.maps_url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' Victoria')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1C1C1A', padding: '4px 10px', borderRadius: 7, textDecoration: 'none', flexShrink: 0 }}>
        View on map ↗
      </a>
    </div>
  )
}

function PreviewFoodRow({ food }: { food: DbFood }) {
  const emoji = FOOD_CAT_EMOJI[food.category] ?? '🍽'
  const attr = food.attributes as { rating?: number; review_count?: number; google_place_id?: string }
  const mapsUrl = attr.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${attr.google_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(food.name + ' Victoria')}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
          <span>{food.category}</span>
          {attr.rating && <span>★ {attr.rating}</span>}
          {attr.review_count && <span>({attr.review_count.toLocaleString()} reviews)</span>}
        </div>
      </div>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1C1C1A', padding: '4px 10px', borderRadius: 7, textDecoration: 'none', flexShrink: 0 }}>
        View on map ↗
      </a>
    </div>
  )
}

function ActivityFullRow({ name, emoji, category, description, duration, cost, isHiddenGem, kidsOk, mapsUrl }: {
  name: string; emoji: string; category: string; description: string
  duration: string; cost: string; isHiddenGem: boolean; kidsOk: boolean; mapsUrl: string
}) {
  const displayEmoji = emoji || CAT_EMOJI[category] || '📍'
  const url = mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Victoria')}`
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', borderRadius: 12, background: isHiddenGem ? '#FFFBF5' : 'var(--bg-base)', border: `1.5px solid ${isHiddenGem ? 'rgba(184,115,51,0.25)' : 'var(--border)'}` }}>
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.3 }}>{displayEmoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1A' }}>{name}</span>
          {isHiddenGem && <span style={{ fontSize: 10, fontWeight: 700, color: WARM, background: '#FFF5EB', padding: '1px 6px', borderRadius: 5 }}>Local gem</span>}
          {kidsOk && <span style={{ fontSize: 10, color: GREEN, background: 'var(--green-light)', padding: '1px 6px', borderRadius: 5, fontWeight: 600 }}>Kid Friendly</span>}
        </div>
        {description && <p style={{ fontSize: 12, color: '#4A4948', lineHeight: 1.55, margin: 0 }}>{description}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>⏱ {duration}</span>
          <span>{cost === 'free' ? '✓ Free' : cost}</span>
        </div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', background: '#1C1C1A', padding: '4px 10px', borderRadius: 7, textDecoration: 'none', marginTop: 2 }}>
        View on map ↗
      </a>
    </div>
  )
}

function FoodFullRow({ food }: { food: DbFood }) {
  const emoji = FOOD_CAT_EMOJI[food.category] ?? '🍽'
  const attr = food.attributes as { rating?: number; review_count?: number; cuisine_tags?: string[]; google_place_id?: string }
  const mapsUrl = attr.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${attr.google_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(food.name + ' Victoria')}`
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.3 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1A', marginBottom: 2 }}>{food.name}</div>
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span>{food.category}</span>
          {attr.cuisine_tags?.length ? <span>{attr.cuisine_tags.slice(0, 2).join(', ')}</span> : null}
          {attr.rating && <span style={{ color: '#D97706', fontWeight: 700 }}>★ {attr.rating}</span>}
          {attr.review_count && <span>({attr.review_count.toLocaleString()})</span>}
        </div>
        {food.address && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{food.address}</div>}
      </div>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', background: '#1C1C1A', padding: '4px 10px', borderRadius: 7, textDecoration: 'none', marginTop: 2 }}>
        View on map ↗
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
