import { GREEN, WARM, SECONDARY } from '@/lib/brand'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { PreselectedDest } from '@/store/useAppStore'
import { getCurrentSeason } from '@/utils/season'
import type { VicCluster, SubDest } from '@/data/victorianClusters.ts'
import { VICTORIAN_CLUSTERS } from '@/data/victorianClusters.ts'
import { useClusters } from '@/hooks/useClusters'
import { useActivities } from '@/hooks/useActivities'
import { DestinationModal } from './DestinationModal'
import { supabase } from '@/lib/supabase'


const season = getCurrentSeason()

// ── Dest search — preloaded fuzzy ────────────────────────────────────

interface SubDestResult { id: string; name: string; clusterSlug: string; clusterName: string; lat: number; lng: number }

// Loaded once at startup, shared across all instances
let ALL_DESTS: SubDestResult[] = []
let destsLoaded = false

async function preloadDestinations() {
  if (destsLoaded || !supabase) return
  destsLoaded = true
  const { data, error } = await supabase
    .from('sub_destinations')
    .select('slug, name, lat, lng, cluster_id')
    .limit(200)
  if (error) { console.warn('[preloadDests]', error); return }
  const clusterNameMap = Object.fromEntries(VICTORIAN_CLUSTERS.map((c) => [c.id, c.name]))
  ALL_DESTS = (data ?? []).map((r) => ({
    id: r.slug as string,
    name: r.name as string,
    clusterSlug: String(r.cluster_id ?? ''),
    clusterName: clusterNameMap[String(r.cluster_id ?? '')] ?? '',
    lat: r.lat as number,
    lng: r.lng as number,
  }))
}

// Trigram similarity — splits strings into 3-char grams and measures overlap
function trigram(s: string): Set<string> {
  const t = new Set<string>()
  const p = ` ${s.toLowerCase()} `
  for (let i = 0; i < p.length - 2; i++) t.add(p.slice(i, i + 3))
  return t
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigram(a)
  const tb = trigram(b)
  let overlap = 0
  for (const g of ta) if (tb.has(g)) overlap++
  return (2 * overlap) / (ta.size + tb.size)
}

// Levenshtein distance for short strings
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

function fuzzyScore(query: string, dest: SubDestResult): number {
  const q = query.toLowerCase().trim()
  const name = dest.name.toLowerCase()
  const nameClean = name.replace(/[^a-z0-9\s]/g, '')
  const cluster = dest.clusterName.toLowerCase()

  // Exact prefix — highest priority
  if (name.startsWith(q) || nameClean.startsWith(q)) return 1.0

  // Cluster name match — region search (e.g. "Yarra Valley", "Mornington")
  if (cluster.startsWith(q) || cluster.includes(q)) return 0.95

  // Substring match on dest name
  if (name.includes(q) || nameClean.includes(q)) return 0.9

  // Each word in the destination starts with the query
  if (name.split(/[\s&–-]+/).some((w) => w.startsWith(q))) return 0.85

  // Each word in cluster name starts with the query
  if (cluster.split(/[\s&–-]+/).some((w) => w.startsWith(q))) return 0.8

  // Trigram similarity (handles transpositions, missing letters)
  const tg = Math.max(trigramSimilarity(q, name), trigramSimilarity(q, cluster))
  if (tg > 0.35) return 0.4 + tg * 0.5

  // Levenshtein — allow 1 edit per 4 chars
  const maxDist = Math.max(1, Math.floor(q.length / 4))
  const dist = levenshtein(q, name.slice(0, q.length + 2))
  if (dist <= maxDist) return 0.3 + (1 - dist / (maxDist + 1)) * 0.3

  return 0
}

function searchDestinations(q: string): SubDestResult[] {
  if (q.length < 2 || ALL_DESTS.length === 0) return []
  return ALL_DESTS
    .map((d) => ({ d, score: fuzzyScore(q, d) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ d }) => d)
}

// ── Photon autocomplete ───────────────────────────────────────────────

interface PhotonFeature {
  properties: { name: string; city?: string; state?: string; country?: string; osm_value?: string }
  geometry: { coordinates: [number, number] }
}

const SETTLEMENT_TYPES = new Set([
  'city', 'town', 'village', 'suburb', 'locality', 'hamlet',
  'municipality', 'neighbourhood', 'quarter',
])

async function searchOrigin(q: string): Promise<PhotonFeature[]> {
  if (q.length < 2) return []
  // layer=city covers cities/towns/villages/suburbs in Photon taxonomy
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=en&limit=10&bbox=140,-39,150,-34&layer=city&layer=district&layer=locality`
  const res = await fetch(url)
  const json = await res.json()
  const features: PhotonFeature[] = json.features ?? []
  // Secondary filter: keep only settlement-type OSM values
  return features
    .filter((f) => SETTLEMENT_TYPES.has(f.properties.osm_value ?? ''))
    .slice(0, 6)
}

function featureLabel(f: PhotonFeature): string {
  const p = f.properties
  return [p.name, p.city, p.state].filter(Boolean).join(', ')
}

// ── Origin search box ────────────────────────────────────────────────


// ── Rotating Victoria highlights (seasonal) ──────────────────────────

const VICTORIA_HIGHLIGHTS: Record<string, string[]> = {
  winter: [
    // Hot springs & wellness
    'steam rising from open-air mineral pools at Peninsula Hot Springs on a cold winter morning?',
    'mineral springs bubbling up from the ground at Hepburn — free to taste straight from the earth?',
    'the Hepburn Bathhouse — a Victorian-era mineral spa where you soak while it rains outside?',
    'Daylesford in winter — wood fires, spa retreats, and the whole town slowing right down?',
    // Snow & alpine
    'snow gums draped in ice crystals after a High Country snowfall, the silence total and absolute?',
    'Victoria\'s highest ski resort at Hotham letting you ski through to Falls Creek — longest run in Australia?',
    'Mount Buller village alive in winter — ski all day, eat well, and wake to fresh snowfall?',
    'the alpine road to Mount Buffalo blanketed in snow, the chalet warming up inside?',
    // Cosy towns
    'Beechworth\'s intact gold-rush granite streetscape lit up on a cold winter night?',
    'Maldon\'s main street unchanged since the 1850s — antiques, tea rooms, and total quiet?',
    'Walhalla — a gold-rush ghost town hidden in a steep valley, barely touched since 1900?',
    'glow-worms turning the cave ceiling at Buchan into a galaxy of cool blue-green light?',
    // Wildlife (winter is great for whale watching, wildlife)
    'southern right whales nursing their calves from the clifftop at Logans Beach, Warrnambool?',
    'the Twelve Apostles at golden hour, limestone stacks rising from the Southern Ocean?',
    'wombats grazing fearlessly around your tent at Wilson\'s Promontory at dusk?',
    'king parrots eating from your hand at Grants Picnic Ground in the Dandenongs?',
    // Food & wine
    'a genuine 1860s paddle steamer churning up the Murray at Echuca on a crisp winter morning?',
    'the King Valley in winter — Italian winemakers, truffle season, and long lunch tables by the fire?',
    'Puffing Billy winding through misty tree fern gullies on a cold Dandenongs morning?',
    'Hanging Rock on a winter morning — mist in the gullies, not another soul on the trail?',
  ],
  autumn: [
    'the Ovens River in Bright in May — Japanese maples and elms turning red and gold?',
    'misty vineyard rows in the Yarra Valley just after an autumn rain?',
    'hot air balloons drifting over the Yarra Valley at first light — baskets skimming the mist?',
    'sea eagles circling above the Murray at Barmah on a perfectly still autumn morning?',
    'the King Valley Prosecco Road in autumn — Italian winemakers, chestnut trees, and long lunch tables?',
    'Four Pillars Gin making some of Australia\'s most awarded spirits in a Yarra Valley shed?',
    'mineral springs bubbling up from the ground at Hepburn — free to taste straight from the earth?',
    'hundreds of little penguins waddling ashore at Phillip Island at dusk?',
    'the Twelve Apostles at golden hour, limestone stacks rising from the Southern Ocean?',
    'Loch Ard Gorge before sunrise — ochre cliffs flushing pink before the crowds arrive?',
    'wombats grazing fearlessly around your tent at Wilson\'s Promontory at dusk?',
    'Beechworth\'s intact gold-rush granite streetscape — unchanged since the 1860s?',
    'glow-worms turning the cave ceiling at Buchan into a galaxy of cool blue-green light?',
    'panning for real gold at Sovereign Hill on the very ground where the rush began in 1851?',
    'Bendigo\'s art gallery hosting major international shows that most Melbourne galleries don\'t get?',
    'Hanging Rock rising from the plains like a fist — the geology that inspired a gothic masterpiece?',
  ],
  spring: [
    'wildflowers blanketing the Grampians from every ridge and gully in spring?',
    'the sunrise from Boroka Lookout — the entire Grampians spread below you?',
    'ancient Aboriginal rock art in the Grampians — paintings that predate European settlement by thousands of years?',
    'dozens of wild koalas in the roadside gums at Kennett River on the Great Ocean Road?',
    'the Twelve Apostles at golden hour, limestone stacks rising from the Southern Ocean?',
    'Cape Otway lighthouse stark white against a building storm — the oldest on mainland Australia?',
    'hot air balloons drifting over the Yarra Valley at first light — baskets skimming the mist?',
    'platypus feeding at dusk in the clear pools near Mount Beauty — barely making a ripple?',
    'southern right whales nursing their calves from the clifftop at Logans Beach?',
    'the Prom at low tide, Squeaky Beach sand creaking underfoot, not another soul in sight?',
    'king parrots eating from your hand at Grants Picnic Ground in the Dandenongs?',
    'Puffing Billy winding through tree fern gullies — Victoria\'s most-loved steam railway?',
    'kayaking the calm channels of the Gippsland Lakes at dawn — the water a perfect mirror?',
    'kangaroos grazing on the fairways at Anglesea Golf Club — wild mobs, free to watch, every day?',
    'Geelong\'s waterfront carousel — hand-carved in the 1890s and still spinning today?',
  ],
  summer: [
    'wild dolphins leaping through the waves off Sorrento on a summer morning?',
    'the panorama from Arthurs Seat — the entire Mornington Peninsula and both bays laid out below you?',
    'hundreds of little penguins waddling ashore at Phillip Island at dusk?',
    'Australia\'s largest fur seal colony just a short walk from Cape Bridgewater?',
    'the Prom at low tide, Squeaky Beach sand creaking underfoot, not another soul in sight?',
    'kayaking the calm channels of the Gippsland Lakes at dawn — the water a perfect mirror?',
    'Mallacoota\'s Croajingolong — so wild and remote UNESCO declared it a World Biosphere Reserve?',
    'dozens of wild koalas in the roadside gums at Kennett River on the Great Ocean Road?',
    'the Queen Victoria Market running since 1878 — the largest open-air market in the Southern Hemisphere?',
    'rooftop bars above Melbourne\'s CBD where you can watch the city light up at dusk?',
    'a genuine 1860s paddle steamer churning up the Murray at Echuca on a summer evening?',
    'the Goulburn Valley in February — every orchard dripping with peaches, nectarines, and apricots?',
    'Lake Hume stretching 20 times the size of Sydney Harbour across the Victoria-NSW border?',
    'kangaroos grazing on the fairways at Anglesea Golf Club — wild mobs, free to watch, every day?',
    'the fossil site at Flat Rocks, Inverloch — where world-class polar dinosaur bones were found?',
    'Loch Ard Gorge before sunrise — ochre cliffs flushing pink before the crowds arrive?',
  ],
}

// ── Hero search toggle (I know where I'm going / Surprise me) ─────────

type HeroMode = 'know' | 'surprise'

function HeroSearchToggle({ onSearch }: {
  onSearch: (origin: { name: string; coord: { lat: number; lng: number } | null }, dest: SubDestResult | null) => void
}) {
  const [mode, setMode] = useState<HeroMode>('know')
  const [displayed, setDisplayed] = useState<HeroMode>('know')
  const [cardPhase, setCardPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const btn0 = useRef<HTMLButtonElement>(null)
  const btn1 = useRef<HTMLButtonElement>(null)
  const [ind, setInd] = useState({ left: 0, width: 0, ready: false })

  // Measure whichever button is active and position the indicator there
  useEffect(() => {
    const btn = mode === 'know' ? btn0.current : btn1.current
    if (!btn) return
    setInd({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true })
  }, [mode])

  const switchMode = (next: HeroMode) => {
    if (next === mode || cardPhase !== 'idle') return
    setMode(next)
    setCardPhase('out')
    setTimeout(() => { setDisplayed(next); setCardPhase('in') }, 180)
    setTimeout(() => setCardPhase('idle'), 420)
  }

  const MU = 'cubic-bezier(0.05,0.7,0.1,1)'
  const cardStyle: React.CSSProperties =
    cardPhase === 'out'
      ? { transition: 'transform 0.18s cubic-bezier(0.4,0,1,1), opacity 0.18s ease, filter 0.18s ease',
          transform: 'scaleY(0.97) scaleX(0.985)', opacity: 0.55, filter: 'blur(3px)' }
      : cardPhase === 'in'
      ? { transition: `transform 0.32s ${MU}, opacity 0.26s ${MU}, filter 0.26s ease`,
          transform: 'scaleY(1) scaleX(1)', opacity: 1, filter: 'blur(0px)' }
      : { transform: 'scaleY(1) scaleX(1)', opacity: 1, filter: 'blur(0px)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', maxWidth: 680, margin: '0 auto' }}>

      <div style={{
        display: 'inline-flex', position: 'relative',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 999, padding: 4,
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      }}>
        {/* Sliding pill — no overflow:hidden so text is never clipped */}
        {ind.ready && (
          <div style={{
            position: 'absolute',
            top: 4, bottom: 4,
            left: ind.left,
            width: ind.width,
            borderRadius: 999,
            background: GREEN,
            boxShadow: '0 1px 8px rgba(58,107,79,0.35)',
            transition: 'left 0.32s cubic-bezier(0.05,0.7,0.1,1), width 0.32s cubic-bezier(0.05,0.7,0.1,1)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />
        )}

        <button ref={btn0} className="htoggle-btn"
          onClick={() => switchMode('know')}
          style={{ position: 'relative', zIndex: 1, color: mode === 'know' ? '#fff' : '#5C5A57', fontWeight: mode === 'know' ? 600 : 400, transition: 'color 0.25s ease' }}
        >
          I know where I'm going
        </button>
        <button ref={btn1} className="htoggle-btn"
          onClick={() => switchMode('surprise')}
          style={{ position: 'relative', zIndex: 1, color: mode === 'surprise' ? '#fff' : '#5C5A57', fontWeight: mode === 'surprise' ? 600 : 400, transition: 'color 0.25s ease' }}
        >
          Surprise me
        </button>
      </div>

      <div style={{ width: '100%', transformOrigin: 'center center', ...cardStyle }}>
        {displayed === 'know'
          ? <FromToSearch onSearch={onSearch} onSwitchToSurprise={() => switchMode('surprise')} />
          : <SurpriseMeSearch onSearch={onSearch} />
        }
      </div>
    </div>
  )
}

// ── Surprise me search ────────────────────────────────────────────────

function SurpriseMeSearch({ onSearch }: {
  onSearch: (origin: { name: string; coord: { lat: number; lng: number } | null }, dest: SubDestResult | null) => void
}) {
  const storedOrigin = useAppStore((s) => s.originName)
  const storedOriginCoord = useAppStore((s) => s.originCoord)
  const [fromQuery, setFromQuery] = useState('')
  const [fromSuggestions, setFromSuggestions] = useState<PhotonFeature[]>([])
  const [fromChosen, setFromChosen] = useState<{ name: string; coord: { lat: number; lng: number } } | null>(null)
  const [showNoFrom, setShowNoFrom] = useState(false)
  const fromDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fromRef = useRef<HTMLDivElement>(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  useEffect(() => {
    if (storedOrigin && storedOriginCoord && !fromChosen) {
      setFromQuery(storedOrigin)
      setFromChosen({ name: storedOrigin, coord: storedOriginCoord })
    }
  }, [storedOrigin]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) setFromSuggestions([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onFromChange = (val: string) => {
    setFromQuery(val); setFromChosen(null)
    if (fromDebounce.current) clearTimeout(fromDebounce.current)
    fromDebounce.current = setTimeout(() => searchOrigin(val).then(setFromSuggestions), 280)
  }

  const inp: React.CSSProperties = { width: '100%', padding: '14px 14px', border: 'none', outline: 'none', fontSize: 15, color: '#1C1B1F', background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 9.5, fontWeight: 800, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 14px 0' }
  const drop: React.CSSProperties = { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.14)', zIndex: 200, overflow: 'hidden' }

  return (
    <div style={{ width: '100%' }}>
    <div style={{
      background: '#fff', borderRadius: 18,
      boxShadow: showNoFrom ? '0 8px 40px rgba(0,0,0,0.13), 0 0 0 2px #E8A87C' : '0 8px 40px rgba(0,0,0,0.13)',
      border: showNoFrom ? '1px solid #E8A87C' : '1px solid rgba(0,0,0,0.06)', width: '100%',
      display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'visible',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    }}>
      {/* FROM */}
      <div ref={fromRef} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, borderBottom: isMobile ? '1px solid var(--border)' : 'none' }}>
        <div style={{ ...lbl, color: showNoFrom ? '#C0622A' : GREEN, transition: 'color 0.2s ease' }}>
          Starting from {showNoFrom && <span style={{ fontWeight: 500, fontSize: 9, textTransform: 'none', letterSpacing: 0, color: '#C0622A' }}>— required</span>}
        </div>
        <div className={`mu-input-wrap${showNoFrom ? ' mu-error' : ''}`} style={{ position: 'relative' }}>
          <input style={inp} placeholder="Your suburb or city"
            value={fromQuery}
            onChange={(e) => { setShowNoFrom(false); onFromChange(e.target.value) }}
            onFocus={() => { if (fromQuery.length >= 2 && !fromChosen) searchOrigin(fromQuery).then(setFromSuggestions) }}
          />
          {fromSuggestions.length > 0 && (
            <div style={drop}>
              {fromSuggestions.map((f, i) => (
                <button key={i} onClick={() => { const label = featureLabel(f); const [lng, lat] = f.geometry.coordinates; setFromQuery(label); setFromChosen({ name: label, coord: { lat, lng } }); setFromSuggestions([]); setShowNoFrom(false) }}
                  className="mu-dropdown-row"
                  style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13.5, cursor: 'pointer', color: '#1C1B1F', display: 'block' }}>
                  📍 {featureLabel(f)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Button */}
      <button
        onClick={() => { if (!fromChosen) { setShowNoFrom(true); return } onSearch({ name: fromChosen.name, coord: fromChosen.coord }, null) }}
        className="mu-btn-primary"
        style={{
          flexShrink: 0,
          padding: isMobile ? '14px 24px' : '0 28px',
          background: GREEN, border: 'none', color: '#fff',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          borderRadius: isMobile ? '0 0 18px 18px' : '0 18px 18px 0',
          letterSpacing: '-0.01em', whiteSpace: 'nowrap',
        }}
      >
        Surprise me →
      </button>
    </div>

    {/* No-from prompt */}
    <div style={{ overflow: 'hidden', maxHeight: showNoFrom ? 80 : 0, opacity: showNoFrom ? 1 : 0, transition: 'max-height 0.32s cubic-bezier(0.05,0.7,0.1,1), opacity 0.25s ease' }}>
      <div style={{ marginTop: 6, padding: '6px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: '#C0622A', fontWeight: 600 }}>⚠ Please enter your starting suburb to continue.</span>
      </div>
    </div>
    </div>
  )
}

// ── Simple From / To search (hero) ────────────────────────────────────

function FromToSearch({ onSearch, onSwitchToSurprise }: {
  onSearch: (origin: { name: string; coord: { lat: number; lng: number } | null }, dest: SubDestResult | null) => void
  onSwitchToSurprise?: () => void
}) {
  const storedOrigin = useAppStore((s) => s.originName)
  const storedOriginCoord = useAppStore((s) => s.originCoord)
  const [fromQuery, setFromQuery] = useState('')
  const [fromSuggestions, setFromSuggestions] = useState<PhotonFeature[]>([])
  const [fromChosen, setFromChosen] = useState<{ name: string; coord: { lat: number; lng: number } } | null>(null)
  const [toQuery, setToQuery] = useState('')
  const [toSuggestions, setToSuggestions] = useState<SubDestResult[]>([])
  const [toChosen, setToChosen] = useState<SubDestResult | null>(null)
  const [showNoFrom, setShowNoFrom] = useState(false)
  const [showNoDest, setShowNoDest] = useState(false)
  const fromDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fromRef = useRef<HTMLDivElement>(null)
  const toRef = useRef<HTMLDivElement>(null)

  useEffect(() => { preloadDestinations() }, [])

  useEffect(() => {
    if (storedOrigin && storedOriginCoord && !fromChosen) {
      setFromQuery(storedOrigin)
      setFromChosen({ name: storedOrigin, coord: storedOriginCoord })
    }
  }, [storedOrigin]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) setFromSuggestions([])
      if (toRef.current && !toRef.current.contains(e.target as Node)) setToSuggestions([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onFromChange = (val: string) => {
    setFromQuery(val); setFromChosen(null)
    if (fromDebounce.current) clearTimeout(fromDebounce.current)
    fromDebounce.current = setTimeout(() => searchOrigin(val).then(setFromSuggestions), 280)
  }
  const onToChange = (val: string) => {
    setToQuery(val); setToChosen(null)
    setToSuggestions(searchDestinations(val))
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const inp: React.CSSProperties = { width: '100%', padding: '14px 14px', border: 'none', outline: 'none', fontSize: 15, color: '#1C1B1F', background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 9.5, fontWeight: 800, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 14px 0' }
  const drop: React.CSSProperties = { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.14)', zIndex: 200, overflow: 'hidden' }

  const handleGoClick = () => {
    if (!fromChosen) { setShowNoFrom(true); return }
    if (!toChosen)   { setShowNoFrom(false); setShowNoDest(true); return }
    setShowNoFrom(false); setShowNoDest(false)
    onSearch({ name: fromChosen.name, coord: fromChosen.coord }, toChosen)
  }

  return (
    <div style={{ width: '100%' }}>
    <div style={{
      background: '#fff', borderRadius: 18, boxShadow: (showNoFrom || showNoDest) ? `0 8px 40px rgba(0,0,0,0.13), 0 0 0 2px #E8A87C` : '0 8px 40px rgba(0,0,0,0.13)',
      border: (showNoFrom || showNoDest) ? '1px solid #E8A87C' : '1px solid rgba(0,0,0,0.06)', maxWidth: 680, width: '100%', margin: '0 auto',
      display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'visible',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    }}>

      {/* FROM */}
      <div ref={fromRef} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, borderBottom: isMobile ? '1px solid var(--border)' : 'none' }}>
        <div style={{ ...lbl, color: showNoFrom ? '#C0622A' : GREEN, transition: 'color 0.2s ease' }}>
          From {showNoFrom && <span style={{ fontWeight: 500, fontSize: 9, textTransform: 'none', letterSpacing: 0, color: '#C0622A' }}>— required</span>}
        </div>
        <div className={`mu-input-wrap${showNoFrom ? ' mu-error' : ''}`} style={{ position: 'relative' }}>
          <input style={inp} placeholder="Your suburb or city" value={fromQuery}
            onChange={(e) => { setShowNoFrom(false); onFromChange(e.target.value) }}
            onFocus={() => { if (fromQuery.length >= 2 && !fromChosen) searchOrigin(fromQuery).then(setFromSuggestions) }}
          />
          {fromSuggestions.length > 0 && (
            <div style={drop}>
              {fromSuggestions.map((f, i) => (
                <button key={i} onClick={() => { const label = featureLabel(f); const [lng, lat] = f.geometry.coordinates; setFromQuery(label); setFromChosen({ name: label, coord: { lat, lng } }); setFromSuggestions([]); setShowNoFrom(false) }}
                  className="mu-dropdown-row"
                  style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13.5, cursor: 'pointer', color: '#1C1B1F', display: 'block' }}>
                  📍 {featureLabel(f)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isMobile && <div style={{ width: 1, background: (showNoFrom || showNoDest) ? '#E8A87C' : 'var(--border)', alignSelf: 'stretch', margin: '10px 0', transition: 'background 0.2s ease' }} />}

      {/* TO */}
      <div ref={toRef} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, borderBottom: isMobile ? '1px solid var(--border)' : 'none' }}>
        <div style={{ ...lbl, color: showNoDest ? '#C0622A' : GREEN, transition: 'color 0.2s ease' }}>
          Where to? {showNoDest && <span style={{ fontWeight: 500, fontSize: 9, textTransform: 'none', letterSpacing: 0, color: '#C0622A' }}>— required</span>}
        </div>
        <div className={`mu-input-wrap${showNoDest ? ' mu-error' : ''}`} style={{ position: 'relative' }}>
          <input style={{ ...inp, paddingRight: toChosen ? 36 : undefined }} placeholder="Search a destination…"
            value={toChosen ? toChosen.name : toQuery}
            onChange={(e) => { setToChosen(null); setShowNoDest(false); onToChange(e.target.value) }}
            onFocus={() => { if (toQuery.length >= 2 && !toChosen) setToSuggestions(searchDestinations(toQuery)) }}
          />
          {toChosen && (
            <button onClick={() => { setToChosen(null); setToQuery('') }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', color: '#6B7280' }}>×</button>
          )}
          {toSuggestions.length > 0 && !toChosen && (
            <div style={drop}>
              {toSuggestions.map((s) => (
                <button key={s.id} onClick={() => { setToChosen(s); setToQuery(s.name); setToSuggestions([]); setShowNoDest(false) }}
                  className="mu-dropdown-row"
                  style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13.5, cursor: 'pointer', color: '#1C1B1F', display: 'block' }}>
                  📍 {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleGoClick}
        style={{
          flexShrink: 0,
          padding: isMobile ? '14px 24px' : '0 24px',
          background: GREEN, border: 'none', color: '#fff',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          borderRadius: isMobile ? '0 0 18px 18px' : '0 18px 18px 0',
          letterSpacing: '-0.01em', whiteSpace: 'nowrap',
        }}
        className="mu-btn-primary"
      >
        {toChosen ? 'Plan this →' : "Let's go →"}
      </button>
    </div>

    {/* No-destination prompt — slides down when they try to go without a To */}
    <div style={{
      overflow: 'hidden',
      maxHeight: (showNoDest || showNoFrom) ? 120 : 0,
      opacity: (showNoDest || showNoFrom) ? 1 : 0,
      transition: 'max-height 0.32s cubic-bezier(0.05,0.7,0.1,1), opacity 0.25s ease',
    }}>
      <div style={{ marginTop: 6, padding: '6px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: '#C0622A', fontWeight: 600 }}>
          ⚠ {showNoFrom ? 'Please enter your starting suburb to continue.' : 'Please choose a destination to continue.'}
        </span>
      </div>
    </div>
    </div>
  )
}

// ── Main landing page ─────────────────────────────────────────────────

// ── Seasonal watercolour corner washes ───────────────────────────────
// Dark pigment anchored at top-left and bottom-right, bleeding to white at centre.
// Each season has two corner colours (they can differ slightly for depth).

const CORNER_PALETTES: Record<string, { c1: string[]; c2: string[] }> = {
  // Autumn: burnt sienna, amber, deep rust — Victorian deciduous foliage
  autumn: {
    c1: ['#8B2500', '#B84010', '#D4600A', '#C03008'],
    c2: ['#7A1E00', '#A03808', '#C85010', '#B02808'],
  },
  // Winter: dusty teal (harmonises with site green) + warm rust (fire/warmth)
  winter: {
    c1: ['#1A5C5C', '#0F4A4A', '#226868', '#174F4F'],
    c2: ['#A04020', '#B85030', '#8A3018', '#C05828'],
  },
  // Spring: wattle gold, wildflower pink, sage — Grampians bloom
  spring: {
    c1: ['#7B4F00', '#A06800', '#C88800', '#8E5C00'],
    c2: ['#7A1E50', '#A03068', '#C04880', '#8A2258'],
  },
  // Summer: terracotta, dry ochre, burnt clay — hot Victorian bush
  summer: {
    c1: ['#5C2000', '#7A3010', '#9A4818', '#6E2808'],
    c2: ['#4A1800', '#682808', '#884018', '#5A2008'],
  },
}

function SeasonalWatercolour({ season }: { season: string }) {
  const { c1, c2 } = CORNER_PALETTES[season] ?? CORNER_PALETTES.autumn

  // Each corner: stack several radial-gradient divs with varying radius/offset
  // to simulate pigment pooling and feathering into white paper
  const topLeft = [
    { colors: c1, rx: '60%', ry: '55%', ox: '-5%', oy: '-8%', opacity: 0.55 },
    { colors: c1, rx: '45%', ry: '40%', ox: '-12%', oy: '-14%', opacity: 0.38 },
    { colors: c1, rx: '30%', ry: '26%', ox: '-16%', oy: '-18%', opacity: 0.25 },
  ]
  const bottomRight = [
    { colors: c2, rx: '60%', ry: '55%', ox: '105%', oy: '108%', opacity: 0.50 },
    { colors: c2, rx: '45%', ry: '40%', ox: '112%', oy: '114%', opacity: 0.35 },
    { colors: c2, rx: '30%', ry: '26%', ox: '116%', oy: '118%', opacity: 0.22 },
  ]

  const renderWash = (layers: typeof topLeft) =>
    layers.map((layer, li) =>
      layer.colors.map((color, ci) => {
        const jitterX = (ci % 2) * 3 - 1
        const jitterY = ((ci + li) % 2) * 4 - 2
        return (
          <div key={`${li}-${ci}`} style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse ${layer.rx} ${layer.ry} at calc(${layer.ox} + ${jitterX}px) calc(${layer.oy} + ${jitterY}px), ${color} 0%, ${color}cc 20%, ${color}55 42%, ${color}18 60%, transparent 75%)`,
            opacity: layer.opacity * (0.9 - ci * 0.12),
            filter: `blur(${6 + ci * 4 + li * 3}px)`,
          }} />
        )
      })
    )

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {renderWash(topLeft)}
      {renderWash(bottomRight)}
      {/* Frost layer — heavier top-left (cold), fades away toward bottom-right fire corner */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(235,242,248,0.52) 0%, rgba(240,245,248,0.30) 45%, rgba(255,255,255,0.06) 100%)',
        backdropFilter: 'blur(8px) saturate(0.9)',
        WebkitBackdropFilter: 'blur(8px) saturate(0.9)',
      }} />
      {/* Centre vignette — ensures text is always readable regardless of season colour */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 80% at 50% 45%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.40) 55%, transparent 80%)',
      }} />
    </div>
  )
}

export function LandingPage() {
  const { clusters: rawClusters } = useClusters()
  const clusters = [...rawClusters].sort(
    (a, b) => (b.seasonalScores[season] ?? 0) - (a.seasonalScores[season] ?? 0)
  )
  const { setWizardOpen, setPreselectedDest, setTripPlanState, setOriginSet } = useAppStore()
  const seasonHighlights = VICTORIA_HIGHLIGHTS[season] ?? VICTORIA_HIGHLIGHTS.summer
  const highlight = useMemo(
    () => seasonHighlights[Math.floor(Math.random() * seasonHighlights.length)],
    [season],
  )

  const handleSearch = useCallback((
    origin: { name: string; coord: { lat: number; lng: number } | null },
    dest: SubDestResult | null,
  ) => {
    const originCoord = origin.coord ?? { lat: -37.8136, lng: 144.9631 }
    const name = origin.name || ''

    // Always store the origin
    setTripPlanState({ originName: name, originCoord })
    setOriginSet(true)

    if (dest) {
      // Pre-fill dest so wizard uses preselected mode (skips how-far + pick-spot steps)
      const preset = { corridorId: dest.clusterSlug, destId: dest.id, destName: dest.name, destCoord: { lat: dest.lat, lng: dest.lng } }
      setPreselectedDest(preset)
      setTripPlanState({ destId: dest.id, destName: dest.name, destCoord: { lat: dest.lat, lng: dest.lng }, selectedCorridorId: dest.clusterSlug })
    } else {
      setPreselectedDest(null)
    }
    setWizardOpen(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openWizard = () => {
    setPreselectedDest(null)
    setWizardOpen(true)
  }

  const planSubDest = (cluster: VicCluster, sub: SubDest) => {
    const preset: PreselectedDest = {
      corridorId: cluster.id,
      destId: sub.id,
      destName: sub.name,
      destCoord: sub.coord,
    }
    setPreselectedDest(preset)
    setTripPlanState({
      destName: sub.name,
      destId: sub.id,
      destCoord: sub.coord,
      selectedCorridorId: cluster.id,
    })
    setWizardOpen(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      overflowX: 'hidden',
      position: 'relative',
    }}>
    {/* ── Material You global styles ── */}

      {/* ── Nav ─────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 60,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      }}>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: '#1C1C1A', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          Unplanned<span style={{ color: GREEN }}> Escapes</span>
          <span style={{ color: '#8C8A87', fontWeight: 400, fontSize: 13 }}> Victoria</span>
        </div>
        <button onClick={openWizard} className="mu-nav-btn" style={{
          padding: '7px 16px', borderRadius: 9,
          background: GREEN, border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', letterSpacing: '-0.01em',
        }}>
          Let's plan
        </button>
      </nav>

      {/* ── Hero ──────────────────────────── */}
      <section style={{
        padding: 'clamp(56px, 10vw, 96px) 24px clamp(48px, 8vw, 88px)',
        textAlign: 'center',
        position: 'relative',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-base)',
      }}>
        <SeasonalWatercolour season={season} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 680, margin: '0 auto' }}>

          {/* H1 — charm + clarity in two lines */}
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15,
            color: '#1A1A1A',
            margin: '0 0 20px',
          }}>
            <span style={{
              color: GREEN,
              textShadow: '0 0 20px rgba(255,255,255,1), 0 0 40px rgba(255,255,255,0.9)',
            }}>Have you seen...</span>{' '}{highlight}
          </h1>

          {/* Subheadline — answers "what is this / why care" */}
          <p style={{
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            color: '#4A4A4A', lineHeight: 1.65, fontWeight: 400,
            maxWidth: 460, margin: '0 auto 48px',
          }}>
            Discover Victorian weekend escapes — local food, nature &amp; stays, planned in 30 seconds.
          </p>

          {/* Search — visual centre, primary action */}
          <div style={{ width: '100%', position: 'relative', zIndex: 20, marginBottom: 16 }}>
            <HeroSearchToggle onSearch={handleSearch} />
          </div>

          {/* Trust signal */}
          <p style={{
            fontSize: 13, color: '#6B7280', margin: '0 0 16px',
            letterSpacing: '0.01em',
          }}>
            130 Victorian destinations · Free to plan · No account needed
          </p>

          {/* Ghost secondary — min 44px tap target for mobile */}
          <button
            onClick={() => document.getElementById('clusters')?.scrollIntoView({ behavior: 'smooth' })}
            className="mu-browse-link"
            style={{
              background: 'none', border: 'none',
              color: '#3F4F42', fontSize: 14, cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: '#3F4F42',
              padding: '12px 8px', minHeight: 44,
            }}>
            or browse destinations ↓
          </button>

        </div>
      </section>

      {/* ── Cluster cards grid ────────────── */}
      <section id="clusters" style={{ padding: '56px 24px 100px', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Victoria's best weekend escapes
          </div>
          <h2 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 700, letterSpacing: '-0.02em', color: '#1C1C1A', marginBottom: 8,
          }}>
            Pick a destination, we'll handle the planning
          </h2>
          <p style={{ fontSize: 13, color: '#8C8A87', lineHeight: 1.6 }}>
            Drive times calculated from your suburb. Click any destination to preview food, activities and accommodation before committing.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 24,
        }}>
          {clusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              season={season}
              onPlan={planSubDest}
            />
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────── */}
      <footer style={{
        background: GREEN,
        padding: '32px 28px 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Unplanned Escapes
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 500, marginTop: 1 }}>Victoria</div>
            </div>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, textDecoration: 'none', letterSpacing: '-0.01em' }}>
              Privacy &amp; About
            </a>
          </div>
          {/* Attribution row */}
          <div style={{ marginBottom: 16, fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            Map data ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="mu-footer-link" style={{ color: 'rgba(255,255,255,0.75)' }}>OpenStreetMap contributors</a>
            {' '}(ODbL) · Map tiles ©{' '}
            <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="mu-footer-link" style={{ color: 'rgba(255,255,255,0.75)' }}>CARTO</a>
            {' '}· Destination content ©{' '}
            <a href="https://en.wikipedia.org" target="_blank" rel="noopener noreferrer" className="mu-footer-link" style={{ color: 'rgba(255,255,255,0.75)' }}>Wikipedia contributors</a>
            {' '}(CC BY-SA) · Trail data © <a href="https://www.data.vic.gov.au" target="_blank" rel="noopener noreferrer" className="mu-footer-link" style={{ color: 'rgba(255,255,255,0.75)' }}>DataVic</a>
            {' '}(CC BY 4.0) · Heritage data © <a href="https://vhd.heritagecouncil.vic.gov.au" target="_blank" rel="noopener noreferrer" className="mu-footer-link" style={{ color: 'rgba(255,255,255,0.75)' }}>Heritage Council Victoria</a>
            {' '}(CC BY 4.0) · Fuel data © State of Victoria · Weather by{' '}
            <a href="https://api.met.no" target="_blank" rel="noopener noreferrer" className="mu-footer-link" style={{ color: 'rgba(255,255,255,0.75)' }}>MET Norway</a>
          </div>
          {/* Bottom row */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>
              Helping Victorians escape, one weekend at a time.
            </span>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>
              Created by <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cubix IT Solutions</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── From-where modal ─────────────────────────────────────────────────

function FromWhereModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (name: string, coord: { lng: number; lat: number }) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [chosen, setChosen] = useState<{ name: string; coord: { lng: number; lat: number } } | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onChange = (val: string) => {
    setQuery(val)
    setChosen(null)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const results = await searchOrigin(val)
      setSuggestions(results)
    }, 280)
  }

  const pick = (f: PhotonFeature) => {
    const label = featureLabel(f)
    const [lng, lat] = f.geometry.coordinates
    setQuery(label)
    setSuggestions([])
    setChosen({ name: label, coord: { lng, lat } })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px 28px',
        width: '100%', maxWidth: 460,
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 22, fontWeight: 700, color: '#1C1C1A',
          marginBottom: 6, letterSpacing: '-0.02em',
        }}>
          Where are you starting from?
        </div>
        <p style={{ fontSize: 13, color: '#8C8A87', marginBottom: 22, lineHeight: 1.6, margin: '6px 0 22px' }}>
          Enter your suburb or town so we can calculate drive times and tailor your trip.
        </p>

        <div style={{ position: 'relative', marginBottom: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            border: `2px solid ${chosen ? GREEN : 'var(--border)'}`,
            borderRadius: 12, background: '#FAFAF9', overflow: 'visible',
            transition: 'border-color 0.15s',
          }}>
            <span style={{ padding: '0 12px', fontSize: 16, flexShrink: 0 }}>📍</span>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Fitzroy, Carlton, Geelong…"
              value={query}
              onChange={(e) => onChange(e.target.value)}
              style={{
                flex: 1, padding: '13px 0',
                border: 'none', outline: 'none',
                fontSize: 15, color: '#1C1C1A', background: 'transparent',
              }}
            />
            {chosen && (
              <span style={{ padding: '0 14px', color: GREEN, fontSize: 18 }}>✓</span>
            )}
          </div>

          {suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, overflow: 'hidden',
            }}>
              {suggestions.map((f, i) => (
                <button
                  key={i}
                  onClick={() => pick(f)}
                  className="mu-dropdown-row"
                  style={{
                    width: '100%', padding: '10px 16px',
                    background: 'none', border: 'none', textAlign: 'left',
                    cursor: 'pointer', fontSize: 14, color: '#1C1C1A',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{f.properties.name}</span>
                  {f.properties.city && (
                    <span style={{ color: '#8C8A87', marginLeft: 8 }}>
                      {[f.properties.city, f.properties.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          disabled={!chosen}
          onClick={() => chosen && onConfirm(chosen.name, chosen.coord)}
          style={{
            width: '100%', padding: '13px', borderRadius: 12, border: 'none',
            background: chosen ? GREEN : 'var(--bg-muted)',
            color: chosen ? '#fff' : '#C8C4BD',
            fontSize: 15, fontWeight: 700,
            cursor: chosen ? 'pointer' : 'not-allowed',
            letterSpacing: '-0.01em',
          }}
          className={chosen ? 'mu-btn-primary' : ''}
        >
          Continue to trip planner →
        </button>
      </div>
    </div>
  )
}

// ── Live POI section (Overpass + Wikipedia) ────────────────────────

// ── Big cluster card with backdrop image ────────────────────────────

function ClusterCard({
  cluster, season, onPlan,
}: {
  cluster: VicCluster
  season: string
  onPlan: (cluster: VicCluster, sub: SubDest) => void
}) {
  const [selectedSubIdx, setSelectedSubIdx] = useState(0)
  const [imgError, setImgError] = useState(false)
  const storedOriginName = useAppStore((s) => s.originName)
  const score = cluster.seasonalScores[season as keyof typeof cluster.seasonalScores]
  const isGreat = score >= 9
  const isGood = score >= 7
  const selectedSub = cluster.subDests[selectedSubIdx]
  const driveOriginLabel = storedOriginName ? storedOriginName.split(',')[0] : 'Melbourne'

  return (
    <div className="mu-card" style={{
      borderRadius: 18,
      overflow: 'hidden',
      background: '#fff',
      border: '1px solid var(--border)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Image header */}
      <div style={{ position: 'relative', height: 210, overflow: 'hidden', flexShrink: 0 }}>
        {!imgError ? (
          <img
            src={`${cluster.imageUrl}?auto=format&fit=crop&w=800&q=80`}
            alt={cluster.name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${cluster.gradientFrom}, ${cluster.gradientTo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 64,
          }}>
            {cluster.image}
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.72) 100%)',
        }} />

        {/* Season badge — top left */}
        {(isGreat || isGood) && (
          <div style={{
            position: 'absolute', top: 14, left: 14,
            padding: '4px 10px', borderRadius: 20,
            background: isGreat ? 'rgba(58,107,79,0.92)' : 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            fontSize: 11, fontWeight: 700,
            color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            {isGreat ? 'Ideal now' : 'Good now'}
          </div>
        )}

        {/* Drive time badge — top right */}
        <div style={{
          position: 'absolute', top: 14, right: 14,
          padding: '4px 10px', borderRadius: 20,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          fontSize: 11, fontWeight: 600, color: '#fff',
        }}>
          {cluster.driveTimeRange} from {driveOriginLabel}
        </div>

        {/* Text overlay — bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px' }}>
          <div style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 22, fontWeight: 700, color: '#fff',
            letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 5,
          }}>
            {cluster.name}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>
            {cluster.tagline}
          </div>
        </div>
      </div>

      {/* Theme pills */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 18px',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        {cluster.themes.map((t) => (
          <span key={t} style={{
            fontSize: 11, color: '#6B6966',
            background: 'var(--bg-muted)',
            padding: '3px 9px', borderRadius: 6, fontWeight: 500,
          }}>
            {t}
          </span>
        ))}
      </div>

      {/* Sub-destination tabs */}
      <div style={{
        display: 'flex', gap: 8, padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        {cluster.subDests.map((sub, i) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubIdx(i)}
            className={`mu-tab${i === selectedSubIdx ? ' mu-tab-active' : ''}`}
            style={{
              padding: '6px 13px', borderRadius: 8,
              background: i === selectedSubIdx ? GREEN : 'var(--bg-base)',
              color: i === selectedSubIdx ? '#fff' : '#4A4948',
              border: `1.5px solid ${i === selectedSubIdx ? GREEN : 'var(--border)'}`,
              fontSize: 12, fontWeight: i === selectedSubIdx ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* Selected sub-destination detail */}
      <SubDestDetail
        key={selectedSub.id}
        sub={selectedSub}
        onPlan={() => onPlan(cluster, selectedSub)}
      />
    </div>
  )
}

// ── Sub-destination detail panel ─────────────────────────────────────

function SubDestDetail({ sub, onPlan }: { sub: SubDest; onPlan: () => void }) {
  const [showModal, setShowModal] = useState(false)
  const [showFromWhere, setShowFromWhere] = useState(false)

  const originCoord = useAppStore((s) => s.originCoord)
  const originName = useAppStore((s) => s.originName)
  const originSet = useAppStore((s) => s.originSet)
  const setTripPlanState = useAppStore((s) => s.setTripPlanState)
  const setOriginSet = useAppStore((s) => s.setOriginSet)

  const { distanceBetween } = useDriveDist()
  const driveKm = Math.round(distanceBetween(originCoord, sub.coord) * 1.3)
  const driveHrs = driveKm / 80
  const driveLabel = driveHrs < 1
    ? `${Math.round(driveHrs * 60)} min`
    : driveHrs < 2
      ? `${driveHrs.toFixed(1)} hr`
      : `${driveHrs.toFixed(1)} hrs`

  const { activities } = useActivities(sub.id)
  const hiddenGems = activities.filter((a) => a.isHiddenGem)

  const handlePlanClick = () => {
    if (!originSet) {
      setShowFromWhere(true)
    } else {
      onPlan()
    }
  }

  const handleFromWhereConfirm = (name: string, coord: { lng: number; lat: number }) => {
    setTripPlanState({ originName: name, originCoord: coord })
    setOriginSet(true)
    setShowFromWhere(false)
    onPlan()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {showFromWhere && (
        <FromWhereModal
          onConfirm={handleFromWhereConfirm}
          onClose={() => setShowFromWhere(false)}
        />
      )}

      {/* Destination detail modal */}
      {showModal && (
        <DestinationModal
          sub={sub}
          driveLabel={driveLabel}
          activities={activities}
          onPlan={() => { setShowModal(false); handlePlanClick() }}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Summary row */}
      <div style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Drive time badge */}
        <div style={{
          flexShrink: 0, textAlign: 'center',
          minWidth: 64, padding: '8px 8px',
          borderRadius: 10, background: 'var(--bg-base)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1C1A', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {driveHrs < 1 ? Math.round(driveHrs * 60) : driveHrs.toFixed(driveHrs === Math.floor(driveHrs) ? 0 : 1)}
          </div>
          <div style={{ fontSize: 9, color: '#8C8A87', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: 2 }}>
            {driveHrs < 1 ? 'min' : 'hrs'}
          </div>
          <div style={{ fontSize: 9, color: '#C8C4BD', marginTop: 1 }}>from {originName.split(',')[0]}</div>
        </div>

        {/* Highlights */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1A', letterSpacing: '-0.01em' }}>
              {sub.name}
            </span>
            <span style={{ fontSize: 12, color: '#8C8A87' }}>· {driveLabel} drive</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sub.highlights.map((h) => (
              <li key={h} style={{ display: 'flex', gap: 7, fontSize: 13, color: '#4A4948', lineHeight: 1.5 }}>
                <span style={{ color: GREEN, flexShrink: 0, marginTop: 1 }}>·</span>
                {h}
              </li>
            ))}
          </ul>

          {hiddenGems.length > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              marginTop: 10, padding: '3px 9px', borderRadius: 6,
              background: '#FFF8F0', border: '1px solid #E8C89860',
              fontSize: 11, color: '#B87333', fontWeight: 600,
            }}>
              {hiddenGems.length} local gem{hiddenGems.length > 1 ? 's' : ''} here
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 18px',
        borderTop: '1px solid var(--border)',
        marginTop: 'auto',
      }}>
        <button
          onClick={() => setShowModal(true)}
          className="mu-card-ghost"
          style={{
            flex: 1,
            padding: '9px 0', borderRadius: 9,
            background: 'transparent',
            border: '1.5px solid var(--border)',
            color: '#4A4948', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          What's here
        </button>
        <button
          onClick={handlePlanClick}
          className="mu-btn-primary"
          style={{
            flex: 2,
            padding: '10px 0', borderRadius: 9,
            background: GREEN, border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          Plan this escape →
        </button>
      </div>
    </div>
  )
}



// ── Inline haversine hook ────────────────────────────────────────────

function useDriveDist() {
  return {
    distanceBetween: (
      a: { lng: number; lat: number },
      b: { lng: number; lat: number },
    ): number => {
      const R = 6371
      const dLat = ((b.lat - a.lat) * Math.PI) / 180
      const dLng = ((b.lng - a.lng) * Math.PI) / 180
      const sinLat = Math.sin(dLat / 2)
      const sinLng = Math.sin(dLng / 2)
      const aa = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng
      return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
    },
  }
}
