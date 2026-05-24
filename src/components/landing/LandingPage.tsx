import { useAppStore } from '@/store/useAppStore'
import type { PreselectedDest } from '@/store/useAppStore'
import type { Coordinate } from '@/types'

// ── Featured destination data ─────────────────────────────────────

interface FeaturedRoute {
  corridorId: string
  name: string
  state: string
  emoji: string
  tagline: string
  stats: string[]
  gradient: string
  glowColor: string
  textAccent: string
  destCoord: Coordinate
}

const FEATURED: FeaturedRoute[] = [
  {
    corridorId: 'great-ocean-road',
    name: 'Great Ocean Road',
    state: 'Victoria',
    emoji: '🌊',
    tagline: 'Clifftop drama, the Twelve Apostles, and ancient rainforest — all in one iconic drive.',
    stats: ['243 km', 'Sealed road', 'Scenic 10/10'],
    gradient: 'linear-gradient(150deg, #0c3460 0%, #0b5e47 60%, #072e23 100%)',
    glowColor: 'rgba(11, 94, 71, 0.4)',
    textAccent: '#4ecca3',
    destCoord: { lng: 143.39, lat: -38.65 },
  },
  {
    corridorId: 'explorers-way',
    name: "Explorer's Way",
    state: 'SA → NT',
    emoji: '🏜️',
    tagline: 'Adelaide to Darwin through the Red Centre — Uluru, Kings Canyon, and the Outback sky.',
    stats: ['2,834 km', 'Sealed highway', '10–14 days'],
    gradient: 'linear-gradient(150deg, #7a2c0a 0%, #3d1505 60%, #1a0805 100%)',
    glowColor: 'rgba(180, 83, 9, 0.4)',
    textAccent: '#fb923c',
    destCoord: { lng: 133.87, lat: -23.70 },
  },
  {
    corridorId: 'gibb-river-road',
    name: 'Gibb River Road',
    state: 'Western Australia',
    emoji: '🪨',
    tagline: 'Raw Kimberley gorges, ancient Aboriginal art sites, and crocodile country for serious adventurers.',
    stats: ['660 km', '4WD required', 'Remote & wild'],
    gradient: 'linear-gradient(150deg, #3d1a08 0%, #1a3d1a 60%, #0d2010 100%)',
    glowColor: 'rgba(120, 60, 20, 0.4)',
    textAccent: '#a3e635',
    destCoord: { lng: 126.80, lat: -16.46 },
  },
  {
    corridorId: 'grand-pacific-drive',
    name: 'Grand Pacific Drive',
    state: 'New South Wales',
    emoji: '🌉',
    tagline: "Sea Cliff Bridge, surf beaches, and sea stacks — Sydney's most beautiful coastal escape.",
    stats: ['140 km', 'Sealed road', '1–2 days'],
    gradient: 'linear-gradient(150deg, #0a2a4a 0%, #0a3a6a 50%, #061a30 100%)',
    glowColor: 'rgba(10, 58, 106, 0.4)',
    textAccent: '#60a5fa',
    destCoord: { lng: 150.87, lat: -34.22 },
  },
  {
    corridorId: 'savannah-way',
    name: 'Savannah Way',
    state: 'QLD → NT → WA',
    emoji: '🌾',
    tagline: 'Cairns to Broome across tropical Australia — 3,700 km of savannah, gorges, and vast skies.',
    stats: ['3,700 km', 'Partly gravel', '3–4 weeks'],
    gradient: 'linear-gradient(150deg, #1a3d0a 0%, #4a3010 60%, #1a1a08 100%)',
    glowColor: 'rgba(100, 80, 20, 0.4)',
    textAccent: '#facc15',
    destCoord: { lng: 145.77, lat: -16.92 },
  },
  {
    corridorId: 'explorers-way',
    name: 'Alpine Way',
    state: 'NSW / VIC',
    emoji: '⛷️',
    tagline: "Kosciuszko, Thredbo village, and stunning alpine meadows on Australia's rooftop.",
    stats: ['180 km', 'Sealed (snow season)', '2–3 days'],
    gradient: 'linear-gradient(150deg, #1a2a4a 0%, #2a3a5a 50%, #101828 100%)',
    glowColor: 'rgba(100, 130, 200, 0.3)',
    textAccent: '#a5b4fc',
    destCoord: { lng: 148.27, lat: -36.45 },
  },
]

// ── Logo (shared with wizard) ────────────────────────────────────

function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="8" r="5" fill="#f59e0b" />
      <path d="M8 46 L24 8 L40 46" stroke="#f59e0b" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
      <path d="M24 8 L24 46" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 4" />
      <line x1="11" y1="38" x2="37" y2="38" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <line x1="14" y1="28" x2="34" y2="28" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      <line x1="18" y1="18" x2="30" y2="18" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
    </svg>
  )
}

// ── Main landing page ────────────────────────────────────────────

export function LandingPage() {
  const { setWizardOpen, setPreselectedDest, setTripPlanState } = useAppStore()

  const openWizard = () => {
    setPreselectedDest(null)
    setWizardOpen(true)
  }

  const planRoute = (route: FeaturedRoute) => {
    const preset: PreselectedDest = {
      corridorId: route.corridorId,
      destName: route.name,
      destCoord: route.destCoord,
    }
    setPreselectedDest(preset)
    setTripPlanState({
      selectedCorridorId: route.corridorId,
      destName: route.name,
      destId: route.corridorId,
    })
    setWizardOpen(true)
  }

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--bg-deep)',
      color: 'var(--text-primary)',
    }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px',
        background: 'rgba(6,13,26,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={32} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>RouteAU</div>
            <div style={{ fontSize: 9, color: 'var(--amber-dim)', letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase' }}>Road Trip Planner</div>
          </div>
        </div>
        <button onClick={openWizard} style={{
          padding: '9px 20px', borderRadius: 10,
          background: 'var(--amber)', border: 'none',
          color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          letterSpacing: '-0.01em',
        }}>
          Plan a Trip →
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative',
        minHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px 60px',
        overflow: 'hidden',
      }}>
        {/* Background radials */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.05) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99,102,241,0.04) 0%, transparent 50%)
          `,
        }} />

        {/* Road lines (decorative) */}
        <svg style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', opacity: 0.06, pointerEvents: 'none' }}
          width="600" height="300" viewBox="0 0 600 300">
          <path d="M300 0 L50 300" stroke="white" strokeWidth="2" strokeDasharray="12 8" />
          <path d="M300 0 L550 300" stroke="white" strokeWidth="2" strokeDasharray="12 8" />
          <path d="M300 0 L300 300" stroke="white" strokeWidth="1.5" strokeDasharray="8 6" />
        </svg>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700 }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 20, marginBottom: 28,
            background: 'var(--amber-glow)',
            border: '1px solid var(--amber-dim)',
            fontSize: 12, fontWeight: 700, color: 'var(--amber)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span>✦</span> Australia's Offline Road Trip Planner
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            marginBottom: 24,
            color: 'var(--text-primary)',
          }}>
            Your next epic<br />
            <span style={{ color: 'var(--amber)' }}>road trip,</span><br />
            perfectly planned.
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: 40,
            maxWidth: 540,
            margin: '0 auto 40px',
          }}>
            From the coast to the outback. Build a complete itinerary with real fuel stops,
            wildlife alerts, hour-by-hour schedules, and maps that work with zero bars.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={openWizard} style={{
              padding: '16px 36px', borderRadius: 14,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none', color: '#000',
              fontSize: 16, fontWeight: 800, cursor: 'pointer',
              letterSpacing: '-0.02em',
              boxShadow: '0 8px 32px rgba(245,158,11,0.35)',
            }}>
              🗺️ Start Planning
            </button>
            <button onClick={() => document.getElementById('destinations')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                padding: '16px 28px', borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 15,
                fontWeight: 600, cursor: 'pointer',
              }}>
              Browse routes ↓
            </button>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: 32, justifyContent: 'center',
            marginTop: 56, flexWrap: 'wrap',
          }}>
            {[
              { val: '6', label: 'Iconic corridors' },
              { val: '70+', label: 'Destinations' },
              { val: '100%', label: 'Offline capable' },
              { val: '0', label: 'API keys needed' },
            ].map(({ val, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--amber)', letterSpacing: '-0.03em' }}>{val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Destination Cards ── */}
      <section id="destinations" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Popular Routes
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 12 }}>
            Where will the road take you?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
            Every route is offline-capable with real fuel stops, safety alerts, and a daily schedule built around how far you want to drive.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {FEATURED.map((route) => (
            <DestinationCard key={route.corridorId + route.name} route={route} onPlan={planRoute} />
          ))}
        </div>
      </section>

      {/* ── Why RouteAU ── */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Built for Australia
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              Not your average maps app.
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {[
              {
                icon: '📡',
                title: 'Offline in the outback',
                desc: 'Maps, routes, and your full itinerary cached locally. Works with zero mobile signal — because Australia.',
              },
              {
                icon: '⛽',
                title: 'Fuel gap detection',
                desc: 'Calculates your vehicle\'s safe range and warns you before gaps between bowsers. Mandatory jerry can alerts.',
              },
              {
                icon: '🦘',
                title: 'Wildlife dusk alerts',
                desc: 'Kangaroos and wombats peak at dusk. We detect when you\'re driving remote highways near sunset and warn you.',
              },
              {
                icon: '🕐',
                title: 'Hour-by-hour schedule',
                desc: 'Breakfast stops, hike times, lunch spots, sunset viewing, dinner and stargazing — built around your driving day.',
              },
              {
                icon: '🌡️',
                title: 'Weather guardrails',
                desc: 'Extreme heat warnings (>42°C) and flash flood risk on dirt tracks fetched from Open-Meteo, cached offline.',
              },
              {
                icon: '🚁',
                title: 'RFDS emergency layer',
                desc: 'Royal Flying Doctor Service bases plotted on your map. Nearest base shown when you\'re in remote country.',
              },
            ].map((f) => (
              <div key={f.title} style={{
                padding: '24px 20px',
                borderRadius: 16,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.01em' }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roadtrip blurb ── */}
      <section style={{ padding: '80px 24px', maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🛣️</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 20 }}>
          Australian road trips are unlike anything else.
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
          A thousand kilometres between fuel stops. Kangaroos at dusk. Dirt tracks that require
          a recovery board and a prayer. The kind of silence you've never heard. And then — just
          when you think you're completely alone — a pub in the middle of absolutely nowhere,
          serving the coldest beer you've ever tasted.
        </p>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 40 }}>
          RouteAU is built for all of it. Whether you're doing the Great Ocean Road in a weekend
          or driving Adelaide to Darwin in two weeks, we'll make sure you don't run out of fuel,
          miss the good stuff, or drive into a wildlife strike zone at dusk.
        </p>
        <button onClick={openWizard} style={{
          padding: '14px 32px', borderRadius: 12,
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          border: 'none', color: '#000',
          fontSize: 15, fontWeight: 800, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
        }}>
          Build my road trip →
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '28px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={24} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>RouteAU — Australia's road trip planner</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Maps © OpenStreetMap · © CARTO · Built offline-first for Australian adventures
        </div>
      </footer>

    </div>
  )
}

// ── Destination card ─────────────────────────────────────────────

function DestinationCard({ route, onPlan }: { route: FeaturedRoute; onPlan: (r: FeaturedRoute) => void }) {
  return (
    <div style={{
      borderRadius: 20,
      overflow: 'hidden',
      border: '1px solid var(--border)',
      background: 'var(--bg-card)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'default',
    }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-4px)'
        el.style.boxShadow = `0 20px 48px ${route.glowColor}`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'none'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Gradient backdrop */}
      <div style={{
        height: 180,
        background: route.gradient,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '16px 20px',
      }}>
        {/* Big emoji backdrop */}
        <div style={{
          position: 'absolute', top: 16, right: 20,
          fontSize: 64, opacity: 0.25, lineHeight: 1,
          filter: 'saturate(0) brightness(2)',
        }}>
          {route.emoji}
        </div>
        {/* Gradient overlay for text */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>{route.emoji}</span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: route.textAccent,
              background: `${route.textAccent}22`,
              border: `1px solid ${route.textAccent}44`,
              padding: '2px 8px', borderRadius: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {route.state}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {route.name}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 20px 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
          {route.tagline}
        </p>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {route.stats.map((s) => (
            <span key={s} style={{
              fontSize: 11, color: 'var(--text-secondary)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              padding: '3px 8px', borderRadius: 6,
              fontWeight: 500,
            }}>
              {s}
            </span>
          ))}
        </div>

        <button
          onClick={() => onPlan(route)}
          style={{
            width: '100%', padding: '11px', borderRadius: 10,
            background: `${route.textAccent}18`,
            border: `1px solid ${route.textAccent}44`,
            color: route.textAccent,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.15s',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = `${route.textAccent}28`)}
          onMouseLeave={(e) => (e.currentTarget.style.background = `${route.textAccent}18`)}
        >
          Plan this route →
        </button>
      </div>
    </div>
  )
}
