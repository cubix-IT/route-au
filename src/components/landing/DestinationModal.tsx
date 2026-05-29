import { useState, useEffect } from 'react'
import { fetchLivePOIs, fetchWikipediaThumb, fetchWikipediaSummary, type LivePOI } from '@/lib/overpass'
import { fetchWeatherForCoord } from '@/api/weather'
import type { Activity } from '@/data/victorianActivities'
import { useAppStore } from '@/store/useAppStore'

const GREEN = '#3A6B4F'
const WARM = '#B87333'

interface SubDest {
  id: string
  name: string
  coord: { lat: number; lng: number }
}

interface AISummary {
  summary: string | null
  bestFor: string[]
}

const SUIT_EMOJI: Record<string, string> = {
  'Couples': '❤️', 'Families': '👨‍👩‍👧', 'Solo travellers': '🧍',
  'Nature lovers': '🌿', 'Foodies': '🍽', 'Wine lovers': '🍷',
  'Hikers': '🥾', 'History buffs': '🏛', 'Beach lovers': '🌊',
  'Adventure seekers': '🏃',
}

type FoodTab = 'all' | 'cafes' | 'dining' | 'pubs' | 'fast_food' | 'wineries'

const FOOD_TABS: { key: FoodTab; label: string; emoji: string; types: LivePOI['type'][] }[] = [
  { key: 'all',       label: 'All',      emoji: '🗺',  types: ['cafe','restaurant','pub','fast_food','bakery','winery'] },
  { key: 'cafes',     label: 'Cafes',    emoji: '☕',  types: ['cafe', 'bakery'] },
  { key: 'dining',    label: 'Dining',   emoji: '🍽',  types: ['restaurant'] },
  { key: 'pubs',      label: 'Pubs',     emoji: '🍺',  types: ['pub'] },
  { key: 'fast_food', label: 'Takeaway', emoji: '🥡',  types: ['fast_food'] },
  { key: 'wineries',  label: 'Wineries', emoji: '🍷',  types: ['winery'] },
]

const POI_EMOJI: Record<LivePOI['type'], string> = {
  cafe: '☕', restaurant: '🍽', pub: '🍺', fast_food: '🥡', bakery: '🥐', winery: '🍷',
  viewpoint: '👁', attraction: '🏛', hiking: '🥾',
}

function weatherEmoji(description: string): string {
  if (description === 'Clear sky') return '☀️'
  if (description === 'Partly cloudy') return '⛅'
  if (description === 'Foggy') return '🌫️'
  if (description === 'Rainy' || description === 'Showers') return '🌧️'
  if (description === 'Snowfall') return '❄️'
  if (description === 'Thunderstorm') return '⛈️'
  return '🌤️'
}

export function DestinationModal({
  sub, driveLabel, activities, onPlan, onClose,
}: {
  sub: SubDest
  driveLabel: string
  activities: Activity[]
  onPlan: () => void
  onClose: () => void
}) {
  const userProfile = useAppStore((s) => s.userProfile)
  const [livePOIs, setLivePOIs] = useState<LivePOI[] | null>(null)
  const [heroImg, setHeroImg] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState<{ emoji: string; max: number; min: number } | null>(null)
  const [foodTab, setFoodTab] = useState<FoodTab>('all')
  const [mainTab, setMainTab] = useState<'overview' | 'food' | 'activities'>('overview')

  // MOD-04 speed fix: AI summary starts as soon as wiki arrives, POIs load independently
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLivePOIs(null)
    setAiSummary(null)
    setHeroImg(null)

    const poiP   = fetchLivePOIs(sub.id, sub.coord.lat, sub.coord.lng)
    const thumbP = fetchWikipediaThumb(sub.id, sub.name)
    const wikiP  = fetchWikipediaSummary(sub.id, sub.name)

    poiP.then((pois) => { if (!cancelled) setLivePOIs(pois) })
        .catch(() => { if (!cancelled) setLivePOIs([]) })

    thumbP.then((thumb) => { if (!cancelled && thumb) setHeroImg(thumb) })

    wikiP
      .then((wiki) => {
        if (cancelled) return
        const params = new URLSearchParams({ dest: sub.name })
        if (wiki) params.set('wiki', wiki.slice(0, 400))
        if (userProfile?.has_kids) params.set('hasKids', 'true')
        if (userProfile?.preferred_vibe?.length) {
          params.set('interests', userProfile.preferred_vibe.join(','))
        }
        const aiCtrl = new AbortController()
        const aiTimeout = setTimeout(() => aiCtrl.abort(), 8000)
        return fetch(`/api/destination-summary?${params}`, { signal: aiCtrl.signal })
          .then((r) => r.json())
          .then((data: AISummary) => {
            clearTimeout(aiTimeout)
            if (!cancelled) { setAiSummary(data); setLoading(false) }
          })
          .catch(() => {
            clearTimeout(aiTimeout)
            if (!cancelled) {
              setAiSummary({ summary: wiki, bestFor: deriveSuitability(activities) })
              setLoading(false)
            }
          })
      })
      .catch(() => {
        if (!cancelled) {
          setAiSummary({ summary: null, bestFor: deriveSuitability(activities) })
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [sub.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Weather for destination
  useEffect(() => {
    fetchWeatherForCoord(sub.coord, 3)
      .then((days) => {
        const today = days[0]
        if (today) setWeather({ emoji: weatherEmoji(today.description), max: Math.round(today.temp_max_c), min: Math.round(today.temp_min_c) })
      })
      .catch(() => {})
  }, [sub.coord.lat, sub.coord.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const pois = livePOIs ?? []
  const foodPOIs = pois.filter((p) => ['cafe', 'restaurant', 'pub', 'fast_food', 'bakery', 'winery'].includes(p.type))
  const activityPOIs = pois.filter((p) => ['hiking', 'viewpoint', 'attraction'].includes(p.type))
  const totalActivities = activities.length + activityPOIs.length

  const activeFoodTypes = FOOD_TABS.filter(
    (t) => t.key === 'all' || foodPOIs.some((p) => t.types.includes(p.type))
  )
  const filteredFood = foodTab === 'all'
    ? foodPOIs
    : foodPOIs.filter((p) => FOOD_TABS.find((t) => t.key === foodTab)?.types.includes(p.type))

  const suitability = aiSummary?.bestFor?.length ? aiSummary.bestFor : deriveSuitability(activities)

  // Hide food/activities tabs if loaded with zero results
  const tabsToShow = (['overview', 'food', 'activities'] as const).filter((tab) => {
    if (tab === 'food') return livePOIs === null || foodPOIs.length > 0
    if (tab === 'activities') return livePOIs === null || totalActivities > 0
    return true
  })
  // Keep active tab valid if a tab disappears after loading
  const activeTab = tabsToShow.includes(mainTab) ? mainTab : 'overview'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20,
          width: '100%', maxWidth: 840,  /* MOD-01: wider */
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
      >
        {/* Hero image / gradient header — MOD-01: bigger */}
        <div style={{
          position: 'relative',
          height: heroImg ? 220 : 100,  /* MOD-01 */
          flexShrink: 0,
          background: heroImg
            ? `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)), url(${heroImg}) center/cover no-repeat`
            : 'linear-gradient(135deg, #2D5540, #3A6B4F)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '18px 20px',
        }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {sub.name}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>{driveLabel} drive · Victoria, AU</span>
            {/* MOD-04: live weather in hero */}
            {weather && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.25)', padding: '2px 8px', borderRadius: 8 }}>
                {weather.emoji} {weather.max}°/{weather.min}°
              </span>
            )}
          </div>
        </div>

        {/* Tab bar — MOD-03: conditionally hide food tab */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
          {tabsToShow.map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              style={{
                flex: 1, padding: '11px 8px', border: 'none', background: 'none',
                fontSize: 12.5, fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? GREEN : 'var(--text-muted)',
                borderBottom: activeTab === tab ? `2px solid ${GREEN}` : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer', transition: 'color 0.12s',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'food' ? '🍽 Food & Drink' : tab === 'activities' ? '🏕 Activities' : '📍 Overview'}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── OVERVIEW TAB — MOD-04 restructured ── */}
          {activeTab === 'overview' && (
            <>
              {/* Best For pills — ABOVE summary card */}
              {!loading && suitability.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Best for
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {suitability.map((s) => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, background: 'var(--bg-base)', border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span>{SUIT_EMOJI[s] ?? '•'}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI summary */}
              <div style={{ background: 'linear-gradient(135deg, #F5FAF7, #fff)', border: '1px solid rgba(58,107,79,0.15)', borderRadius: 14, padding: '14px 16px' }}>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="ai-sparkle" style={{ fontSize: 18 }}>✨</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.03em' }}>
                        AI is crafting your tailored escape summary…
                      </span>
                    </div>
                    <div className="ai-skeleton-line" style={{ height: 12, width: '92%' }} />
                    <div className="ai-skeleton-line" style={{ height: 12, width: '78%' }} />
                    <div className="ai-skeleton-line" style={{ height: 12, width: '86%' }} />
                    <div className="ai-skeleton-line" style={{ height: 12, width: '65%' }} />
                  </div>
                ) : aiSummary?.summary ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 12 }}>✨</span>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        About {sub.name.split('&')[0].trim()}
                      </div>
                    </div>
                    <p style={{ fontSize: 13.5, color: '#333', lineHeight: 1.75, margin: 0 }}>
                      {aiSummary.summary}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                    Curating local insights…
                  </p>
                )}
              </div>

              {/* Quick amenity icons */}
              {pois.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    What's available
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { type: 'cafe', emoji: '☕', label: 'Cafes' },
                      { type: 'restaurant', emoji: '🍽', label: 'Restaurants' },
                      { type: 'pub', emoji: '🍺', label: 'Pubs & Bars' },
                      { type: 'winery', emoji: '🍷', label: 'Wineries' },
                      { type: 'fast_food', emoji: '🥡', label: 'Takeaway' },
                      { type: 'hiking', emoji: '🥾', label: 'Hiking' },
                      { type: 'viewpoint', emoji: '👁', label: 'Scenic Views' },
                      { type: 'attraction', emoji: '🏛', label: 'Attractions' },
                    ].filter((a) => pois.some((p) => p.type === a.type)).map((a) => (
                      <div
                        key={a.type}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border)', cursor: 'pointer', minWidth: 64 }}
                        onClick={() => setMainTab(['cafe','restaurant','pub','winery','fast_food','bakery'].includes(a.type) ? 'food' : 'activities')}
                      >
                        <span style={{ fontSize: 24 }}>{a.emoji}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{a.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MOD-04: Activity count button — no teasers */}
              {totalActivities > 0 && !loading && (
                <button
                  onClick={() => setMainTab('activities')}
                  style={{
                    padding: '12px 16px', borderRadius: 12, width: '100%',
                    background: 'var(--green-light)', border: `1.5px solid ${GREEN}40`,
                    color: GREEN, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    <span style={{ marginRight: 6 }}>🗺</span>
                    {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} curated for this destination
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>View all →</span>
                </button>
              )}
            </>
          )}

          {/* ── FOOD TAB ── */}
          {activeTab === 'food' && (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {activeFoodTypes.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFoodTab(tab.key)}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      background: foodTab === tab.key ? '#1C1C1A' : 'var(--bg-base)',
                      color: foodTab === tab.key ? '#fff' : 'var(--text-muted)',
                      border: `1.5px solid ${foodTab === tab.key ? '#1C1C1A' : 'var(--border)'}`,
                      fontSize: 11.5, fontWeight: foodTab === tab.key ? 700 : 500,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.emoji} {tab.label}
                  </button>
                ))}
              </div>

              {filteredFood.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  {livePOIs === null ? 'Loading…' : 'No places found in this category'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredFood.map((poi) => <FoodCard key={poi.id} poi={poi} />)}
                </div>
              )}
            </>
          )}

          {/* ── ACTIVITIES TAB ── */}
          {activeTab === 'activities' && (
            <>
              {activities.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activities.map((act) => (
                    <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', borderRadius: 12, background: act.isHiddenGem ? '#FFFBF5' : 'var(--bg-base)', border: `1.5px solid ${act.isHiddenGem ? 'rgba(184,115,51,0.25)' : 'var(--border)'}` }}>
                      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.3 }}>{act.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1A' }}>{act.name}</span>
                          {act.isHiddenGem && <span style={{ fontSize: 10, fontWeight: 700, color: WARM, background: '#FFF5EB', padding: '1px 6px', borderRadius: 5 }}>Local gem</span>}
                          {act.kidsOk && <span style={{ fontSize: 10, color: GREEN, background: 'var(--green-light)', padding: '1px 6px', borderRadius: 5, fontWeight: 600 }}>Kid Friendly</span>}
                        </div>
                        <p style={{ fontSize: 12, color: '#4A4948', lineHeight: 1.55, margin: 0 }}>{act.description}</p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                          <span>⏱ {act.duration}</span>
                          <span>{act.cost === 'free' ? '✓ Free' : act.cost}</span>
                        </div>
                      </div>
                      <a href={act.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', background: '#1C1C1A', padding: '4px 10px', borderRadius: 7, textDecoration: 'none', marginTop: 2 }}>Maps ↗</a>
                    </div>
                  ))}
                </div>
              )}

              {activityPOIs.length > 0 && (
                <>
                  {activities.length > 0 && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      From OpenStreetMap
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activityPOIs.map((poi) => (
                      <div key={poi.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{POI_EMOJI[poi.type]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{poi.name}</div>
                          {poi.routeLength && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{poi.routeLength}</div>}
                        </div>
                        {poi.website && (
                          <a href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 700, color: '#4285F4', textDecoration: 'none', flexShrink: 0 }}>Site ↗</a>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activities.length === 0 && activityPOIs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>
                  {livePOIs === null ? 'Loading activities…' : 'No activities found for this destination'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky CTA */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
          <button
            onClick={onPlan}
            style={{ width: '100%', padding: '14px', borderRadius: 12, background: GREEN, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}
          >
            Plan this escape →
          </button>
        </div>
      </div>
    </div>
  )
}

function FoodCard({ poi }: { poi: LivePOI }) {
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(poi.name)}/@${poi.lat},${poi.lng},15z`
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.3 }}>{POI_EMOJI[poi.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1A', marginBottom: 2 }}>{poi.name}</div>
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          {poi.cuisine && <span>{poi.cuisine}</span>}
          {poi.openingHours && <span>{poi.openingHours.split(';')[0]}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1C1C1A', padding: '4px 10px', borderRadius: 7, textDecoration: 'none', textAlign: 'center' }}>Maps ↗</a>
        {poi.website && (
          <a href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontWeight: 600, color: '#4285F4', textDecoration: 'none', textAlign: 'center' }}>Website ↗</a>
        )}
      </div>
    </div>
  )
}

function deriveSuitability(activities: Activity[]): string[] {
  const result: string[] = ['Couples']
  if (activities.some((a) => a.kidsOk || a.category === 'family')) result.push('Families')
  if (activities.some((a) => a.category === 'active')) result.push('Adventure seekers')
  if (activities.some((a) => a.category === 'wildlife' || a.category === 'nature')) result.push('Nature lovers')
  if (activities.some((a) => a.category === 'food' || a.category === 'drink')) result.push('Foodies')
  if (activities.some((a) => a.category === 'history')) result.push('History buffs')
  if (result.length < 3) result.push('Solo travellers')
  return result.slice(0, 4)
}
