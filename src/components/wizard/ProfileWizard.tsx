import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useItineraryBuilder } from '@/hooks/useItineraryBuilder'
import type {
  TripType, CrewType, VehicleType, FuelType,
  AccommodationPreference, VibeTag, DiningPref,
  HikingIntensity, DietaryReq, Coordinate,
} from '@/types'

// ── Photon geocoder types ─────────────────────────────────────────

interface PhotonFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    name?: string; city?: string; county?: string
    state?: string; country?: string; countrycode?: string
    osm_id: number; osm_type: string; postcode?: string
  }
}
interface GeoResult {
  id: string; name: string; detail: string; coord: Coordinate
}
const DEFAULT_PLACES: GeoResult[] = [
  { id: 'melbourne',  name: 'Melbourne',  detail: 'Victoria',           coord: { lng: 144.9631, lat: -37.8136 } },
  { id: 'sydney',     name: 'Sydney',     detail: 'New South Wales',    coord: { lng: 151.2093, lat: -33.8688 } },
  { id: 'brisbane',   name: 'Brisbane',   detail: 'Queensland',         coord: { lng: 153.0260, lat: -27.4698 } },
  { id: 'adelaide',   name: 'Adelaide',   detail: 'South Australia',    coord: { lng: 138.6007, lat: -34.9285 } },
  { id: 'perth',      name: 'Perth',      detail: 'Western Australia',  coord: { lng: 115.8605, lat: -31.9505 } },
  { id: 'darwin',     name: 'Darwin',     detail: 'Northern Territory', coord: { lng: 130.8456, lat: -12.4634 } },
  { id: 'uluru',      name: 'Uluru',      detail: 'Northern Territory', coord: { lng: 131.0369, lat: -25.3444 } },
  { id: 'cairns',     name: 'Cairns',     detail: 'Queensland',         coord: { lng: 145.7753, lat: -16.9186 } },
  { id: 'gold-coast', name: 'Gold Coast', detail: 'Queensland',         coord: { lng: 153.4000, lat: -28.0167 } },
  { id: 'hobart',     name: 'Hobart',     detail: 'Tasmania',           coord: { lng: 147.3272, lat: -42.8821 } },
]

// ── Live Photon geocoder ──────────────────────────────────────────

function DestinationInput({ label, value, onChange, placeholder }: {
  label: string; value: string
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
    if (!query.trim() || query.length < 2) { setResults(DEFAULT_PLACES); setLoading(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=10&bbox=112,-44,154,-10`
        const res = await fetch(url)
        const data = await res.json() as { features: PhotonFeature[] }
        const mapped = (data.features ?? [])
          .filter((f) => {
            const cc = f.properties.countrycode?.toUpperCase()
            return cc === 'AU' || f.properties.country === 'Australia'
          })
          .map((f) => {
            const p = f.properties
            const [lng, lat] = f.geometry.coordinates
            const detail = [p.city ?? p.county, p.state].filter(Boolean).join(', ') || 'Australia'
            return { id: `osm-${p.osm_id}`, name: p.name || p.city || 'Place', detail, coord: { lng, lat } }
          })
        setResults(mapped.length > 0 ? mapped : DEFAULT_PLACES)
      } catch { setResults(DEFAULT_PLACES) }
      finally { setLoading(false) }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <Label>{label}</Label>
      <div style={{ position: 'relative', marginTop: 6 }}>
        <input className="input-field" value={query} placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          style={{ paddingRight: loading ? 40 : undefined }}
        />
        {loading && (
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16, border: '2px solid var(--amber)', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin-slow 0.7s linear infinite',
          }} />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="dest-dropdown">
          {!query.trim() && (
            <div style={{ padding: '6px 14px 2px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Popular cities
            </div>
          )}
          {results.map((r) => (
            <div key={r.id} className="dest-item" onMouseDown={() => { onChange(r.id, r.name, r.coord); setQuery(r.name); setOpen(false) }}>
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

// ── Logo ──────────────────────────────────────────────────────────

function RouteAULogo({ size = 36 }: { size?: number }) {
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

// ── Progress bar ──────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6, height: 6, borderRadius: 3,
          background: i <= current ? 'var(--amber)' : 'rgba(255,255,255,0.1)',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────

export function ProfileWizard() {
  const {
    isWizardOpen, setWizardOpen,
    setUserProfile, setVehicleProfile, setTripPlanState, setMapView,
    preselectedDest, setPreselectedDest,
  } = useAppStore()
  const { buildItinerary } = useItineraryBuilder()

  // If landing page pre-selected a destination, start at step 1 (skip journey step)
  const hasPreselect = !!preselectedDest
  const [step, setStep] = useState(hasPreselect ? 1 : 0)
  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)

  // ── Step 0: The Journey ──
  const [tripType, setTripTypeLocal] = useState<TripType>('multiday')
  const [originId, setOriginId] = useState('melbourne')
  const [originName, setOriginName] = useState('Melbourne')
  const [_originCoord, setOriginCoord] = useState<Coordinate>({ lng: 144.9631, lat: -37.8136 })
  const [destId, setDestId] = useState(preselectedDest?.corridorId ?? 'twelve-apostles')
  const [destName, setDestName] = useState(preselectedDest?.destName ?? '12 Apostles')
  const [destCoord, setDestCoord] = useState<Coordinate>(
    preselectedDest?.destCoord ?? { lng: 142.996, lat: -38.663 }
  )
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [dailyDriveHours, setDailyDriveHours] = useState(5)

  // ── Step 1: Crew ──
  const [crewType, setCrewType] = useState<CrewType>('couple')
  const [hasKids, setHasKids] = useState(false)

  // ── Step 2: Vehicle ──
  const [vehicleType, setVehicleType] = useState<VehicleType>('AWD')
  const [fuelType, setFuelType] = useState<FuelType>('Unleaded95')
  const [fuelCapacity, setFuelCapacity] = useState(65)
  const [fuelConsumption, setFuelConsumption] = useState(10)
  const [isTowing, setIsTowing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ── Step 3: Interests & Table ──
  const [vibes, setVibes] = useState<VibeTag[]>(['Lookouts', 'Chilling'])
  const [hikingIntensity, setHikingIntensity] = useState<HikingIntensity>('Moderate')
  const [dietary, setDietary] = useState<DietaryReq[]>([])
  const [diningPrefs, setDiningPrefs] = useState<DiningPref[]>(['Cafes', 'LocalPubs'])
  const [accommodation, setAccommodation] = useState<AccommodationPreference>('Any')

  const TOTAL_STEPS = hasPreselect ? 3 : 4
  const stepOffset = hasPreselect ? 1 : 0 // internal step → display step

  if (!isWizardOpen) return null

  const toggleVibes = (tag: VibeTag) =>
    setVibes((p) => p.includes(tag) ? p.filter((v) => v !== tag) : [...p, tag])
  const toggleDining = (p: DiningPref) =>
    setDiningPrefs((prev) => prev.includes(p) ? prev.filter((d) => d !== p) : [...prev, p])
  const toggleDietary = (r: DietaryReq) =>
    setDietary((prev) => prev.includes(r) ? prev.filter((d) => d !== r) : [...prev, r])

  const handleBack = () => {
    if (step === (hasPreselect ? 1 : 0)) {
      setPreselectedDest(null)
      setWizardOpen(false)
      return
    }
    setStep((s) => s - 1)
  }

  const handleNext = async () => {
    const lastStep = hasPreselect ? 3 : 3
    if (step < lastStep) { setStep((s) => s + 1); return }

    // Final step — generate
    setGenerating(true)
    const genMessages = ['Mapping your route…', 'Discovering stops…', 'Running safety checks…', 'Building your schedule…', 'Almost ready…']
    for (let i = 0; i < genMessages.length; i++) {
      setGenStep(i)
      await new Promise((r) => setTimeout(r, 460))
    }

    const partySize = crewType === 'solo' ? 1 : crewType === 'couple' ? 2 : crewType === 'family' ? 4 : 6
    const user = {
      id: 'user-1',
      max_daily_drive_time: dailyDriveHours * 60,
      preferred_vibe: vibes,
      hiking_intensity: hikingIntensity,
      dietary_requirements: dietary,
      accommodation_preference: accommodation,
      off_grid_capability: { water_capacity_liters: partySize * 8, auxiliary_battery_days: 3 },
      party_size: partySize,
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
      tripType, originId, originName, destId, destName,
      startDate, endDate, dailyDriveHours, crewType, hasKids, diningPrefs,
      selectedCorridorId: preselectedDest?.corridorId ?? 'great-ocean-road',
    })

    buildItinerary(startDate, endDate, `${originName} → ${destName}`, diningPrefs)

    await new Promise((r) => setTimeout(r, 300))
    setGenerating(false)
    setWizardOpen(false)
    setPreselectedDest(null)
    setMapView(destCoord, 8)
  }

  const displayStep = step - stepOffset
  const stepLabels = hasPreselect
    ? ['Your Crew', 'Your Ride', 'Interests & Table']
    : ['The Journey', 'Your Crew', 'Your Ride', 'Interests & Table']

  const canContinue = [
    !!(originName && destName && startDate && (tripType === 'day' || endDate)), // step 0
    true,  // step 1: crew
    true,  // step 2: vehicle
    vibes.length > 0, // step 3: needs at least one vibe
  ][step] ?? true

  const genMessages = ['Mapping your route…', 'Discovering stops…', 'Running safety checks…', 'Building your schedule…', 'Almost ready…']

  return (
    <div className="wizard-overlay">
      <div className="wizard-card animate-fade-up">

        {/* Header */}
        <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RouteAULogo size={30} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>RouteAU</div>
              <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500 }}>{!generating ? stepLabels[displayStep] : 'Building your trip'}</div>
            </div>
          </div>
          <ProgressDots total={TOTAL_STEPS} current={displayStep} />
        </div>

        {/* Preselect banner */}
        {hasPreselect && !generating && (
          <div style={{
            margin: '14px 24px 0',
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--amber-glow)',
            border: '1px solid var(--amber-dim)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13,
          }}>
            <span>🛣️</span>
            <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{preselectedDest?.destName}</span>
            <span style={{ color: 'var(--text-muted)' }}>— let's build your trip there</span>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
          {generating ? (
            <GeneratingScreen step={genStep} messages={genMessages} />
          ) : (
            <>
              {step === 0 && (
                <StepJourney
                  tripType={tripType} setTripType={setTripTypeLocal}
                  originName={originName}
                  setOrigin={(id, name, coord) => { setOriginId(id); setOriginName(name); setOriginCoord(coord) }}
                  destName={destName}
                  setDest={(id, name, coord) => { setDestId(id); setDestName(name); setDestCoord(coord) }}
                  startDate={startDate} setStartDate={setStartDate}
                  endDate={endDate} setEndDate={setEndDate}
                  dailyDriveHours={dailyDriveHours} setDailyDriveHours={setDailyDriveHours}
                />
              )}
              {step === 1 && (
                <StepCrew
                  crewType={crewType} setCrewType={setCrewType}
                  hasKids={hasKids} setHasKids={setHasKids}
                />
              )}
              {step === 2 && (
                <StepVehicle
                  vehicleType={vehicleType} setVehicleType={setVehicleType}
                  fuelType={fuelType} setFuelType={setFuelType}
                  fuelCapacity={fuelCapacity} setFuelCapacity={setFuelCapacity}
                  fuelConsumption={fuelConsumption} setFuelConsumption={setFuelConsumption}
                  isTowing={isTowing} setIsTowing={setIsTowing}
                  showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced}
                />
              )}
              {step === 3 && (
                <StepInterests
                  vibes={vibes} toggleVibes={toggleVibes}
                  hikingIntensity={hikingIntensity} setHikingIntensity={setHikingIntensity}
                  dietary={dietary} toggleDietary={toggleDietary}
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
          <div style={{ padding: '14px 24px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={handleBack} style={{
              padding: '13px 18px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
            }}>
              ← Back
            </button>
            <button onClick={handleNext} disabled={!canContinue} style={{
              flex: 1, padding: '13px', borderRadius: 12,
              background: canContinue ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.04)',
              border: canContinue ? 'none' : '1px solid var(--border)',
              color: canContinue ? '#000' : 'var(--text-muted)',
              fontSize: 15, fontWeight: 700,
              cursor: canContinue ? 'pointer' : 'not-allowed',
              boxShadow: canContinue ? '0 4px 20px rgba(245,158,11,0.3)' : 'none',
              transition: 'all 0.2s', letterSpacing: '-0.01em',
            }}>
              {step === 3 ? '🗺️ Build My Trip' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 0: The Journey ───────────────────────────────────────────

function StepJourney({ tripType, setTripType, originName, setOrigin, destName, setDest,
  startDate, setStartDate, endDate, setEndDate, dailyDriveHours, setDailyDriveHours }: {
  tripType: TripType; setTripType: (t: TripType) => void
  originName: string; setOrigin: (id: string, name: string, coord: Coordinate) => void
  destName: string; setDest: (id: string, name: string, coord: Coordinate) => void
  startDate: string; setStartDate: (d: string) => void
  endDate: string; setEndDate: (d: string) => void
  dailyDriveHours: number; setDailyDriveHours: (h: number) => void
}) {
  const dayCount = tripType === 'multiday' && endDate && startDate
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Where are you headed?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Start with your route and dates — we'll build everything else around it.</p>
      </div>

      {/* Trip type toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        {([['day', '☀️', 'Day Trip'], ['multiday', '🏕️', 'Multi-Day']] as const).map(([type, emoji, label]) => (
          <button key={type} onClick={() => setTripType(type)} style={{
            flex: 1, padding: '11px', borderRadius: 12,
            background: tripType === type ? 'var(--amber-glow)' : 'rgba(255,255,255,0.03)',
            border: `1.5px solid ${tripType === type ? 'var(--amber)' : 'var(--border)'}`,
            color: tripType === type ? 'var(--amber)' : 'var(--text-muted)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s',
          }}>
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Route */}
      <DestinationInput label="Starting from" value={originName} onChange={setOrigin} placeholder="Suburb, city or town…" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>↓</span>
        <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
      </div>
      <DestinationInput label="Going to" value={destName} onChange={setDest} placeholder="Destination, region or landmark…" />

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: tripType === 'multiday' ? '1fr 1fr' : '1fr', gap: 10 }}>
        <div>
          <Label>{tripType === 'multiday' ? 'Departing' : 'Date'}</Label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="input-field" style={{ colorScheme: 'dark', marginTop: 6 }} />
        </div>
        {tripType === 'multiday' && (
          <div>
            <Label>Returning</Label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
              className="input-field" style={{ colorScheme: 'dark', marginTop: 6 }} />
          </div>
        )}
      </div>

      {/* Daily drive slider */}
      {tripType === 'multiday' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Label>Daily driving limit</Label>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>{dailyDriveHours}h / day</span>
          </div>
          <input type="range" min={2} max={10} step={0.5} value={dailyDriveHours}
            onChange={(e) => setDailyDriveHours(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--amber)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            <span>2h relaxed</span><span>6h standard</span><span>10h push</span>
          </div>
        </div>
      )}

      {/* Summary pill */}
      {tripType === 'multiday' && dayCount > 1 && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--amber-glow)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13, color: 'var(--amber)' }}>
          🗓️ <strong>{dayCount}-day trip</strong> · {dailyDriveHours}h driving per day
        </div>
      )}
    </div>
  )
}

// ── Step 1: Your Crew ─────────────────────────────────────────────

function StepCrew({ crewType, setCrewType, hasKids, setHasKids }: {
  crewType: CrewType; setCrewType: (c: CrewType) => void
  hasKids: boolean; setHasKids: (b: boolean) => void
}) {
  const crews = [
    { type: 'solo' as CrewType,   emoji: '🧍', label: 'Solo', desc: 'Just me and the road' },
    { type: 'couple' as CrewType, emoji: '👫', label: 'Couple', desc: 'Two up' },
    { type: 'family' as CrewType, emoji: '👨‍👩‍👧', label: 'Family', desc: 'Kids in tow' },
    { type: 'group' as CrewType,  emoji: '🎉', label: 'Group', desc: 'The more the better' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>Who's coming?</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>We'll tailor activities, portion sizes, and pace to suit your crew.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {crews.map((c) => (
          <div key={c.type} className={`option-card ${crewType === c.type ? 'selected' : ''}`}
            onClick={() => setCrewType(c.type)}
            style={{ padding: '18px 14px', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 30 }}>{c.emoji}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{c.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {(crewType === 'family' || crewType === 'group') && (
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <ToggleRow label="Kids on board?" value={hasKids} onChange={setHasKids} />
          {hasKids && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
              We'll avoid dusk driving, shorten driving days, and prioritise family-friendly stops.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Step 2: Your Ride ─────────────────────────────────────────────

function StepVehicle({ vehicleType, setVehicleType, fuelType, setFuelType,
  fuelCapacity, setFuelCapacity, fuelConsumption, setFuelConsumption,
  isTowing, setIsTowing, showAdvanced, setShowAdvanced }: {
  vehicleType: VehicleType; setVehicleType: (v: VehicleType) => void
  fuelType: FuelType; setFuelType: (f: FuelType) => void
  fuelCapacity: number; setFuelCapacity: (n: number) => void
  fuelConsumption: number; setFuelConsumption: (n: number) => void
  isTowing: boolean; setIsTowing: (b: boolean) => void
  showAdvanced: boolean; setShowAdvanced: (b: boolean) => void
}) {
  const vehicles = [
    { type: 'Sedan' as VehicleType,          emoji: '🚗', label: 'Sedan / Hatch',    hint: 'Sealed roads only' },
    { type: 'AWD' as VehicleType,            emoji: '🚙', label: 'SUV / AWD',        hint: 'Gravel no problem' },
    { type: 'HighClearance4WD' as VehicleType, emoji: '🛻', label: '4WD',            hint: 'All terrain capable' },
    { type: '4WD_WithCaravan' as VehicleType, emoji: '🚐', label: '4WD + Caravan',   hint: 'Towing weight applies' },
    { type: 'Electric' as VehicleType,       emoji: '⚡', label: 'Electric',         hint: 'Charging plan needed' },
  ]

  const fuels: [FuelType, string, string][] = [
    ['Unleaded95', '⛽', 'ULP 95'],
    ['Unleaded98', '⛽', 'ULP 98'],
    ['Diesel', '🛢️', 'Diesel'],
    ['Electric', '⚡', 'Electric'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>Your ride</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>We use this to check route access and calculate fuel stops.</p>
      </div>

      <div>
        <Label>Vehicle type</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
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
          {fuels.map(([f, emoji, label]) => (
            <div key={f} className={`option-card ${fuelType === f ? 'selected' : ''}`}
              onClick={() => setFuelType(f)} style={{ padding: '10px 6px', gap: 4 }}>
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
        background: 'none', border: 'none', color: 'var(--text-muted)',
        fontSize: 13, cursor: 'pointer', textAlign: 'left',
        padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {showAdvanced ? '▾' : '▸'} Advanced — tank size & consumption
      </button>

      {showAdvanced && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Tank capacity (L)</div>
            <input type="number" value={fuelCapacity} min={20} max={300}
              onChange={(e) => setFuelCapacity(Number(e.target.value))}
              className="input-field" style={{ fontSize: 14 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>L / 100 km</div>
            <input type="number" value={fuelConsumption} min={4} max={30} step={0.5}
              onChange={(e) => setFuelConsumption(Number(e.target.value))}
              className="input-field" style={{ fontSize: 14 }} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <ToggleRow label="Towing caravan or trailer?" value={isTowing} onChange={setIsTowing} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 3: Interests & Table ─────────────────────────────────────

function StepInterests({ vibes, toggleVibes, hikingIntensity, setHikingIntensity,
  dietary, toggleDietary, diningPrefs, toggleDining, accommodation, setAccommodation, tripType }: {
  vibes: VibeTag[]; toggleVibes: (t: VibeTag) => void
  hikingIntensity: HikingIntensity; setHikingIntensity: (h: HikingIntensity) => void
  dietary: DietaryReq[]; toggleDietary: (r: DietaryReq) => void
  diningPrefs: DiningPref[]; toggleDining: (p: DiningPref) => void
  accommodation: AccommodationPreference; setAccommodation: (a: AccommodationPreference) => void
  tripType: TripType
}) {
  const VIBES: { tag: VibeTag; emoji: string; label: string }[] = [
    { tag: 'Hiking', emoji: '🥾', label: 'Hiking' },
    { tag: 'Lookouts', emoji: '👁️', label: 'Lookouts' },
    { tag: 'Wildlife', emoji: '🦘', label: 'Wildlife' },
    { tag: 'Stargazing', emoji: '🌌', label: 'Stargazing' },
    { tag: 'Photography', emoji: '📷', label: 'Photography' },
    { tag: 'History', emoji: '🏛️', label: 'History' },
    { tag: 'Beach', emoji: '🌊', label: 'Beach' },
    { tag: 'Chilling', emoji: '🏖️', label: 'Chilling' },
  ]

  const INTENSITIES: { level: HikingIntensity; emoji: string; desc: string }[] = [
    { level: 'Easy', emoji: '🌿', desc: 'Flat walks, short loops, pram-friendly' },
    { level: 'Moderate', emoji: '🥾', desc: 'Hills, 2–4 hr hikes, some scrambling' },
    { level: 'Hard', emoji: '⛰️', desc: 'Full-day hikes, steep ascents, technical' },
    { level: 'Extreme', emoji: '🧗', desc: 'Multi-day treks, remote, serious fitness' },
  ]

  const DINING: { pref: DiningPref; emoji: string; label: string }[] = [
    { pref: 'Cafes', emoji: '☕', label: 'Cafes' },
    { pref: 'LocalPubs', emoji: '🍺', label: 'Local Pubs' },
    { pref: 'Wineries', emoji: '🍷', label: 'Wineries' },
    { pref: 'FineDining', emoji: '🍽️', label: 'Fine Dining' },
    { pref: 'Roadhouses', emoji: '🛣️', label: 'Roadhouses' },
    { pref: 'SelfCatering', emoji: '🔥', label: 'Self-Catering' },
  ]

  const DIETARY: { req: DietaryReq; emoji: string; label: string }[] = [
    { req: 'Vegetarian', emoji: '🥦', label: 'Vegetarian' },
    { req: 'Vegan', emoji: '🌱', label: 'Vegan' },
    { req: 'GlutenFree', emoji: '🌾', label: 'Gluten-free' },
    { req: 'Halal', emoji: '☪️', label: 'Halal' },
    { req: 'DairyFree', emoji: '🥛', label: 'Dairy-free' },
  ]

  const STAYS: { type: AccommodationPreference; emoji: string; label: string }[] = [
    { type: 'FreeCamping', emoji: '⛺', label: 'Free Camping' },
    { type: 'CaravanPark', emoji: '🚐', label: 'Caravan Park' },
    { type: 'Glamping', emoji: '🛖', label: 'Glamping' },
    { type: 'Hotel', emoji: '🏨', label: 'Hotel' },
    { type: 'Any', emoji: '✨', label: 'Mix it up' },
  ]

  const hikingSelected = vibes.includes('Hiking')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>What do you love?</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>We'll build your daily schedule around your interests and food preferences.</p>
      </div>

      {/* Activities */}
      <div>
        <Label>Activities <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>pick all that apply</span></Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 8 }}>
          {VIBES.map((v) => (
            <div key={v.tag} className={`option-card ${vibes.includes(v.tag) ? 'selected' : ''}`}
              onClick={() => toggleVibes(v.tag)} style={{ padding: '12px 6px', gap: 5 }}>
              <span style={{ fontSize: 22 }}>{v.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hiking intensity — only shown if Hiking is selected */}
      {hikingSelected && (
        <div style={{
          padding: '14px 16px', borderRadius: 12,
          background: 'var(--amber-glow)', border: '1px solid var(--amber-dim)',
        }}>
          <Label>Hiking intensity</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            {INTENSITIES.map((i) => (
              <div key={i.level}
                className={`option-card ${hikingIntensity === i.level ? 'selected' : ''}`}
                onClick={() => setHikingIntensity(i.level)}
                style={{ flexDirection: 'row', alignItems: 'flex-start', padding: '10px 12px', gap: 8, textAlign: 'left' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{i.emoji}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{i.level}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{i.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food scene */}
      <div>
        <Label>Food scene</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
          {DINING.map((d) => (
            <div key={d.pref} className={`option-card ${diningPrefs.includes(d.pref) ? 'selected' : ''}`}
              onClick={() => toggleDining(d.pref)} style={{ padding: '12px 8px', gap: 5 }}>
              <span style={{ fontSize: 20 }}>{d.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dietary requirements */}
      <div>
        <Label>Dietary requirements <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>optional</span></Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {DIETARY.map((d) => (
            <button key={d.req}
              onClick={() => toggleDietary(d.req)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 20,
                background: dietary.includes(d.req) ? 'var(--amber-glow)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${dietary.includes(d.req) ? 'var(--amber)' : 'var(--border)'}`,
                color: dietary.includes(d.req) ? 'var(--amber)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
              <span>{d.emoji}</span> {d.label}
            </button>
          ))}
        </div>
        {dietary.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            We'll prioritise restaurants and cafes that cater to {dietary.join(', ').toLowerCase()} diners.
          </p>
        )}
      </div>

      {/* Accommodation — multiday only */}
      {tripType === 'multiday' && (
        <div>
          <Label>Where do you sleep?</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
            {STAYS.map((s) => (
              <div key={s.type} className={`option-card ${accommodation === s.type ? 'selected' : ''}`}
                onClick={() => setAccommodation(s.type)} style={{ padding: '12px 8px', gap: 5 }}>
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

// ── Generating screen ─────────────────────────────────────────────

function GeneratingScreen({ step, messages }: { step: number; messages: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 28 }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg className="spin-slow" viewBox="0 0 72 72" fill="none" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="36" cy="36" r="32" stroke="rgba(245,158,11,0.2)" strokeWidth="3" />
          <path d="M36 4 A32 32 0 0 1 68 36" stroke="var(--amber)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🗺️</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Building your trip…</div>
        <div style={{ fontSize: 14, color: 'var(--amber)' }}>{messages[step]}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10, color: 'white', flexShrink: 0,
              background: i < step ? 'var(--green)' : i === step ? 'var(--amber)' : 'var(--border)',
              transition: 'background 0.3s',
            }}>
              {i < step ? '✓' : i === step ? '…' : ''}
            </span>
            <span style={{ color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{children}</div>
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
