import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useItineraryBuilder } from '@/hooks/useItineraryBuilder'
import { POPULAR_ROUTES } from '@/data/destinations'
import type {
  TripType, CrewType, VehicleType, FuelType,
  AccommodationPreference, VibeTag, DiningPref, Coordinate,
} from '@/types'

// ── Photon geocoder types ────────────────────────────────────────
interface PhotonFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    name?: string
    city?: string
    county?: string
    state?: string
    country?: string
    countrycode?: string
    osm_id: number
    osm_type: string
    postcode?: string
  }
}

interface GeoResult {
  id: string
  name: string
  detail: string
  coord: Coordinate
}

const DEFAULT_PLACES: GeoResult[] = [
  { id: 'melbourne',  name: 'Melbourne',  detail: 'Victoria',              coord: { lng: 144.9631, lat: -37.8136 } },
  { id: 'sydney',     name: 'Sydney',     detail: 'New South Wales',       coord: { lng: 151.2093, lat: -33.8688 } },
  { id: 'brisbane',   name: 'Brisbane',   detail: 'Queensland',            coord: { lng: 153.0260, lat: -27.4698 } },
  { id: 'adelaide',   name: 'Adelaide',   detail: 'South Australia',       coord: { lng: 138.6007, lat: -34.9285 } },
  { id: 'perth',      name: 'Perth',      detail: 'Western Australia',     coord: { lng: 115.8605, lat: -31.9505 } },
  { id: 'darwin',     name: 'Darwin',     detail: 'Northern Territory',    coord: { lng: 130.8456, lat: -12.4634 } },
  { id: 'uluru',      name: 'Uluru',      detail: 'Northern Territory',    coord: { lng: 131.0369, lat: -25.3444 } },
  { id: 'cairns',     name: 'Cairns',     detail: 'Queensland',            coord: { lng: 145.7753, lat: -16.9186 } },
  { id: 'gold-coast', name: 'Gold Coast', detail: 'Queensland',            coord: { lng: 153.4000, lat: -28.0167 } },
  { id: 'hobart',     name: 'Hobart',     detail: 'Tasmania',              coord: { lng: 147.3272, lat: -42.8821 } },
]

// ── Logo ────────────────────────────────────────────────────────
function RouteAULogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="8" r="5" fill="#f59e0b" />
      <path d="M8 46 L24 8 L40 46" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
      <path d="M24 8 L24 46" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 4" />
      <line x1="11" y1="38" x2="37" y2="38" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <line x1="14" y1="28" x2="34" y2="28" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      <line x1="18" y1="18" x2="30" y2="18" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
    </svg>
  )
}

// ── Live Photon geocoder input ───────────────────────────────────
function DestinationInput({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (id: string, name: string, coord: Coordinate) => void
  placeholder: string
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<GeoResult[]>(DEFAULT_PLACES)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim() || query.length < 2) {
      setResults(DEFAULT_PLACES)
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=10&bbox=112,-44,154,-10`
        const res = await fetch(url)
        const data = await res.json() as { features: PhotonFeature[] }
        const mapped: GeoResult[] = (data.features ?? [])
          .filter((f) => {
            const cc = f.properties.countrycode?.toUpperCase()
            const country = f.properties.country
            return cc === 'AU' || country === 'Australia'
          })
          .map((f) => {
            const p = f.properties
            const [lng, lat] = f.geometry.coordinates
            const parts = [p.city ?? p.county, p.state].filter(Boolean)
            const detail = parts.join(', ') || 'Australia'
            return {
              id: `osm-${p.osm_id}`,
              name: p.name || p.city || p.county || 'Place',
              detail,
              coord: { lng, lat },
            }
          })
        setResults(mapped.length > 0 ? mapped : DEFAULT_PLACES)
      } catch {
        setResults(DEFAULT_PLACES)
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          className="input-field"
          value={query}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          style={{ paddingRight: loading ? 40 : undefined }}
        />
        {loading && (
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16,
            border: '2px solid var(--amber)', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin-slow 0.7s linear infinite',
          }} />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="dest-dropdown">
          {!query.trim() && (
            <div style={{ padding: '6px 14px 4px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Popular cities
            </div>
          )}
          {results.map((r) => (
            <div
              key={r.id}
              className="dest-item"
              onMouseDown={() => {
                onChange(r.id, r.name, r.coord)
                setQuery(r.name)
                setOpen(false)
              }}
            >
              <span style={{ fontSize: 16 }}>📍</span>
              <div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step progress bar ───────────────────────────────────────────
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6,
          height: 6,
          borderRadius: 3,
          background: i <= current ? 'var(--amber)' : 'rgba(255,255,255,0.1)',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  )
}

// ── Main wizard ─────────────────────────────────────────────────
export function ProfileWizard() {
  const { isWizardOpen, setWizardOpen, setUserProfile, setVehicleProfile, setTripPlanState, setMapView } = useAppStore()
  const { buildItinerary } = useItineraryBuilder()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)

  // Step 0
  const [tripType, setTripTypeLocal] = useState<TripType>('day')

  // Step 1
  const [originId, setOriginId] = useState('melbourne')
  const [originName, setOriginName] = useState('Melbourne')
  const [_originCoord, setOriginCoord] = useState<Coordinate>({ lng: 144.9631, lat: -37.8136 })
  const [destId, setDestId] = useState('twelve-apostles')
  const [destName, setDestName] = useState('12 Apostles')
  const [destCoord, setDestCoord] = useState<Coordinate>({ lng: 142.9960, lat: -38.6631 })
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [dailyDriveHours, setDailyDriveHours] = useState(5)

  // Step 2
  const [crewType, setCrewType] = useState<CrewType>('couple')
  const [hasKids, setHasKids] = useState(false)
  const [vehicleType, setVehicleType] = useState<VehicleType>('AWD')
  const [fuelType, setFuelType] = useState<FuelType>('Unleaded95')
  const [fuelCapacity, setFuelCapacity] = useState(65)
  const [fuelConsumption, setFuelConsumption] = useState(10)
  const [isTowing, setIsTowing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Step 3
  const [vibes, setVibes] = useState<VibeTag[]>(['Lookouts', 'Chilling'])
  const [diningPrefs, setDiningPrefs] = useState<DiningPref[]>(['Cafes', 'LocalPubs'])
  const [accommodation, setAccommodation] = useState<AccommodationPreference>('Any')

  const TOTAL_STEPS = 4

  if (!isWizardOpen) return null

  const toggleVibes = (tag: VibeTag) =>
    setVibes((p) => p.includes(tag) ? p.filter((v) => v !== tag) : [...p, tag])
  const toggleDining = (p: DiningPref) =>
    setDiningPrefs((prev) => prev.includes(p) ? prev.filter((d) => d !== p) : [...prev, p])

  const handleBack = () => setStep((s) => Math.max(0, s - 1))

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1)
      return
    }
    // Final step — generate
    setGenerating(true)
    const genMessages = ['Mapping your route…', 'Discovering stops…', 'Running safety checks…', 'Building your schedule…', 'Almost ready…']
    for (let i = 0; i < genMessages.length; i++) {
      setGenStep(i)
      await new Promise((r) => setTimeout(r, 480))
    }

    const user = {
      id: 'user-1',
      max_daily_drive_time: dailyDriveHours * 60,
      preferred_vibe: vibes,
      accommodation_preference: accommodation,
      off_grid_capability: { water_capacity_liters: 40, auxiliary_battery_days: 3 },
      party_size: crewType === 'solo' ? 1 : crewType === 'couple' ? 2 : crewType === 'family' ? 4 : 6,
      trip_type: tripType,
      crew_type: crewType,
      has_kids: hasKids,
      dining_prefs: diningPrefs,
    }
    const vehicle = {
      id: 'vehicle-1',
      type: vehicleType,
      clearance_height_meters: vehicleType === 'HighClearance4WD' || vehicleType === '4WD_WithCaravan' ? 2.4 : 1.8,
      fuel_type: fuelType,
      fuel_capacity_liters: fuelCapacity,
      fuel_consumption_litres_per_100km: fuelConsumption,
      is_towing: isTowing,
    }

    setUserProfile(user)
    setVehicleProfile(vehicle)
    setTripPlanState({
      tripType, originId, destId, originName, destName,
      startDate, endDate, dailyDriveHours, crewType, hasKids, diningPrefs,
    })

    buildItinerary(startDate, endDate, `${originName} → ${destName}`, diningPrefs)

    await new Promise((r) => setTimeout(r, 300))
    setGenerating(false)
    setWizardOpen(false)
    // Fly map to destination
    setMapView(destCoord, 8)
  }

  const canContinue = [
    true,
    !!(originId && destId && startDate && (tripType === 'day' || endDate)),
    true,
    vibes.length > 0,
  ][step]

  const stepLabels = ['Trip Type', 'Route', 'Your Ride', 'Vibe & Food']
  const genMessages = ['Mapping your route…', 'Discovering stops…', 'Running safety checks…', 'Building your schedule…', 'Almost ready…']

  return (
    <div className="wizard-overlay">
      <div className="wizard-card animate-fade-up">
        {/* Header */}
        <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RouteAULogo size={32} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>RouteAU</div>
              <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500 }}>{stepLabels[step]}</div>
            </div>
          </div>
          <ProgressDots total={TOTAL_STEPS} current={step} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {generating ? (
            <GeneratingScreen step={genStep} messages={genMessages} />
          ) : (
            <>
              {step === 0 && <StepTripType tripType={tripType} setTripType={setTripTypeLocal} />}
              {step === 1 && (
                <StepRoute
                  tripType={tripType}
                  originId={originId} originName={originName}
                  setOrigin={(id, name, coord) => { setOriginId(id); setOriginName(name); setOriginCoord(coord) }}
                  destId={destId} destName={destName}
                  setDest={(id, name, coord) => { setDestId(id); setDestName(name); setDestCoord(coord) }}
                  startDate={startDate} setStartDate={setStartDate}
                  endDate={endDate} setEndDate={setEndDate}
                  dailyDriveHours={dailyDriveHours} setDailyDriveHours={setDailyDriveHours}
                />
              )}
              {step === 2 && (
                <StepCrewVehicle
                  crewType={crewType} setCrewType={setCrewType}
                  hasKids={hasKids} setHasKids={setHasKids}
                  vehicleType={vehicleType} setVehicleType={setVehicleType}
                  fuelType={fuelType} setFuelType={setFuelType}
                  fuelCapacity={fuelCapacity} setFuelCapacity={setFuelCapacity}
                  fuelConsumption={fuelConsumption} setFuelConsumption={setFuelConsumption}
                  isTowing={isTowing} setIsTowing={setIsTowing}
                  showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced}
                />
              )}
              {step === 3 && (
                <StepVibeFood
                  vibes={vibes} toggleVibes={toggleVibes}
                  diningPrefs={diningPrefs} toggleDining={toggleDining}
                  accommodation={accommodation} setAccommodation={setAccommodation}
                  tripType={tripType}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!generating && (
          <div style={{ padding: '16px 28px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
            {step > 0 && (
              <button onClick={handleBack} style={{
                padding: '13px 20px', borderRadius: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer'
              }}>
                ← Back
              </button>
            )}
            <button onClick={handleNext} disabled={!canContinue} style={{
              flex: 1, padding: '13px 20px', borderRadius: 12,
              background: canContinue ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.05)',
              border: canContinue ? 'none' : '1px solid var(--border)',
              color: canContinue ? 'white' : 'var(--text-muted)',
              fontSize: 15, fontWeight: 600, cursor: canContinue ? 'pointer' : 'not-allowed',
              boxShadow: canContinue ? '0 4px 20px rgba(245,158,11,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>
              {step === TOTAL_STEPS - 1 ? '🗺️ Build My Trip' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 0: Trip Type ───────────────────────────────────────────
function StepTripType({ tripType, setTripType }: { tripType: TripType; setTripType: (t: TripType) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 6 }}>
          Where does the road take you?
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Plan the perfect Australian road trip — from a golden day out to a weeks-long outback adventure.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
        {([
          { type: 'day' as TripType, emoji: '☀️', title: 'Day Trip', desc: 'One perfect day of exploration and discovery' },
          { type: 'multiday' as TripType, emoji: '🏕️', title: 'Multi-Day', desc: 'Hit the road for days of open highway' },
        ] as const).map((opt) => (
          <div key={opt.type} className={`option-card ${tripType === opt.type ? 'selected' : ''}`}
            style={{ minHeight: 130, gap: 10, justifyContent: 'center' }}
            onClick={() => setTripType(opt.type)}>
            <span style={{ fontSize: 36 }}>{opt.emoji}</span>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{opt.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{opt.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>
          Popular Routes
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {POPULAR_ROUTES.slice(0, 4).map((r) => (
            <div key={r.corridor} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 10, background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)', cursor: 'pointer',
              fontSize: 13, color: 'var(--text-secondary)',
            }}>
              <span style={{ fontSize: 16 }}>🛣️</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{r.from} → {r.to}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 1: Route ───────────────────────────────────────────────
function StepRoute({ tripType, originId: _originId, originName, setOrigin, destId: _destId, destName, setDest, startDate, setStartDate, endDate, setEndDate, dailyDriveHours, setDailyDriveHours }: {
  tripType: TripType
  originId: string; originName: string; setOrigin: (id: string, name: string, coord: Coordinate) => void
  destId: string; destName: string; setDest: (id: string, name: string, coord: Coordinate) => void
  startDate: string; setStartDate: (d: string) => void
  endDate: string; setEndDate: (d: string) => void
  dailyDriveHours: number; setDailyDriveHours: (h: number) => void
}) {
  const dayCount = tripType === 'multiday' && endDate && startDate
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 6 }}>
          Plan your route
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Where are you starting and where are you headed?</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <DestinationInput label="Starting from" value={originName} onChange={setOrigin} placeholder="e.g. Melbourne, Sydney…" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 18 }}>↓</span>
          <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
        </div>
        <DestinationInput label="Going to" value={destName} onChange={setDest} placeholder="e.g. Great Ocean Road, Uluru…" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: tripType === 'multiday' ? '1fr 1fr' : '1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>
            {tripType === 'multiday' ? 'Start Date' : 'Date'}
          </div>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" style={{ colorScheme: 'dark' }} />
        </div>
        {tripType === 'multiday' && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>Return Date</div>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" style={{ colorScheme: 'dark' }} />
          </div>
        )}
      </div>

      {tripType === 'multiday' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Daily driving limit
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--amber)' }}>
              {dailyDriveHours}h / day
            </div>
          </div>
          <input
            type="range" min={2} max={10} step={0.5}
            value={dailyDriveHours}
            onChange={(e) => setDailyDriveHours(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--amber)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>2h (relaxed)</span><span>6h (standard)</span><span>10h (push)</span>
          </div>
        </div>
      )}

      {tripType === 'multiday' && dayCount > 1 && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13, color: 'var(--amber)' }}>
          🗓️ <strong>{dayCount}-day trip</strong> — your itinerary will be broken into {dayCount} days with {dailyDriveHours}h driving each day
        </div>
      )}
    </div>
  )
}

// ── Step 2: Crew & Vehicle ──────────────────────────────────────
function StepCrewVehicle({ crewType, setCrewType, hasKids, setHasKids, vehicleType, setVehicleType, fuelType, setFuelType, fuelCapacity, setFuelCapacity, fuelConsumption, setFuelConsumption, isTowing, setIsTowing, showAdvanced, setShowAdvanced }: {
  crewType: CrewType; setCrewType: (c: CrewType) => void
  hasKids: boolean; setHasKids: (b: boolean) => void
  vehicleType: VehicleType; setVehicleType: (v: VehicleType) => void
  fuelType: FuelType; setFuelType: (f: FuelType) => void
  fuelCapacity: number; setFuelCapacity: (n: number) => void
  fuelConsumption: number; setFuelConsumption: (n: number) => void
  isTowing: boolean; setIsTowing: (b: boolean) => void
  showAdvanced: boolean; setShowAdvanced: (b: boolean) => void
}) {
  const crews: { type: CrewType; emoji: string; label: string }[] = [
    { type: 'solo', emoji: '🧍', label: 'Solo' },
    { type: 'couple', emoji: '👫', label: 'Couple' },
    { type: 'family', emoji: '👨‍👩‍👧', label: 'Family' },
    { type: 'group', emoji: '🎉', label: 'Group' },
  ]
  const vehicles: { type: VehicleType; emoji: string; label: string; hint: string }[] = [
    { type: 'Sedan', emoji: '🚗', label: 'Sedan / Hatch', hint: 'Sealed roads only' },
    { type: 'AWD', emoji: '🚙', label: 'SUV / AWD', hint: 'Gravel ok' },
    { type: 'HighClearance4WD', emoji: '🛻', label: '4WD', hint: 'All terrain' },
    { type: '4WD_WithCaravan', emoji: '🚐', label: '4WD + Caravan', hint: 'Weight increase' },
    { type: 'Electric', emoji: '⚡', label: 'Electric', hint: 'Charging plan needed' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>Your crew & ride</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>We'll tailor fuel stops, activities, and routes to suit.</p>
      </div>

      <div>
        <Label>Who's coming?</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 8 }}>
          {crews.map((c) => (
            <div key={c.type} className={`option-card ${crewType === c.type ? 'selected' : ''}`} onClick={() => setCrewType(c.type)}
              style={{ padding: '12px 8px', gap: 6 }}>
              <span style={{ fontSize: 24 }}>{c.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{c.label}</span>
            </div>
          ))}
        </div>
        {(crewType === 'family' || crewType === 'group') && (
          <ToggleRow label="Kids on board?" value={hasKids} onChange={setHasKids} style={{ marginTop: 10 }} />
        )}
      </div>

      <div>
        <Label>Your vehicle</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 8 }}>
          {vehicles.map((v) => (
            <div key={v.type} className={`option-card ${vehicleType === v.type ? 'selected' : ''}`}
              onClick={() => setVehicleType(v.type)}
              style={{ flexDirection: 'row', alignItems: 'center', padding: '12px 14px', gap: 10, textAlign: 'left' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{v.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{v.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Fuel type</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 8 }}>
          {(['Unleaded95', 'Unleaded98', 'Diesel', 'Electric'] as FuelType[]).map((f) => (
            <div key={f} className={`option-card ${fuelType === f ? 'selected' : ''}`} onClick={() => setFuelType(f)}
              style={{ padding: '10px 8px', gap: 4 }}>
              <span style={{ fontSize: 18 }}>{f === 'Electric' ? '⚡' : f === 'Diesel' ? '🛢' : '⛽'}</span>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{f === 'Unleaded95' ? 'ULP 95' : f === 'Unleaded98' ? 'ULP 98' : f}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
        background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13,
        cursor: 'pointer', textAlign: 'left', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6
      }}>
        {showAdvanced ? '▾' : '▸'} Advanced fuel settings
      </button>

      {showAdvanced && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Tank capacity (L)</div>
            <input type="number" value={fuelCapacity} min={20} max={300} onChange={(e) => setFuelCapacity(Number(e.target.value))} className="input-field" style={{ fontSize: 14 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>L/100km</div>
            <input type="number" value={fuelConsumption} min={4} max={30} step={0.5} onChange={(e) => setFuelConsumption(Number(e.target.value))} className="input-field" style={{ fontSize: 14 }} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <ToggleRow label="Towing caravan/trailer?" value={isTowing} onChange={setIsTowing} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 3: Vibe & Food ─────────────────────────────────────────
function StepVibeFood({ vibes, toggleVibes, diningPrefs, toggleDining, accommodation, setAccommodation, tripType }: {
  vibes: VibeTag[]; toggleVibes: (t: VibeTag) => void
  diningPrefs: DiningPref[]; toggleDining: (p: DiningPref) => void
  accommodation: AccommodationPreference; setAccommodation: (a: AccommodationPreference) => void
  tripType: TripType
}) {
  const VIBES: { tag: VibeTag; emoji: string; label: string }[] = [
    { tag: 'Hiking', emoji: '🥾', label: 'Hiking' },
    { tag: 'Chilling', emoji: '🏖️', label: 'Chilling' },
    { tag: 'Lookouts', emoji: '👁️', label: 'Lookouts' },
    { tag: 'Wildlife', emoji: '🦘', label: 'Wildlife' },
    { tag: 'Stargazing', emoji: '🌌', label: 'Stargazing' },
    { tag: 'Photography', emoji: '📷', label: 'Photography' },
    { tag: 'History', emoji: '🏛️', label: 'History' },
    { tag: 'Beach', emoji: '🌊', label: 'Beach' },
  ]
  const DINING: { pref: DiningPref; emoji: string; label: string }[] = [
    { pref: 'Cafes', emoji: '☕', label: 'Cafes' },
    { pref: 'LocalPubs', emoji: '🍺', label: 'Local Pubs' },
    { pref: 'Wineries', emoji: '🍷', label: 'Wineries' },
    { pref: 'FineDining', emoji: '🍽️', label: 'Fine Dining' },
    { pref: 'Roadhouses', emoji: '🛣️', label: 'Roadhouses' },
    { pref: 'SelfCatering', emoji: '🔥', label: 'Self-Catering' },
  ]
  const STAYS: { type: AccommodationPreference; emoji: string; label: string }[] = [
    { type: 'FreeCamping', emoji: '⛺', label: 'Free Camping' },
    { type: 'CaravanPark', emoji: '🚐', label: 'Caravan Park' },
    { type: 'Glamping', emoji: '🛖', label: 'Glamping' },
    { type: 'Hotel', emoji: '🏨', label: 'Hotel' },
    { type: 'Any', emoji: '✨', label: 'Mix it up' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>What's your vibe?</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>We'll fill your itinerary with things you love.</p>
      </div>

      <div>
        <Label>Activities <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>pick all that apply</span></Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 8 }}>
          {VIBES.map((v) => (
            <div key={v.tag} className={`option-card ${vibes.includes(v.tag) ? 'selected' : ''}`}
              onClick={() => toggleVibes(v.tag)}
              style={{ padding: '12px 8px', gap: 6 }}>
              <span style={{ fontSize: 22 }}>{v.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Food & drinks</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
          {DINING.map((d) => (
            <div key={d.pref} className={`option-card ${diningPrefs.includes(d.pref) ? 'selected' : ''}`}
              onClick={() => toggleDining(d.pref)}
              style={{ padding: '12px 10px', gap: 6 }}>
              <span style={{ fontSize: 22 }}>{d.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {tripType === 'multiday' && (
        <div>
          <Label>Where do you like to stay?</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
            {STAYS.map((s) => (
              <div key={s.type} className={`option-card ${accommodation === s.type ? 'selected' : ''}`}
                onClick={() => setAccommodation(s.type)}
                style={{ padding: '12px 8px', gap: 6 }}>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Generating screen ───────────────────────────────────────────
function GeneratingScreen({ step, messages }: { step: number; messages: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 28 }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg className="spin-slow" viewBox="0 0 72 72" fill="none" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="36" cy="36" r="32" stroke="rgba(245,158,11,0.2)" strokeWidth="3" />
          <path d="M36 4 A32 32 0 0 1 68 36" stroke="var(--amber)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          🗺️
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Building your trip…</div>
        <div style={{ fontSize: 14, color: 'var(--amber)', minHeight: 20, transition: 'opacity 0.3s' }}>{messages[step]}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: i < step ? 'var(--green)' : i === step ? 'var(--amber)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', flexShrink: 0, transition: 'background 0.3s' }}>
              {i < step ? '✓' : i === step ? '…' : ''}
            </span>
            <span style={{ color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{children}</div>
}

function ToggleRow({ label, value, onChange, style }: {
  label: string; value: boolean; onChange: (b: boolean) => void; style?: React.CSSProperties
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...style }}>
      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
      <div className={`toggle-track ${value ? 'on' : ''}`}
        style={{ background: value ? 'var(--amber)' : 'rgba(255,255,255,0.1)' }}
        onClick={() => onChange(!value)}>
        <div className="toggle-thumb" />
      </div>
    </div>
  )
}
