import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { PreselectedDest } from '@/store/useAppStore'
import { getCurrentSeason, SEASON_META } from '@/utils/season'
import type { VicCluster, SubDest } from '@/data/victorianClusters'
import { useClusters } from '@/hooks/useClusters'
import { useActivities } from '@/hooks/useActivities'
import { LogoMark } from '@/components/layout/Header'
import { DestinationModal } from './DestinationModal'

const GREEN = '#3A6B4F'

const season = getCurrentSeason()
const seasonMeta = SEASON_META[season]

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

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        borderRadius: 14,
        background: '#fff',
        border: '2px solid rgba(255,255,255,0.6)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', paddingLeft: 16,
          color: '#8C8A87', fontSize: 18, flexShrink: 0,
        }}>
          📍
        </div>
        <input
          type="text"
          placeholder={`Travelling from ${originName}…`}
          value={chosen ? query : query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (query.length >= 2) searchOrigin(query).then(setSuggestions) }}
          style={{
            flex: 1, padding: '16px 14px',
            border: 'none', outline: 'none',
            fontSize: 15, color: '#1C1C1A',
            background: 'transparent',
          }}
        />
        <button
          onClick={onOpenWizard}
          style={{
            flexShrink: 0,
            padding: '0 22px',
            background: GREEN, border: 'none',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '-0.01em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2d5440')}
          onMouseLeave={(e) => (e.currentTarget.style.background = GREEN)}
        >
          {loading ? '…' : "Let's plan →"}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 6, borderRadius: 12,
          background: '#fff', border: '1px solid var(--border)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          zIndex: 100, overflow: 'hidden',
        }}>
          {suggestions.map((f, i) => (
            <button
              key={i}
              onClick={() => pick(f)}
              style={{
                width: '100%', padding: '11px 18px',
                background: 'none', border: 'none',
                textAlign: 'left', cursor: 'pointer',
                fontSize: 14, color: '#1C1C1A',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-muted)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
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
  )
}

// ── Main landing page ─────────────────────────────────────────────────

export function LandingPage() {
  const { clusters: rawClusters } = useClusters()
  const clusters = [...rawClusters].sort(
    (a, b) => (b.seasonalScores[season] ?? 0) - (a.seasonalScores[season] ?? 0)
  )
  const { setWizardOpen, setPreselectedDest, setTripPlanState, setOriginSet } = useAppStore()

  const handleOriginSelect = (name: string, coord: { lng: number; lat: number }) => {
    setTripPlanState({ originName: name, originCoord: coord })
    setOriginSet(true)
  }

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
    }}>

      {/* ── Nav ─────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 56,
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
              color: '#1C1C1A', lineHeight: 1.15, letterSpacing: '-0.02em',
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

      {/* ── Hero ──────────────────────────── */}
      <section style={{
        padding: '72px 24px 60px',
        textAlign: 'center',
        background: `linear-gradient(170deg, ${seasonMeta.palette.from}14 0%, transparent 60%)`,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 32 }}>
          <LogoMark size={56} />
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700,
              color: '#1C1C1A', lineHeight: 1.1, letterSpacing: '-0.03em',
            }}>
              Unplanned<span style={{ color: GREEN }}> Escapes</span>
            </div>
            <div style={{ fontSize: 11, color: '#8C8A87', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginTop: 3 }}>
              Victorian weekend getaways
            </div>
          </div>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 20,
          background: `${seasonMeta.palette.from}12`,
          border: `1px solid ${seasonMeta.palette.from}30`,
          fontSize: 11, fontWeight: 700, color: seasonMeta.palette.from,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20,
        }}>
          {seasonMeta.label} in Victoria
        </div>

        <h1 style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 'clamp(28px, 5vw, 56px)',
          fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
          color: '#1C1C1A', maxWidth: 640, margin: '0 auto 16px',
        }}>
          {seasonMeta.headline}
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 1.8vw, 17px)',
          color: '#4A4948', lineHeight: 1.7,
          maxWidth: 500, margin: '0 auto 36px',
        }}>
          {seasonMeta.sub}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <OriginSearchBox onSelect={handleOriginSelect} onOpenWizard={openWizard} />
          <button
            onClick={() => document.getElementById('clusters')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              background: 'none', border: 'none',
              color: '#8C8A87', fontSize: 13, cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: 'var(--border)',
              padding: '4px 8px',
            }}>
            or browse destinations ↓
          </button>
        </div>

        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
          {[
            { val: '12', label: 'regions' },
            { val: '35+', label: 'specific spots' },
            { val: '60+', label: 'local experiences' },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, fontWeight: 700, color: GREEN }}>{val}</div>
              <div style={{ fontSize: 11, color: '#8C8A87', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cluster cards grid ────────────── */}
      <section id="clusters" style={{ padding: '56px 24px 100px', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            {seasonMeta.label} recommendations
          </div>
          <h2 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 700, letterSpacing: '-0.02em', color: '#1C1C1A', marginBottom: 8,
          }}>
            Choose a region, then select your destination
          </h2>
          <p style={{ fontSize: 13, color: '#8C8A87', lineHeight: 1.6 }}>
            Drive times are calculated from your location. Select any destination to view what's there and start planning.
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
                  style={{
                    width: '100%', padding: '10px 16px',
                    background: 'none', border: 'none', textAlign: 'left',
                    cursor: 'pointer', fontSize: 14, color: '#1C1C1A',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
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
            transition: 'all 0.15s', letterSpacing: '-0.01em',
          }}
          onMouseEnter={(e) => { if (chosen) e.currentTarget.style.background = '#2d5440' }}
          onMouseLeave={(e) => { if (chosen) e.currentTarget.style.background = GREEN }}
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
  const score = cluster.seasonalScores[season as keyof typeof cluster.seasonalScores]
  const isGreat = score >= 9
  const isGood = score >= 7
  const selectedSub = cluster.subDests[selectedSubIdx]

  return (
    <div style={{
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
          {cluster.driveTimeRange} from Melbourne
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
            style={{
              padding: '6px 13px', borderRadius: 8,
              background: i === selectedSubIdx ? GREEN : 'var(--bg-base)',
              color: i === selectedSubIdx ? '#fff' : '#4A4948',
              border: `1.5px solid ${i === selectedSubIdx ? GREEN : 'var(--border)'}`,
              fontSize: 12, fontWeight: i === selectedSubIdx ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s',
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
          style={{
            flex: 1,
            padding: '9px 0', borderRadius: 9,
            background: 'var(--bg-base)',
            border: '1.5px solid var(--border)',
            color: '#4A4948', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#edecea')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-base)')}
        >
          What's here
        </button>
        <button
          onClick={handlePlanClick}
          style={{
            flex: 2,
            padding: '10px 0', borderRadius: 9,
            background: GREEN, border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'background 0.15s',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2d5440')}
          onMouseLeave={(e) => (e.currentTarget.style.background = GREEN)}
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
