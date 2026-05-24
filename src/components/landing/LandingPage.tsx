import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { PreselectedDest } from '@/store/useAppStore'
import { getCurrentSeason, SEASON_META } from '@/utils/season'
import { getClustersBySeason } from '@/data/victorianClusters'
import type { VicCluster, SubDest } from '@/data/victorianClusters'
import { getActivitiesForSubDest } from '@/data/victorianActivities'
import type { Activity } from '@/data/victorianActivities'
import { LogoMark } from '@/components/layout/Header'

const GREEN = '#3A6B4F'

const season = getCurrentSeason()
const seasonMeta = SEASON_META[season]
const clusters = getClustersBySeason(season)

// ── Photon autocomplete ───────────────────────────────────────────────

interface PhotonFeature {
  properties: { name: string; city?: string; state?: string; country?: string }
  geometry: { coordinates: [number, number] }
}

async function searchOrigin(q: string): Promise<PhotonFeature[]> {
  if (q.length < 2) return []
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=en&limit=6&bbox=140,-39,150,-34`
  const res = await fetch(url)
  const json = await res.json()
  return json.features ?? []
}

function featureLabel(f: PhotonFeature): string {
  const p = f.properties
  return [p.name, p.city, p.state].filter(Boolean).join(', ')
}

// ── Origin search box ────────────────────────────────────────────────

function OriginSearchBox({
  onSelect,
  onOpenWizard,
}: {
  onSelect: (name: string, coord: { lng: number; lat: number }) => void
  onOpenWizard: () => void
}) {
  const originName = useAppStore((s) => s.originName)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [chosen, setChosen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onChange = (val: string) => {
    setQuery(val)
    setChosen(false)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setLoading(true)
      const results = await searchOrigin(val)
      setSuggestions(results)
      setLoading(false)
    }, 280)
  }

  const pick = (f: PhotonFeature) => {
    const label = featureLabel(f)
    const [lng, lat] = f.geometry.coordinates
    setQuery(label)
    setSuggestions([])
    setChosen(true)
    onSelect(label, { lng, lat })
  }

  const displayQuery = chosen ? query : query || originName

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        borderRadius: 12,
        background: '#fff',
        border: '1.5px solid var(--border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Icon */}
        <div style={{
          display: 'flex', alignItems: 'center', paddingLeft: 14,
          color: '#8C8A87', fontSize: 16, flexShrink: 0,
        }}>
          📍
        </div>

        {/* Input */}
        <input
          type="text"
          placeholder={`Travelling from ${originName}…`}
          value={displayQuery === originName && !chosen ? '' : query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (query.length >= 2) searchOrigin(query).then(setSuggestions) }}
          style={{
            flex: 1, padding: '14px 12px',
            border: 'none', outline: 'none',
            fontSize: 14, color: '#1C1C1A',
            background: 'transparent',
          }}
        />

        {/* CTA button */}
        <button
          onClick={onOpenWizard}
          style={{
            flexShrink: 0,
            padding: '0 20px',
            background: GREEN, border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '-0.01em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2d5440')}
          onMouseLeave={(e) => (e.currentTarget.style.background = GREEN)}
        >
          {loading ? '…' : "Let's plan →"}
        </button>
      </div>

      {/* Dropdown */}
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 4, borderRadius: 10,
          background: '#fff', border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 100, overflow: 'hidden',
        }}>
          {suggestions.map((f, i) => (
            <button
              key={i}
              onClick={() => pick(f)}
              style={{
                width: '100%', padding: '10px 16px',
                background: 'none', border: 'none',
                textAlign: 'left', cursor: 'pointer',
                fontSize: 13, color: '#1C1C1A',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-muted)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontWeight: 600 }}>{f.properties.name}</span>
              {f.properties.city && (
                <span style={{ color: '#8C8A87', marginLeft: 6 }}>
                  {[f.properties.city, f.properties.state].filter(Boolean).join(', ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main landing page ─────────────────────────────────────────────────

export function LandingPage() {
  const { setWizardOpen, setPreselectedDest, setTripPlanState } = useAppStore()
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null)

  const handleOriginSelect = (name: string, coord: { lng: number; lat: number }) => {
    setTripPlanState({ originName: name, originCoord: coord })
  }

  const openWizard = () => {
    setPreselectedDest(null)
    setWizardOpen(true)
  }

  const planSubDest = (cluster: VicCluster, sub: SubDest) => {
    const preset: PreselectedDest = {
      corridorId: cluster.id,
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

  const toggleCluster = (id: string) =>
    setExpandedCluster((prev) => (prev === id ? null : id))

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      overflowX: 'hidden',
    }}>

      {/* ── Nav ───────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
        height: 56,
        background: 'rgba(248,247,244,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={34} />
          <div>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 15, fontWeight: 700,
              color: '#1C1C1A', lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}>
              Unplanned<span style={{ color: GREEN }}> Escapes</span>
            </div>
            <div style={{ fontSize: 9, color: '#8C8A87', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
              Victoria
            </div>
          </div>
        </div>
        <button onClick={openWizard} style={{
          padding: '7px 16px', borderRadius: 9,
          background: GREEN, border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', letterSpacing: '-0.01em',
        }}>
          Let's plan
        </button>
      </nav>

      {/* ── Seasonal hero ─────────────────────────────── */}
      <section style={{
        position: 'relative',
        padding: '64px 24px 52px',
        textAlign: 'center',
        overflow: 'hidden',
        background: `linear-gradient(170deg, ${seasonMeta.palette.from}12 0%, transparent 60%)`,
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Brand lockup */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 32 }}>
          <LogoMark size={52} />
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700,
              color: '#1C1C1A', lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}>
              Unplanned<span style={{ color: GREEN }}> Escapes</span>
            </div>
            <div style={{ fontSize: 11, color: '#8C8A87', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginTop: 3 }}>
              Victorian weekend getaways
            </div>
          </div>
        </div>

        {/* Season badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 20,
          background: `${seasonMeta.palette.from}12`,
          border: `1px solid ${seasonMeta.palette.from}30`,
          fontSize: 12, fontWeight: 600,
          color: seasonMeta.palette.from,
          letterSpacing: '0.04em',
          marginBottom: 20,
        }}>
          {seasonMeta.emoji} {seasonMeta.label} in Victoria
        </div>

        <h1 style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 'clamp(28px, 5vw, 56px)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: '#1C1C1A',
          maxWidth: 640,
          margin: '0 auto 16px',
        }}>
          {seasonMeta.headline}
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 1.8vw, 17px)',
          color: '#4A4948',
          lineHeight: 1.7,
          maxWidth: 500,
          margin: '0 auto 32px',
        }}>
          {seasonMeta.sub}
        </p>

        {/* Origin search + plan CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <OriginSearchBox
            onSelect={handleOriginSelect}
            onOpenWizard={openWizard}
          />
          <button
            onClick={() => document.getElementById('clusters')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              background: 'none', border: 'none',
              color: '#8C8A87', fontSize: 13, cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: 'var(--border)',
              padding: '4px 8px',
            }}>
            or browse destinations first ↓
          </button>
        </div>

        <div style={{ display: 'flex', gap: 28, justifyContent: 'center', marginTop: 44, flexWrap: 'wrap' }}>
          {[
            { val: '12', label: 'regions' },
            { val: '35+', label: 'specific destinations' },
            { val: '< 4 hrs', label: 'from Melbourne' },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, color: GREEN }}>{val}</div>
              <div style={{ fontSize: 11, color: '#8C8A87', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cluster cards ────────────────────────────── */}
      <section id="clusters" style={{ padding: '56px 24px 80px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Where to go this {seasonMeta.label.toLowerCase()}
          </div>
          <h2 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 'clamp(20px, 3vw, 28px)',
            fontWeight: 700, letterSpacing: '-0.02em', color: '#1C1C1A',
            marginBottom: 8,
          }}>
            Pick a region, then choose your spot
          </h2>
          <p style={{ fontSize: 13, color: '#8C8A87', lineHeight: 1.6 }}>
            Tap any region to see specific places inside it — real drive times and what each one is actually good for.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {clusters.map((cluster) => (
            <ClusterRow
              key={cluster.id}
              cluster={cluster}
              season={season}
              expanded={expandedCluster === cluster.id}
              onToggle={() => toggleCluster(cluster.id)}
              onPlan={planSubDest}
            />
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '20px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        background: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogoMark size={24} />
          <span style={{ fontSize: 12, color: '#8C8A87' }}>Unplanned Escapes — Victorian weekend getaways</span>
        </div>
        <div style={{ fontSize: 11, color: '#8C8A87' }}>Maps © OpenStreetMap · © CARTO</div>
      </footer>

    </div>
  )
}

// ── Cluster row (collapsible) ───────────────────────────────────────

function ClusterRow({
  cluster, season, expanded, onToggle, onPlan,
}: {
  cluster: VicCluster
  season: string
  expanded: boolean
  onToggle: () => void
  onPlan: (cluster: VicCluster, sub: SubDest) => void
}) {
  const score = cluster.seasonalScores[season as keyof typeof cluster.seasonalScores]
  const isGreat = score >= 9
  const isGood = score >= 7

  return (
    <div style={{
      borderRadius: 14,
      background: '#fff',
      border: `1px solid ${expanded ? 'var(--border-strong)' : 'var(--border)'}`,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Row header — always visible */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          padding: '16px 20px', gap: 16,
          background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Gradient swatch */}
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${cluster.gradientFrom}, ${cluster.gradientTo})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {cluster.image}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1A', letterSpacing: '-0.02em' }}>
              {cluster.name}
            </span>
            {isGreat && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: GREEN,
                background: `${GREEN}12`, border: `1px solid ${GREEN}25`,
                padding: '1px 7px', borderRadius: 6, letterSpacing: '0.03em',
              }}>
                ✦ Perfect now
              </span>
            )}
            {!isGreat && isGood && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#8C8A87',
                background: 'var(--bg-muted)', padding: '1px 7px', borderRadius: 6,
              }}>
                Good now
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#8C8A87' }}>
              🚗 {cluster.driveTimeRange} from Melbourne
            </span>
            <span style={{ fontSize: 12, color: '#C8C4BD' }}>·</span>
            <span style={{ fontSize: 12, color: '#8C8A87' }}>
              {cluster.subDests.length} places to explore
            </span>
          </div>
        </div>

        {/* Theme pills — desktop only */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap', maxWidth: 240 }}>
          {cluster.themes.slice(0, 3).map((t) => (
            <span key={t} style={{
              fontSize: 11, color: '#8C8A87',
              background: 'var(--bg-muted)',
              padding: '3px 8px', borderRadius: 6, fontWeight: 500,
            }}>
              {t}
            </span>
          ))}
        </div>

        {/* Chevron */}
        <div style={{
          color: '#8C8A87', fontSize: 16, flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>
          ↓
        </div>
      </button>

      {/* Expanded sub-destinations */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Tagline */}
          <div style={{ padding: '12px 20px 0', fontSize: 13, color: '#4A4948', lineHeight: 1.6 }}>
            {cluster.tagline}
          </div>

          {/* Sub-destination cards */}
          <div style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cluster.subDests.map((sub) => (
              <SubDestCard key={sub.id} sub={sub} onPlan={() => onPlan(cluster, sub)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-destination card ────────────────────────────────────────────

function SubDestCard({ sub, onPlan }: { sub: SubDest; onPlan: () => void }) {
  const [showActivities, setShowActivities] = useState(false)
  const originCoord = useAppStore((s) => s.originCoord)
  const originName = useAppStore((s) => s.originName)

  const { distanceBetween } = useDriveDist()
  const driveKm = Math.round(distanceBetween(originCoord, sub.coord) * 1.3)
  const driveHrs = driveKm / 80
  const driveLabel = driveHrs < 1
    ? `${Math.round(driveHrs * 60)} min from ${originName}`
    : driveHrs < 2
      ? `${driveHrs.toFixed(1)} hr from ${originName}`
      : `${driveHrs.toFixed(1)} hrs from ${originName}`

  const hrsNum = driveHrs
  const displayHrs = hrsNum < 1
    ? `${Math.round(hrsNum * 60)}`
    : hrsNum.toFixed(hrsNum === Math.floor(hrsNum) ? 0 : 1)

  const activities = getActivitiesForSubDest(sub.id)
  const hasActivities = activities.length > 0

  return (
    <div style={{
      borderRadius: 10,
      background: 'var(--bg-base)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Drive time badge */}
        <div style={{
          flexShrink: 0,
          minWidth: 70, textAlign: 'center',
          padding: '8px 6px',
          borderRadius: 8,
          background: '#fff',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1C1C1A', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {displayHrs}
          </div>
          <div style={{ fontSize: 9, color: '#8C8A87', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {hrsNum < 1 ? 'min' : 'hrs'}
          </div>
          <div style={{ fontSize: 9, color: '#C8C4BD', marginTop: 2 }}>{driveKm} km</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A', letterSpacing: '-0.01em' }}>
              {sub.name}
            </span>
            <span style={{ fontSize: 11, color: '#8C8A87' }}>{driveLabel}</span>
          </div>

          {/* Highlights (shown when activities not expanded) */}
          {!showActivities && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {sub.highlights.map((h) => (
                <li key={h} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#4A4948', lineHeight: 1.5 }}>
                  <span style={{ color: GREEN, flexShrink: 0, marginTop: 1 }}>·</span>
                  {h}
                </li>
              ))}
            </ul>
          )}

          {/* Theme pills + activities toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
            {sub.themes.map((t) => (
              <span key={t} style={{
                fontSize: 10, color: '#8C8A87',
                background: '#fff', border: '1px solid var(--border)',
                padding: '2px 7px', borderRadius: 5, fontWeight: 500,
              }}>{t}</span>
            ))}
            {hasActivities && (
              <button
                onClick={() => setShowActivities((v) => !v)}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 11, color: GREEN, cursor: 'pointer',
                  fontWeight: 600, padding: '2px 0', marginLeft: 'auto',
                  textDecoration: 'underline', textDecorationColor: `${GREEN}50`,
                }}>
                {showActivities ? 'Hide' : `What's here →`}
              </button>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onPlan}
          style={{
            flexShrink: 0, alignSelf: 'flex-start',
            padding: '8px 14px', borderRadius: 8,
            background: `${GREEN}12`,
            border: `1px solid ${GREEN}30`,
            color: GREEN, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = `${GREEN}22`)}
          onMouseLeave={(e) => (e.currentTarget.style.background = `${GREEN}12`)}
        >
          Let's plan →
        </button>
      </div>

      {/* Activities panel */}
      {showActivities && hasActivities && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8C8A87', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Things to do
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activities.map((act) => (
              <ActivityRow key={act.id} activity={act} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityRow({ activity: act }: { activity: Activity }) {
  const costColour = act.cost === 'free' ? '#3A6B4F' : act.cost === '$' ? '#8C8A87' : act.cost === '$$' ? '#B87333' : '#C94040'
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '8px 10px', borderRadius: 8,
      background: act.isHiddenGem ? '#FFF8F0' : 'var(--bg-base)',
      border: `1px solid ${act.isHiddenGem ? '#E8C89880' : 'var(--border)'}`,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>{act.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1A' }}>{act.name}</span>
          {act.isHiddenGem && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#B87333',
              background: '#FFF0D8', border: '1px solid #E8C89880',
              padding: '1px 6px', borderRadius: 5,
            }}>💎 Hidden gem</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#4A4948', lineHeight: 1.5, marginTop: 2 }}>{act.description}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#8C8A87' }}>⏱ {act.duration}</span>
          <span style={{ fontSize: 11, color: costColour, fontWeight: 600 }}>
            {act.cost === 'free' ? 'Free' : act.cost}
          </span>
          {!act.kidsOk && (
            <span style={{ fontSize: 11, color: '#8C8A87' }}>🔞 Adults</span>
          )}
          <a
            href={act.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, color: '#4285F4', fontWeight: 600,
              textDecoration: 'none', marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            Google Maps ↗
          </a>
        </div>
      </div>
    </div>
  )
}

// Hook to access distanceBetween without circular imports
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
