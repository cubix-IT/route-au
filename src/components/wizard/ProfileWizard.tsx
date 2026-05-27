import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useItineraryBuilder } from '@/hooks/useItineraryBuilder'
import { matchDestinations, VICTORIAN_CLUSTERS } from '@/data/victorianClusters'
import { getCurrentSeason } from '@/utils/season'
import type { MatchedDest, TripInterest } from '@/data/victorianClusters'
import type {
  TripType, CrewType, VehicleType, FuelType,
  AccommodationPreference, VibeTag, DiningPref,
  HikingIntensity, DietaryReq, KidsAge, Coordinate,
} from '@/types'

const GREEN = '#3A6B4F'
const season = getCurrentSeason()

function getMinDate(tripType: TripType): string {
  const now = new Date()
  if (tripType === 'day' && now.getHours() >= 18) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }
  return now.toISOString().split('T')[0]
}

function haversinKm(a: Coordinate, b: Coordinate): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

// ── Interest definitions ──────────────────────────────────────────

const INTERESTS: { id: TripInterest; emoji: string; label: string }[] = [
  { id: 'Wildlife',   emoji: '🦘', label: 'Wildlife' },
  { id: 'Beach',      emoji: '🌊', label: 'Beach' },
  { id: 'Wine',       emoji: '🍷', label: 'Wine & cellar doors' },
  { id: 'Hiking',     emoji: '🥾', label: 'Hiking & trails' },
  { id: 'HotSprings', emoji: '♨️', label: 'Hot springs' },
  { id: 'History',    emoji: '🏛️', label: 'History' },
  { id: 'Food',       emoji: '☕', label: 'Cafes & food' },
  { id: 'Relaxation', emoji: '🛁', label: 'Relaxation' },
  { id: 'FamilyFun',  emoji: '🎠', label: 'Family fun' },
  { id: 'Adventure',  emoji: '🚵', label: 'Adventure' },
  { id: 'Scenic',     emoji: '👁️', label: 'Scenic drives' },
]

// ── Main wizard ───────────────────────────────────────────────────

export function ProfileWizard() {
  const {
    isWizardOpen, setWizardOpen,
    setUserProfile, setVehicleProfile, setTripPlanState, setMapView,
    preselectedDest, setPreselectedDest,
  } = useAppStore()
  const { buildItinerary } = useItineraryBuilder()

  // Wizard starts at 0 always; 3-step discovery or 2-step planning
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)

  // ── Step 0: How far + who ──
  const [maxDriveHours, setMaxDriveHours] = useState(2)
  const [tripType, setTripType] = useState<TripType>('day')
  const [crewType, setCrewType] = useState<CrewType>('couple')
  const [hasKids, setHasKids] = useState(false)
  const [kidsAge, setKidsAge] = useState<KidsAge | null>(null)

  // ── Step 1: Interests ──
  const [interests, setInterests] = useState<TripInterest[]>([])

  // ── Step 2: Pick a destination ──
  const [suggestions, setSuggestions] = useState<MatchedDest[]>([])
  const [pickedDest, setPickedDest] = useState<MatchedDest | null>(null)

  // For preselected (from landing page cluster card), skip to step 3
  const isPreselected = !!preselectedDest

  // ── Step 3: Dates + food + vehicle ──
  const [startDate, setStartDate] = useState('')   // empty = user must pick
  const [endDate, setEndDate] = useState('')
  const [dailyDriveHours, setDailyDriveHours] = useState(3)
  const [departureHour, setDepartureHour] = useState(8)
  const [diningPrefs, setDiningPrefs] = useState<DiningPref[]>([])
  const [dietary, setDietary] = useState<DietaryReq[]>([])
  const [vehicleType, setVehicleType] = useState<VehicleType>('AWD')
  const [accommodation, setAccommodation] = useState<AccommodationPreference>('Any')

  const totalSteps = isPreselected ? 2 : 4 // 0..1 for preselect, 0..3 for discovery

  if (!isWizardOpen) return null

  // ── Derived dest info ──
  const effectiveDest = isPreselected
    ? { name: preselectedDest.destName, coord: preselectedDest.destCoord, clusterId: preselectedDest.corridorId, destId: preselectedDest.destId }
    : pickedDest
      ? { name: pickedDest.sub.name, coord: pickedDest.sub.coord, clusterId: pickedDest.cluster.id, destId: pickedDest.sub.id }
      : null

  const toggleInterest = (id: TripInterest) =>
    setInterests((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id])

  const toggleDining = (p: DiningPref) =>
    setDiningPrefs((prev) => prev.includes(p) ? prev.filter((d) => d !== p) : [...prev, p])

  const toggleDietary = (r: DietaryReq) =>
    setDietary((prev) => prev.includes(r) ? prev.filter((d) => d !== r) : [...prev, r])

  const handleBack = () => {
    if (step === 0) { setPreselectedDest(null); setWizardOpen(false); return }
    setStep((s) => s - 1)
  }

  const handleNext = async () => {
    const lastStep = isPreselected ? 1 : 3

    // Step 1 in discovery mode → compute suggestions, derive dining prefs, advance
    if (!isPreselected && step === 1) {
      const { originCoord: currentOriginCoord } = useAppStore.getState()
      const matches = matchDestinations({
        maxDriveHours,
        interests,
        hasKids,
        isOvernight: tripType === 'multiday',
        season,
        originCoord: currentOriginCoord,
      })
      setSuggestions(matches)

      // Pre-select dining prefs based on interests (user can still change in preferences step)
      const derived = new Set<DiningPref>()
      if (interests.includes('Wine')) derived.add('Wineries')
      if (interests.includes('Food')) { derived.add('Cafes'); derived.add('CasualDining') }
      // No fallback — empty = no food stops wanted
      setDiningPrefs(Array.from(derived))

      setStep(2)
      return
    }

    if (step < lastStep) { setStep((s) => s + 1); return }

    // Final step → generate itinerary
    if (!effectiveDest) return
    setGenerating(true)
    const msgs = ['Finding your route…', 'Matching experiences…', 'Building your day…', 'Almost ready…']
    for (let i = 0; i < msgs.length; i++) {
      setGenStep(i)
      await new Promise((r) => setTimeout(r, 450))
    }

    const partySize = crewType === 'solo' ? 1 : crewType === 'couple' ? 2 : crewType === 'family' ? 4 : 6
    const vibes: VibeTag[] = interests
      .map((i) => ({
        Wildlife: 'Wildlife', Beach: 'Beach', Hiking: 'Hiking',
        HotSprings: 'HotSprings', History: 'History', FamilyFun: 'FamilyAttractions',
        Adventure: 'Cycling', Scenic: 'Lookouts', Wine: 'Wineries',
        Food: 'Chilling', Relaxation: 'Chilling',
      } as Record<TripInterest, VibeTag>)[i])
      .filter(Boolean)

    const user = {
      id: 'user-1',
      max_daily_drive_time: (tripType === 'day' ? maxDriveHours : dailyDriveHours) * 60,
      preferred_vibe: vibes.length > 0 ? vibes : ['Lookouts' as VibeTag],
      hiking_intensity: 'Moderate' as HikingIntensity,
      dietary_requirements: dietary,
      accommodation_preference: accommodation,
      off_grid_capability: { water_capacity_liters: partySize * 8, auxiliary_battery_days: 2 },
      party_size: partySize,
      trip_type: tripType,
      crew_type: crewType,
      has_kids: hasKids,
      kids_age: kidsAge ?? undefined,
      dining_prefs: diningPrefs,
    }
    const vehicle = {
      id: 'vehicle-1',
      type: vehicleType,
      clearance_height_meters: vehicleType === 'HighClearance4WD' || vehicleType === '4WD_WithCaravan' ? 2.4 : 1.8,
      fuel_type: (vehicleType === 'Electric' ? 'Electric' : 'Unleaded95') as FuelType,
      fuel_capacity_liters: 65,
      fuel_consumption_litres_per_100km: vehicleType === 'Electric' ? 0 : 10,
      is_towing: vehicleType === '4WD_WithCaravan',
    }

    // Read origin from store — user may have set it on the landing page
    const { originCoord: storedOriginCoord, originName: storedOriginName } = useAppStore.getState()

    setUserProfile(user)
    setVehicleProfile(vehicle)
    setTripPlanState({
      tripType,
      originName: storedOriginName,
      originCoord: storedOriginCoord,
      destId: effectiveDest.destId,
      destName: effectiveDest.name,
      destCoord: effectiveDest.coord,
      startDate,
      endDate: tripType === 'multiday' ? endDate : '',
      dailyDriveHours: tripType === 'day' ? maxDriveHours : dailyDriveHours,
      crewType, hasKids, diningPrefs,
      selectedCorridorId: effectiveDest.clusterId,
      departureHour,
    })

    buildItinerary(startDate, tripType === 'multiday' ? endDate : undefined,
      `${storedOriginName} → ${effectiveDest.name}`, diningPrefs)

    await new Promise((r) => setTimeout(r, 300))
    setGenerating(false)
    setWizardOpen(false)
    setPreselectedDest(null)
    setMapView(effectiveDest.coord, 11)
  }

  const canContinue = (() => {
    if (isPreselected) {
      if (step === 0) return !!startDate && (tripType === 'day' || !!endDate)
      return true
    }
    if (step === 0) return crewType !== null && (!hasKids || !!kidsAge)
    if (step === 1) return interests.length > 0
    if (step === 2) return !!pickedDest
    // Final step: date required
    return !!startDate && (tripType === 'day' || !!endDate)
  })()

  const msgs = ['Finding your route…', 'Matching experiences…', 'Building your day…', 'Almost ready…']

  // ── Step labels ──
  const discoveryStepLabels = ['How far & who', 'What you love', 'Pick a spot', 'Finishing touches']
  const preselectedStepLabels = ['Your trip details', 'Preferences']
  const stepLabels = isPreselected ? preselectedStepLabels : discoveryStepLabels

  return (
    <div className="wizard-overlay">
      <div className="wizard-card animate-fade-up">

        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em',
            }}>
              {!generating ? stepLabels[step] : 'Building your trip…'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {!generating ? `Step ${step + 1} of ${totalSteps}` : 'Hang tight'}
            </div>
          </div>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                width: i === step ? 18 : 6, height: 6, borderRadius: 3,
                background: i <= step ? GREEN : 'var(--border)',
                transition: 'all 0.25s',
              }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {generating ? (
            <GeneratingScreen step={genStep} messages={msgs} />
          ) : isPreselected ? (
            <>
              {step === 0 && (
                <StepPlanningDetails
                  preselectedDest={preselectedDest!}
                  onClearPreselect={() => setPreselectedDest(null)}
                  tripType={tripType} setTripType={setTripType}
                  crewType={crewType} setCrewType={setCrewType}
                  hasKids={hasKids} setHasKids={(v) => { setHasKids(v); if (!v) setKidsAge(null) }}
                  kidsAge={kidsAge} setKidsAge={setKidsAge}
                  startDate={startDate} setStartDate={setStartDate}
                  endDate={endDate} setEndDate={setEndDate}
                  departureHour={departureHour} setDepartureHour={setDepartureHour}
                />
              )}
              {step === 1 && (
                <StepPreferences
                  hasKids={hasKids} kidsAge={kidsAge}
                  tripType={tripType}
                  diningPrefs={diningPrefs} toggleDining={toggleDining}
                  dietary={dietary} toggleDietary={toggleDietary}
                  vehicleType={vehicleType} setVehicleType={setVehicleType}
                  accommodation={accommodation} setAccommodation={setAccommodation}
                  dailyDriveHours={dailyDriveHours} setDailyDriveHours={setDailyDriveHours}
                  departureHour={departureHour} setDepartureHour={setDepartureHour}
                />
              )}
            </>
          ) : (
            <>
              {step === 0 && (
                <StepHowFarAndWho
                  maxDriveHours={maxDriveHours} setMaxDriveHours={setMaxDriveHours}
                  tripType={tripType} setTripType={setTripType}
                  crewType={crewType} setCrewType={setCrewType}
                  hasKids={hasKids} setHasKids={(v) => { setHasKids(v); if (!v) setKidsAge(null) }}
                  kidsAge={kidsAge} setKidsAge={setKidsAge}
                />
              )}
              {step === 1 && (
                <StepInterests
                  interests={interests} toggleInterest={toggleInterest}
                  hasKids={hasKids} kidsAge={kidsAge}
                />
              )}
              {step === 2 && (
                <StepPickDest
                  suggestions={suggestions}
                  picked={pickedDest}
                  onPick={setPickedDest}
                />
              )}
              {step === 3 && (
                <StepPreferences
                  hasKids={hasKids} kidsAge={kidsAge}
                  tripType={tripType}
                  diningPrefs={diningPrefs} toggleDining={toggleDining}
                  dietary={dietary} toggleDietary={toggleDietary}
                  vehicleType={vehicleType} setVehicleType={setVehicleType}
                  accommodation={accommodation} setAccommodation={setAccommodation}
                  dailyDriveHours={dailyDriveHours} setDailyDriveHours={setDailyDriveHours}
                  departureHour={departureHour} setDepartureHour={setDepartureHour}
                  startDate={startDate} setStartDate={setStartDate}
                  endDate={endDate} setEndDate={setEndDate}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!generating && (
          <div style={{ padding: '12px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={handleBack} style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'var(--bg-muted)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
            }}>
              ← Back
            </button>
            <button onClick={handleNext} disabled={!canContinue} style={{
              flex: 1, padding: '12px', borderRadius: 10,
              background: canContinue ? GREEN : 'var(--bg-muted)',
              border: canContinue ? 'none' : '1px solid var(--border)',
              color: canContinue ? '#fff' : 'var(--text-muted)',
              fontSize: 14, fontWeight: 600,
              cursor: canContinue ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}>
              {step === (isPreselected ? 1 : 3) ? 'Build my trip →' : step === 1 && !isPreselected ? 'Show me options →' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 0 (Discovery): How far + who ────────────────────────────

function StepHowFarAndWho({
  maxDriveHours, setMaxDriveHours, tripType, setTripType,
  crewType, setCrewType, hasKids, setHasKids, kidsAge, setKidsAge,
}: {
  maxDriveHours: number; setMaxDriveHours: (n: number) => void
  tripType: TripType; setTripType: (t: TripType) => void
  crewType: CrewType; setCrewType: (c: CrewType) => void
  hasKids: boolean; setHasKids: (b: boolean) => void
  kidsAge: KidsAge | null; setKidsAge: (a: KidsAge) => void
}) {
  const showKids = crewType === 'family' || crewType === 'group'

  // How many destinations fit within this drive time
  const matching = VICTORIAN_CLUSTERS.flatMap((c) => c.subDests)
    .filter((s) => s.driveTimeHours <= maxDriveHours).length

  const driveLabel = maxDriveHours <= 1
    ? `${Math.round(maxDriveHours * 60)} min`
    : `${maxDriveHours} hrs`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Let's find your getaway
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          We'll suggest the best spots based on your answers.
        </p>
      </div>

      {/* Drive time — the hero question */}
      <div style={{
        padding: '20px',
        borderRadius: 14,
        background: 'var(--green-light)',
        border: '1px solid var(--border-active)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <Label>How far from Melbourne are you happy to drive?</Label>
          <span style={{ fontSize: 22, fontWeight: 800, color: GREEN, letterSpacing: '-0.04em', fontFamily: "'Fraunces', Georgia, serif" }}>
            {driveLabel}
          </span>
        </div>
        <input
          type="range" min={0.75} max={4} step={0.25} value={maxDriveHours}
          onChange={(e) => setMaxDriveHours(Number(e.target.value))}
          style={{ width: '100%', accentColor: GREEN }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          <span>45 min</span>
          <span>2 hrs</span>
          <span>4 hrs</span>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: GREEN, fontWeight: 600 }}>
          {matching} destinations within reach
        </div>
      </div>

      {/* Day / Overnight */}
      <div>
        <Label>Day trip or staying overnight?</Label>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {([['day', '☀️', 'Day trip', 'Back before dinner'], ['multiday', '🌙', 'Overnight+', 'Stay a night or two']] as const).map(
            ([type, emoji, label, desc]) => (
              <button key={type} onClick={() => setTripType(type)} style={{
                flex: 1, padding: '14px 10px', borderRadius: 12,
                background: tripType === type ? 'var(--green-light)' : 'var(--bg-muted)',
                border: `1.5px solid ${tripType === type ? 'var(--border-active)' : 'var(--border)'}`,
                color: tripType === type ? GREEN : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 22 }}>{emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Who's coming */}
      <div>
        <Label>Who's coming?</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          {([
            ['solo', '🧍', 'Solo', 'Just me'],
            ['couple', '👫', 'Couple', 'Two of us'],
            ['family', '👨‍👩‍👧', 'Family', 'Kids included'],
            ['group', '🎉', 'Group', 'The crew'],
          ] as const).map(([type, emoji, label, desc]) => (
            <div key={type}
              className={`option-card ${crewType === type ? 'selected' : ''}`}
              onClick={() => setCrewType(type)}
              style={{ flexDirection: 'row', padding: '12px', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kids — only when relevant */}
      {showKids && (
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
          <ToggleRow label="Any kids in the group?" value={hasKids} onChange={setHasKids} />
          {hasKids && (
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                ['toddler', '🍼', 'Toddlers', 'Under 5'],
                ['school',  '🎒', 'Primary school', '6–12'],
                ['teen',    '🎧', 'Teenagers', '13+'],
                ['mixed',   '👶🧒','Mixed ages', 'All of the above'],
              ] as const).map(([age, emoji, label, desc]) => (
                <div key={age}
                  onClick={() => setKidsAge(age)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px', borderRadius: 10, cursor: 'pointer',
                    background: kidsAge === age ? 'var(--green-light)' : '#fff',
                    border: `1.5px solid ${kidsAge === age ? 'var(--border-active)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 18 }}>{emoji}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: kidsAge === age ? GREEN : 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Step 1 (Discovery): What you love ────────────────────────────

function StepInterests({ interests, toggleInterest, hasKids, kidsAge }: {
  interests: TripInterest[]; toggleInterest: (id: TripInterest) => void
  hasKids: boolean; kidsAge: KidsAge | null
}) {
  const adultOnly: TripInterest[] = ['Wine']
  const toddlerHide: TripInterest[] = ['Adventure']
  const visible = INTERESTS.filter((i) => {
    if (hasKids && kidsAge !== 'teen' && adultOnly.includes(i.id)) return false
    if (hasKids && kidsAge === 'toddler' && toddlerHide.includes(i.id)) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          What do you love?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Pick everything that sounds good. We'll find spots that match.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {visible.map((i) => (
          <div
            key={i.id}
            className={`option-card ${interests.includes(i.id) ? 'selected' : ''}`}
            onClick={() => toggleInterest(i.id)}
            style={{ padding: '14px 8px', gap: 6 }}
          >
            <span style={{ fontSize: 24 }}>{i.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{i.label}</span>
          </div>
        ))}
      </div>

      {interests.length > 0 && (
        <div style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>
          {interests.length} interest{interests.length > 1 ? 's' : ''} selected — we'll match destinations to these
        </div>
      )}
    </div>
  )
}

// ── Step 2 (Discovery): Pick a destination ───────────────────────

function StepPickDest({ suggestions, picked, onPick }: {
  suggestions: MatchedDest[]
  picked: MatchedDest | null
  onPick: (d: MatchedDest) => void
}) {
  if (suggestions.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Nothing matched exactly
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Try increasing your drive time or picking fewer interests.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Here's where you should go
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Ranked for {season === 'autumn' ? 'autumn' : season === 'winter' ? 'winter' : season === 'spring' ? 'spring' : 'summer'} and your interests. Pick one.
        </p>
      </div>

      {suggestions.map((match, idx) => {
        const isPicked = picked?.sub.id === match.sub.id
        const hrs = match.sub.driveTimeHours
        const driveLabel = hrs < 1 ? `${Math.round(hrs * 60)} min` : `${hrs.toFixed(hrs === Math.floor(hrs) ? 0 : 1)} hrs`

        return (
          <div
            key={match.sub.id}
            onClick={() => onPick(match)}
            style={{
              borderRadius: 14,
              border: `2px solid ${isPicked ? GREEN : 'var(--border)'}`,
              background: isPicked ? 'var(--green-light)' : '#fff',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.18s',
              boxShadow: isPicked ? `0 0 0 3px ${GREEN}20` : 'var(--shadow-sm)',
            }}
          >
            {/* Gradient header strip */}
            <div style={{
              height: 6,
              background: `linear-gradient(90deg, ${match.cluster.gradientFrom}, ${match.cluster.gradientTo})`,
            }} />

            <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {/* Drive time badge */}
              <div style={{
                flexShrink: 0, width: 58, textAlign: 'center',
                padding: '8px 4px', borderRadius: 8,
                background: isPicked ? 'rgba(58,107,79,0.12)' : 'var(--bg-muted)',
                border: `1px solid ${isPicked ? 'var(--border-active)' : 'var(--border)'}`,
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: isPicked ? GREEN : 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {hrs < 1 ? Math.round(hrs * 60) : hrs.toFixed(hrs === Math.floor(hrs) ? 0 : 1)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  {hrs < 1 ? 'min' : 'hrs'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>drive</div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                  {idx === 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: GREEN,
                      background: `${GREEN}15`, border: `1px solid ${GREEN}30`,
                      padding: '1px 6px', borderRadius: 5, letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}>
                      TOP PICK
                    </span>
                  )}
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {match.sub.name}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {match.cluster.name} · {driveLabel} from Melbourne
                </div>

                {/* Highlights */}
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {match.sub.highlights.slice(0, 3).map((h) => (
                    <li key={h} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <span style={{ color: GREEN, flexShrink: 0 }}>·</span>{h}
                    </li>
                  ))}
                </ul>

                {/* Match reasons */}
                {match.matchReasons.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
                    {match.matchReasons.map((r) => (
                      <span key={r} style={{
                        fontSize: 10, fontWeight: 600,
                        color: GREEN,
                        background: `${GREEN}12`,
                        padding: '2px 7px', borderRadius: 5,
                      }}>{r}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected indicator */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: isPicked ? GREEN : 'var(--bg-muted)',
                border: `2px solid ${isPicked ? GREEN : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                fontSize: 11, color: '#fff',
              }}>
                {isPicked ? '✓' : ''}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Step 3 (Discovery) / Step 1 (Preselect): Preferences ─────────

const ALL_DINING: { pref: DiningPref; emoji: string; label: string; kidsOk: boolean }[] = [
  { pref: 'Cafes',        emoji: '☕', label: 'Cafes',          kidsOk: true },
  { pref: 'Bakeries',     emoji: '🥐', label: 'Bakeries',       kidsOk: true },
  { pref: 'CasualDining', emoji: '🍔', label: 'Casual dining',  kidsOk: true },
  { pref: 'LocalPubs',    emoji: '🍺', label: 'Local pubs',     kidsOk: false },
  { pref: 'Wineries',     emoji: '🍷', label: 'Winery lunch',   kidsOk: false },
  { pref: 'FineDining',   emoji: '🍽️', label: 'Fine dining',    kidsOk: false },
  { pref: 'Roadhouses',   emoji: '🛣️', label: 'Roadhouses',     kidsOk: true },
  { pref: 'SelfCatering', emoji: '🔥', label: 'Self-catering',  kidsOk: true },
]

const DIETARY: { req: DietaryReq; emoji: string; label: string }[] = [
  { req: 'Vegetarian', emoji: '🥦', label: 'Vegetarian' },
  { req: 'Vegan',      emoji: '🌱', label: 'Vegan' },
  { req: 'GlutenFree', emoji: '🌾', label: 'Gluten-free' },
  { req: 'Halal',      emoji: '☪️', label: 'Halal' },
  { req: 'DairyFree',  emoji: '🥛', label: 'Dairy-free' },
]

function StepPreferences({
  hasKids, kidsAge, tripType,
  diningPrefs, toggleDining,
  dietary, toggleDietary,
  vehicleType, setVehicleType,
  accommodation, setAccommodation,
  dailyDriveHours, setDailyDriveHours,
  departureHour, setDepartureHour,
  startDate, setStartDate,
  endDate, setEndDate,
}: {
  hasKids: boolean; kidsAge: KidsAge | null; tripType: TripType
  diningPrefs: DiningPref[]; toggleDining: (p: DiningPref) => void
  dietary: DietaryReq[]; toggleDietary: (r: DietaryReq) => void
  vehicleType: VehicleType; setVehicleType: (v: VehicleType) => void
  accommodation: AccommodationPreference; setAccommodation: (a: AccommodationPreference) => void
  dailyDriveHours?: number; setDailyDriveHours?: (n: number) => void
  departureHour: number; setDepartureHour: (h: number) => void
  startDate?: string; setStartDate?: (d: string) => void
  endDate?: string; setEndDate?: (d: string) => void
}) {
  const minDate = getMinDate(tripType)
  const visibleDining = ALL_DINING.filter((d) => {
    if (!hasKids) return true
    if (!d.kidsOk && kidsAge !== 'teen') return false
    return true
  })

  const vehicles = [
    { type: 'Sedan' as VehicleType,            emoji: '🚗', label: 'Sedan / Hatch' },
    { type: 'AWD' as VehicleType,              emoji: '🚙', label: 'SUV / AWD' },
    { type: 'HighClearance4WD' as VehicleType, emoji: '🛻', label: '4WD' },
    { type: '4WD_WithCaravan' as VehicleType,  emoji: '🚐', label: 'Van / Caravan' },
    { type: 'Electric' as VehicleType,         emoji: '⚡', label: 'Electric' },
  ]

  const stays: { type: AccommodationPreference; emoji: string; label: string }[] = [
    { type: 'Hotel',       emoji: '🏨', label: 'Hotel / motel' },
    { type: 'Glamping',    emoji: '🛖', label: 'Glamping' },
    { type: 'CaravanPark', emoji: '🚐', label: 'Caravan park' },
    { type: 'FreeCamping', emoji: '⛺', label: 'Free camping' },
    { type: 'Any',         emoji: '✨', label: "Don't mind" },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          A few finishing touches
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Quick preferences to personalise your day.</p>
      </div>

      {/* Dates — shown here for discovery flow */}
      {setStartDate && (
        <div>
          <Label>When are you going?</Label>
          <div style={{ display: 'grid', gridTemplateColumns: tripType === 'multiday' ? '1fr 1fr' : '1fr', gap: 10, marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{tripType === 'multiday' ? 'Departing' : 'Date'}</div>
              <input type="date" value={startDate} min={minDate} onChange={(e) => setStartDate!(e.target.value)}
                className="input-field" />
            </div>
            {tripType === 'multiday' && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Returning</div>
                <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate!(e.target.value)}
                  className="input-field" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily drive for multiday */}
      {tripType === 'multiday' && dailyDriveHours !== undefined && setDailyDriveHours && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Label>Max driving per day</Label>
            <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{dailyDriveHours} hrs</span>
          </div>
          <input type="range" min={1} max={8} step={0.5} value={dailyDriveHours}
            onChange={(e) => setDailyDriveHours(Number(e.target.value))}
            style={{ width: '100%', accentColor: GREEN }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            <span>1 hr relaxed</span><span>4–5 hrs standard</span><span>8 hrs push</span>
          </div>
        </div>
      )}

      {/* Departure time */}
      <div>
        <Label>What time do you want to leave?</Label>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            [6, '6:00 AM'], [7, '7:00 AM'], [8, '8:00 AM'], [9, '9:00 AM'], [10, '10:00 AM'],
          ].map(([h, label]) => (
            <button
              key={h}
              onClick={() => setDepartureHour(h as number)}
              style={{
                padding: '9px 13px', borderRadius: 9, cursor: 'pointer',
                background: departureHour === h ? 'var(--green-light)' : 'var(--bg-muted)',
                border: `1.5px solid ${departureHour === h ? 'var(--border-active)' : 'var(--border)'}`,
                color: departureHour === h ? GREEN : 'var(--text-muted)',
                fontSize: 12, fontWeight: departureHour === h ? 700 : 500,
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Food */}
      <div>
        <Label>Food stops <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>leave blank for no stops</span></Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
          {visibleDining.map((d) => (
            <div key={d.pref} className={`option-card ${diningPrefs.includes(d.pref) ? 'selected' : ''}`}
              onClick={() => toggleDining(d.pref)} style={{ padding: '11px 6px', gap: 5 }}>
              <span style={{ fontSize: 18 }}>{d.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dietary */}
      <div>
        <Label>Dietary <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>optional</span></Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {DIETARY.map((d) => (
            <button key={d.req} onClick={() => toggleDietary(d.req)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 20,
              background: dietary.includes(d.req) ? 'var(--green-light)' : 'var(--bg-muted)',
              border: `1.5px solid ${dietary.includes(d.req) ? 'var(--border-active)' : 'var(--border)'}`,
              color: dietary.includes(d.req) ? GREEN : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle */}
      <div>
        <Label>Your vehicle</Label>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {vehicles.map((v) => (
            <div key={v.type} className={`option-card ${vehicleType === v.type ? 'selected' : ''}`}
              onClick={() => setVehicleType(v.type)}
              style={{ flexDirection: 'row', padding: '10px 12px', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>{v.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Accommodation — multiday only */}
      {tripType === 'multiday' && (
        <div>
          <Label>Where do you sleep?</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
            {stays.map((s) => (
              <div key={s.type} className={`option-card ${accommodation === s.type ? 'selected' : ''}`}
                onClick={() => setAccommodation(s.type)} style={{ padding: '11px 8px', gap: 5 }}>
                <span style={{ fontSize: 18 }}>{s.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Preselected planning flow: step 0 ────────────────────────────

function StepPlanningDetails({
  preselectedDest, onClearPreselect,
  tripType, setTripType, crewType, setCrewType,
  hasKids, setHasKids, kidsAge, setKidsAge,
  startDate, setStartDate, endDate, setEndDate,
  departureHour, setDepartureHour,
}: {
  preselectedDest: { corridorId: string; destName: string; destCoord: Coordinate }
  onClearPreselect: () => void
  tripType: TripType; setTripType: (t: TripType) => void
  crewType: CrewType; setCrewType: (c: CrewType) => void
  hasKids: boolean; setHasKids: (b: boolean) => void
  kidsAge: KidsAge | null; setKidsAge: (a: KidsAge) => void
  startDate: string; setStartDate: (d: string) => void
  endDate: string; setEndDate: (d: string) => void
  departureHour: number; setDepartureHour: (h: number) => void
}) {
  const showKids = crewType === 'family' || crewType === 'group'
  const minDate = getMinDate(tripType)
  const originCoord = useAppStore((s) => s.originCoord)
  const originName = useAppStore((s) => s.originName)

  // Haversine straight-line → apply 1.3 road factor → estimate hrs at 80km/h
  const straightKm = haversinKm(originCoord, preselectedDest.destCoord)
  const driveKm = Math.round(straightKm * 1.3)
  const driveHrs = driveKm / 80
  const driveLabel = driveHrs < 1
    ? `${Math.round(driveHrs * 60)} min from ${originName}`
    : `${driveHrs.toFixed(1)} hrs from ${originName}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Destination banner */}
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'var(--green-light)', border: '1px solid var(--border-active)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Heading to</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: GREEN }}>📍 {preselectedDest.destName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>🚗 ~{driveLabel}</div>
        </div>
        <button onClick={onClearPreselect} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
        }}>Change</button>
      </div>

      {/* Day / Overnight */}
      <div>
        <Label>How long?</Label>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {([['day', '☀️', 'Day trip'], ['multiday', '🌙', 'Overnight+']] as const).map(
            ([type, emoji, label]) => (
              <button key={type} onClick={() => setTripType(type)} style={{
                flex: 1, padding: '12px', borderRadius: 10,
                background: tripType === type ? 'var(--green-light)' : 'var(--bg-muted)',
                border: `1.5px solid ${tripType === type ? 'var(--border-active)' : 'var(--border)'}`,
                color: tripType === type ? GREEN : 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {emoji} {label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: tripType === 'multiday' ? '1fr 1fr' : '1fr', gap: 10 }}>
        <div>
          <Label>{tripType === 'multiday' ? 'Departing' : 'Date'}</Label>
          <input type="date" value={startDate} min={minDate} onChange={(e) => setStartDate(e.target.value)}
            className="input-field" style={{ marginTop: 6 }} />
        </div>
        {tripType === 'multiday' && (
          <div>
            <Label>Returning</Label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
              className="input-field" style={{ marginTop: 6 }} />
          </div>
        )}
      </div>

      {/* Departure time */}
      <div>
        <Label>What time do you want to leave?</Label>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {([6, 7, 8, 9, 10] as const).map((h) => (
            <button
              key={h}
              onClick={() => setDepartureHour(h)}
              style={{
                padding: '9px 13px', borderRadius: 9, cursor: 'pointer',
                background: departureHour === h ? 'var(--green-light)' : 'var(--bg-muted)',
                border: `1.5px solid ${departureHour === h ? 'var(--border-active)' : 'var(--border)'}`,
                color: departureHour === h ? GREEN : 'var(--text-muted)',
                fontSize: 12, fontWeight: departureHour === h ? 700 : 500,
                transition: 'all 0.15s',
              }}
            >
              {h}:00 {h < 12 ? 'AM' : 'PM'}
            </button>
          ))}
        </div>
      </div>

      {/* Who */}
      <div>
        <Label>Who's coming?</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          {([
            ['solo', '🧍', 'Solo'], ['couple', '👫', 'Couple'],
            ['family', '👨‍👩‍👧', 'Family'], ['group', '🎉', 'Group'],
          ] as const).map(([type, emoji, label]) => (
            <div key={type}
              className={`option-card ${crewType === type ? 'selected' : ''}`}
              onClick={() => setCrewType(type)}
              style={{ flexDirection: 'row', padding: '10px 12px', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {showKids && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
          <ToggleRow label="Any kids?" value={hasKids} onChange={setHasKids} />
          {hasKids && (
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(['toddler', 'school', 'teen', 'mixed'] as KidsAge[]).map((age) => (
                <div key={age} onClick={() => setKidsAge(age)} style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: kidsAge === age ? 'var(--green-light)' : '#fff',
                  border: `1.5px solid ${kidsAge === age ? 'var(--border-active)' : 'var(--border)'}`,
                  fontSize: 12, fontWeight: 600,
                  color: kidsAge === age ? GREEN : 'var(--text-primary)',
                  textTransform: 'capitalize',
                }}>
                  {age === 'toddler' ? '🍼 Toddlers' : age === 'school' ? '🎒 Primary' : age === 'teen' ? '🎧 Teens' : '👶🧒 Mixed'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Generating screen ─────────────────────────────────────────────

function GeneratingScreen({ step, messages }: { step: number; messages: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 24 }}>
      <div style={{ position: 'relative', width: 60, height: 60 }}>
        <svg className="spin-slow" viewBox="0 0 60 60" fill="none" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="30" cy="30" r="26" stroke="var(--green-light)" strokeWidth="3" />
          <path d="M30 4 A26 26 0 0 1 56 30" stroke={GREEN} strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🗺️</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Building your trip…</div>
        <div style={{ fontSize: 13, color: GREEN }}>{messages[step]}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: 'white', flexShrink: 0,
              background: i < step ? GREEN : i === step ? '#B87333' : 'var(--border)',
              transition: 'background 0.3s',
            }}>
              {i < step ? '✓' : ''}
            </span>
            <span style={{ color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{children}</div>
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{
        width: 42, height: 24, borderRadius: 12, cursor: 'pointer',
        background: value ? GREEN : 'var(--border-strong)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  )
}
