import { GREEN } from '@/lib/brand'
import { useState, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { VicCluster, SubDest } from '@/data/victorianClusters.ts'
import { useActivities } from '@/hooks/useActivities'
import { DestinationModal } from './DestinationModal'
import { searchOrigin, featureLabel, type PhotonFeature } from './photonSearch'

// ── From-where modal ─────────────────────────────────────────────────

export function FromWhereModal({
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

// ── Big cluster card with backdrop image ────────────────────────────

export function ClusterCard({
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
            loading="lazy"
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
              padding: '6px 14px', borderRadius: 20,
              background: i === selectedSubIdx ? 'var(--green)' : 'var(--bg-base)',
              color: i === selectedSubIdx ? '#fff' : 'var(--text-secondary)',
              border: `2px solid ${i === selectedSubIdx ? 'var(--green)' : 'var(--border)'}`,
              fontSize: 12, fontWeight: 600,
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
