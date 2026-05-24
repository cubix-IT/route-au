import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { DayCard } from './DayCard'
import { GuardrailBanner } from './GuardrailBanner'
import { exportGPX } from '@/utils/gpxExport'
import type { Itinerary, RouteConstraintViolation, ScoredPOI } from '@/types'

export function ItineraryPanel() {
  const {
    activeItinerary, constraintViolations, userProfile, nearbyPOIs,
    activeTab, setActiveTab, setWizardOpen,
  } = useAppStore()

  if (!userProfile) {
    return <EmptyWelcome onStart={() => setWizardOpen(true)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        {([
          ['itinerary', '📅', 'Itinerary'],
          ['pois', '📍', 'Nearby'],
          ['checklist', '✓', 'Checklist'],
        ] as const).map(([tab, icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--amber)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--amber)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'itinerary' && (
          <ItineraryTab
            itinerary={activeItinerary}
            violations={constraintViolations}
            onNewTrip={() => setWizardOpen(true)}
          />
        )}
        {activeTab === 'pois' && <NearbyTab pois={nearbyPOIs} />}
        {activeTab === 'checklist' && <ChecklistTab />}
      </div>
    </div>
  )
}

// ── Empty welcome ──────────────────────────────────────────────────

function EmptyWelcome({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🗺️</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        Welcome to RouteAU
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6, maxWidth: 260 }}>
        Australia's offline-first road trip planner. Build your perfect itinerary in minutes.
      </p>
      <button
        onClick={onStart}
        style={{
          padding: '12px 28px', borderRadius: 12,
          background: 'var(--amber)', border: 'none',
          color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}
      >
        Plan My Trip →
      </button>
    </div>
  )
}

// ── Itinerary tab ──────────────────────────────────────────────────

function ItineraryTab({
  itinerary, violations, onNewTrip,
}: {
  itinerary: Itinerary | null
  violations: RouteConstraintViolation[]
  onNewTrip: () => void
}) {
  if (!itinerary) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛣️</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
          Your itinerary will appear here once you plan a trip.
        </p>
        <button
          onClick={onNewTrip}
          style={{
            padding: '10px 24px', borderRadius: 10,
            background: 'var(--amber-glow)', border: '1px solid var(--amber-dim)',
            color: 'var(--amber)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Plan a Trip
        </button>
      </div>
    )
  }

  const totalKm = Math.round(itinerary.total_km)
  const totalHrs = Math.round(itinerary.route.estimated_drive_hours)

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Trip summary card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(10,22,40,0) 60%)',
        border: '1px solid var(--border-active)',
        borderRadius: 16, padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
              {itinerary.name}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Starting {formatDateShort(itinerary.start_date)}
              {itinerary.end_date ? ` → ${formatDateShort(itinerary.end_date)}` : ''}
            </p>
          </div>
          <button
            onClick={() => exportGPX(itinerary)}
            title="Export GPX"
            style={{
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ↓ GPX
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Stat value={`${totalKm}km`} label="Distance" />
          <Stat value={`${itinerary.total_days}d`} label={itinerary.total_days === 1 ? 'Day' : 'Days'} />
          <Stat value={`${totalHrs}h`} label="Drive time" />
          <Stat value={`${itinerary.days.reduce((n, d) => n + d.schedule.length, 0)}`} label="Stops" />
        </div>
      </div>

      {/* Constraint violations */}
      {violations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {violations.map((v) => (
            <div key={`${v.segment_id}-${v.reason}`} style={{
              fontSize: 12, color: 'var(--red)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, padding: '8px 12px',
            }}>
              ⚠ {v.detail}
            </div>
          ))}
        </div>
      )}

      {/* Mandatory global warnings */}
      {itinerary.all_warnings
        .filter((w) => w.severity === 'MANDATORY_STOP')
        .map((w) => <GuardrailBanner key={w.id} warning={w} />)
      }

      {/* Day cards */}
      {itinerary.days.map((day) => (
        <DayCard key={day.day_number} day={day} />
      ))}

      {/* Re-plan */}
      <button
        onClick={onNewTrip}
        style={{
          marginTop: 4, padding: '12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
          width: '100%',
        }}
      >
        ✦ Plan a Different Trip
      </button>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  )
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ── Nearby POIs tab ────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  Hiking: '🥾', Chilling: '🏖️', Lookouts: '👁️', Photography: '📷',
  Wildlife: '🦘', History: '🏛️', Beach: '🌊', FreeCamping: '⛺',
}

function NearbyTab({ pois }: { pois: ScoredPOI[] }) {
  if (pois.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Plan a trip to discover attractions along your route.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
        {pois.length} attractions within 30 km of your route
      </p>
      {pois.map((poi) => (
        <div key={poi.id} style={{
          display: 'flex', gap: 12, alignItems: 'flex-start',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--amber-glow)', border: '1.5px solid var(--amber-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            {CAT_EMOJI[poi.category] ?? '📍'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {poi.name}
              </span>
              {poi.vibe_score >= 70 && (
                <span style={{
                  fontSize: 10, color: 'var(--amber)', fontWeight: 700,
                  background: 'var(--amber-glow)', padding: '2px 6px', borderRadius: 4,
                  flexShrink: 0,
                }}>
                  ★ TOP
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>
              {poi.description.slice(0, 80)}{poi.description.length > 80 ? '…' : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <span style={{
                fontSize: 11, color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.05)',
                padding: '2px 6px', borderRadius: 4,
              }}>
                {poi.category}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {Math.round(poi.detour_km)} km detour
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Checklist tab ──────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { id: 'tyres', group: 'Vehicle', label: 'Check tyre pressure (incl. spare)' },
  { id: 'oil', group: 'Vehicle', label: 'Check engine oil & coolant' },
  { id: 'fuel', group: 'Vehicle', label: 'Fill fuel tank before departure' },
  { id: 'recovery', group: 'Vehicle', label: 'Recovery gear: tow rope, shovel, max trax' },
  { id: 'uhf', group: 'Communications', label: 'UHF CB radio (ch 40 for road traffic)' },
  { id: 'epirb', group: 'Communications', label: 'EPIRB or PLB activated & registered' },
  { id: 'phone', group: 'Communications', label: 'Downloaded offline maps (OsmAnd/Hema)' },
  { id: 'water', group: 'Supplies', label: 'Water: 4L per person per day minimum' },
  { id: 'food', group: 'Supplies', label: 'Food for journey + 2 emergency days' },
  { id: 'first_aid', group: 'Safety', label: 'First aid kit fully stocked' },
  { id: 'snakebite', group: 'Safety', label: 'Snakebite bandages × 3' },
  { id: 'sunscreen', group: 'Safety', label: 'SPF 50+ sunscreen, hat & sunglasses' },
  { id: 'itinerary', group: 'Admin', label: 'Trip plan lodged with someone at home' },
  { id: 'park_permit', group: 'Admin', label: 'National park permits purchased online' },
  { id: 'insurance', group: 'Admin', label: 'Vehicle & travel insurance confirmed' },
]

function ChecklistTab() {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = (id: string) => setChecked((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const groups = [...new Set(CHECKLIST_ITEMS.map((i) => i.group))]
  const total = CHECKLIST_ITEMS.length
  const done = checked.size

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 14px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Pre-trip checklist
          </span>
          <span style={{ fontSize: 13, color: done === total ? 'var(--green)' : 'var(--amber)' }}>
            {done}/{total}
          </span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
          <div style={{
            height: '100%',
            width: `${(done / total) * 100}%`,
            background: done === total ? 'var(--green)' : 'var(--amber)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {groups.map((group) => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
          }}>
            {group}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CHECKLIST_ITEMS.filter((i) => i.group === group).map((item) => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, width: '100%', textAlign: 'left',
                  background: checked.has(item.id) ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
                  border: `1px solid ${checked.has(item.id) ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: checked.has(item.id) ? 'var(--green)' : 'rgba(255,255,255,0.07)',
                  border: `1.5px solid ${checked.has(item.id) ? 'var(--green)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked.has(item.id) && (
                    <span style={{ fontSize: 12, color: '#fff', lineHeight: 1 }}>✓</span>
                  )}
                </div>
                <span style={{
                  fontSize: 13,
                  color: checked.has(item.id) ? 'var(--text-muted)' : 'var(--text-secondary)',
                  textDecoration: checked.has(item.id) ? 'line-through' : 'none',
                  flex: 1,
                }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
