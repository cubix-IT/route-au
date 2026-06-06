import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useItineraryBuilder } from '@/hooks/useItineraryBuilder'
import { matchDestinations, getNearbySubDests, VICTORIAN_CLUSTERS } from '@/data/victorianClusters.ts'
import { getCurrentSeason } from '@/utils/season'
import { fetchWeatherForCoord } from '@/api/weather'
import type { MatchedDest, TripInterest } from '@/data/victorianClusters.ts'
import type {
  TripType, CrewType, VehicleType, FuelType,
  AccommodationPreference, VibeTag, DiningPref,
  HikingIntensity, DietaryReq, KidsAge, Coordinate,
} from '@/types'

const GREEN = '#3A6B4F'
const season = getCurrentSeason()

// Approximate Victorian sunset hours by month (conservative — when it gets dark)
const VIC_SUNSET_HOUR: Record<number, number> = {
  1:20, 2:20, 3:19, 4:18, 5:17, 6:17, 7:17, 8:18, 9:18, 10:19, 11:20, 12:20,
}
function getSunsetHour(): number { return VIC_SUNSET_HOUR[new Date().getMonth() + 1] ?? 18 }

function DepartureTimePicker({ departureHour, setDepartureHour, tripDate }: {
  departureHour: number; setDepartureHour: (h: number) => void; tripDate?: string
}) {
  const nowH = new Date().getHours()
  const isToday = !tripDate || tripDate === new Date().toISOString().split('T')[0]
  const allSlots: [number, string][] = [
    [6,'6 AM'],[7,'7 AM'],[8,'8 AM'],[9,'9 AM'],[10,'10 AM'],
    [11,'11 AM'],[12,'12 PM'],[13,'1 PM'],[14,'2 PM'],[15,'3 PM'],
  ]
  const slots = isToday ? allSlots.filter(([h]) => h >= nowH) : allSlots
  // Evening/night — show full list for next-day planning
  const show = slots.length > 0 ? slots : allSlots

  // Auto-correct past hour in an effect, not during render
  useEffect(() => {
    if (isToday && departureHour < nowH && show.length > 0) {
      setDepartureHour(show[0][0])
    }
  }, [isToday, nowH, departureHour]) // eslint-disable-line react-hooks/exhaustive-deps

  const sunsetH = getSunsetHour()
  const isWinter = [5,6,7].includes(new Date().getMonth() + 1)
  const showSunsetWarning = departureHour >= sunsetH - 2 && (isWinter || departureHour >= 16)

  return (
    <div>
      <Label>What time do you want to leave?</Label>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {show.map(([h, label]) => (
          <button key={h} onClick={() => setDepartureHour(h)} style={{
            padding: '9px 13px', borderRadius: 9, cursor: 'pointer',
            background: departureHour === h ? 'var(--green-light)' : 'var(--bg-muted)',
            border: `1.5px solid ${departureHour === h ? 'var(--border-active)' : 'var(--border)'}`,
            color: departureHour === h ? GREEN : 'var(--text-muted)',
            fontSize: 12, fontWeight: departureHour === h ? 700 : 500,
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>
      {showSunsetWarning && (
        <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#FFF7ED', border: '1px solid rgba(251,146,60,0.4)', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
          🌅 Sunset around {sunsetH}:00 PM in Victoria{isWinter ? ' this time of year' : ''}. Leaving this late means driving back in the dark — we recommend an early morning departure for safety.
        </div>
      )}
    </div>
  )
}

function haversinKm(a: Coordinate, b: Coordinate): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

// ── Interest definitions ──────────────────────────────────────────

const INTEREST_GRAD: Record<string, string> = {
  Wildlife:   'linear-gradient(145deg, #1a472a 0%, #2d6a4f 100%)',
  Beach:      'linear-gradient(145deg, #0c4a6e 0%, #0284c7 100%)',
  Wine:       'linear-gradient(145deg, #581c87 0%, #9333ea 100%)',
  Hiking:     'linear-gradient(145deg, #1e3a5f 0%, #3b82f6 100%)',
  Cycling:    'linear-gradient(145deg, #064e3b 0%, #10b981 100%)',
  HotSprings: 'linear-gradient(145deg, #9f1239 0%, #f97316 100%)',
  History:    'linear-gradient(145deg, #78350f 0%, #c97c2f 100%)',
  Food:       'linear-gradient(145deg, #92400e 0%, #f59e0b 100%)',
  Relaxation: 'linear-gradient(145deg, #164e63 0%, #06b6d4 100%)',
  FamilyFun:  'linear-gradient(145deg, #92400e 0%, #fbbf24 100%)',
  Adventure:  'linear-gradient(145deg, #14532d 0%, #22c55e 100%)',
  Scenic:     'linear-gradient(145deg, #1e3a8a 0%, #60a5fa 100%)',
}

const INTERESTS: { id: TripInterest; emoji: string; label: string }[] = [
  { id: 'Wildlife',   emoji: '🦘', label: 'Wildlife' },
  { id: 'Beach',      emoji: '🌊', label: 'Beach' },
  { id: 'Wine',       emoji: '🍷', label: 'Wine & cellar doors' },
  { id: 'Hiking',     emoji: '🥾', label: 'Hiking & trails' },
  { id: 'Cycling',    emoji: '🚴', label: 'Cycling & rail trails' },
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
  const [departureHour, setDepartureHour] = useState(() => {
    const h = new Date().getHours()
    if (h < 6) return 6   // before 6am — suggest 6am
    if (h <= 15) return h  // during the day — default to now
    return 8               // evening/night — planning for tomorrow, default 8am
  })
  const [diningPrefs, setDiningPrefs] = useState<DiningPref[]>([])
  const [dietary] = useState<DietaryReq[]>([])
  const [vehicleType, setVehicleType] = useState<VehicleType>('AWD')
  const [fuelType, setFuelType] = useState<FuelType>('Unleaded95')
  const fuelBrand = 'Any'
  const [skipFuel, setSkipFuel] = useState(false)
  const [accommodation, setAccommodation] = useState<AccommodationPreference>('Any')

  const totalSteps = isPreselected ? 3 : 6 // 0..2 for preselect, 0..5 for discovery

  if (!isWizardOpen) return null

  // ── Derived dest info ──
  const effectiveDest = isPreselected
    ? { name: preselectedDest.destName, coord: preselectedDest.destCoord, clusterId: preselectedDest.corridorId, destId: preselectedDest.destId }
    : pickedDest
      ? { name: pickedDest.sub.name, coord: pickedDest.sub.coord, clusterId: pickedDest.cluster.id, destId: pickedDest.sub.id }
      : null

  const toggleInterest = (id: TripInterest) =>
    setInterests((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id])


  const handleBack = () => {
    if (step === 0) { setPreselectedDest(null); setWizardOpen(false); return }
    setStep((s) => s - 1)
  }

  const handleNext = async () => {
    const lastStep = isPreselected ? 2 : 5

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
        Cycling: 'Cycling', HotSprings: 'HotSprings', History: 'History',
        FamilyFun: 'FamilyAttractions', Adventure: 'Cycling', Scenic: 'Lookouts',
        Wine: 'Wineries', Food: 'Chilling', Relaxation: 'Chilling',
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
      fuel_type: (skipFuel || vehicleType === 'Electric' ? 'Electric' : fuelType) as FuelType,
      fuel_brand: skipFuel ? null : fuelBrand,
      skip_fuel: skipFuel,
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
    if (step === 0) return !!startDate && (tripType === 'day' || !!endDate) && (!hasKids || !!kidsAge)
    if (step === 1) return interests.length > 0
    if (step === 2) return !!pickedDest
    return true
  })()

  const msgs = ['Finding your route…', 'Matching experiences…', 'Building your day…', 'Almost ready…']

  // ── Step labels + subtitles (#17) ──
  const discoveryStepLabels = ['How far & who', 'What you love', 'Pick a spot', 'Finishing touches', 'Trip summary']
  const discoveryStepSubtitles = [
    'Tell us how far you want to travel and who\'s coming',
    'We\'ll match destinations to what you enjoy',
    'Choose from your personalised recommendations',
    'Set dates, food preferences, and your vehicle',
    'Review your trip before we build it',
  ]
  const preselectedStepLabels = ['Your trip details', 'Your vehicle', 'Trip summary']
  const preselectedStepSubtitles = [
    'Set your dates and who\'s coming',
    'Help us find fuel stops along the way',
    'Review your trip before we build it',
  ]
  const stepLabels = isPreselected ? preselectedStepLabels : discoveryStepLabels
  const stepSubtitles = isPreselected ? preselectedStepSubtitles : discoveryStepSubtitles

  const isPickStep = !isPreselected && step === 2

  return (
    <div className="wizard-overlay">
      <div
        className="wizard-card animate-fade-up"
        style={isPickStep ? { maxWidth: 640 } : undefined}
      >

        {/* Header */}
        <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em',
            }}>
              {!generating ? stepLabels[step] : 'Building your trip…'}
            </div>
            {/* Step subtitle — #17 */}
            {!generating && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {stepSubtitles[step] ?? ''}
              </div>
            )}
            {generating && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Hang tight</div>
            )}
          </div>
          {/* Right: progress + step counter + close — #16, #18 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, marginLeft: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Step X of Y — #16 */}
              {!generating && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  {step + 1} / {totalSteps}
                </span>
              )}
              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} style={{
                    width: i === step ? 16 : 5, height: 5, borderRadius: 3,
                    background: i <= step ? GREEN : 'var(--border)',
                    transition: 'all 0.25s',
                  }} />
                ))}
              </div>
              {/* Close X — #18 */}
              <button
                onClick={() => setWizardOpen(false)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none',
                  background: 'var(--bg-muted)', color: 'var(--text-muted)',
                  fontSize: 14, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
                title="Close"
              >✕</button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div key={`${step}-${generating}`} className="animate-fade-up" style={{
          flex: 1,
          overflowY: isPickStep ? 'hidden' : 'auto',
          padding: isPickStep ? '12px 0 0' : '16px 24px',
        }}>
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
                <StepVehicle
                  vehicleType={vehicleType} setVehicleType={setVehicleType}
                  fuelType={fuelType} setFuelType={setFuelType}
                  skipFuel={skipFuel} setSkipFuel={setSkipFuel}
                />
              )}
              {step === 2 && (
                <StepSummary
                  effectiveDest={effectiveDest}
                  startDate={startDate}
                  endDate={endDate}
                  tripType={tripType}
                  crewType={crewType}
                  vehicleType={vehicleType}
                  fuelType={skipFuel ? 'Electric' : fuelType}
                  fuelBrand={skipFuel ? null : fuelBrand}
                  skipFuel={skipFuel}
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
                  startDate={startDate} setStartDate={setStartDate}
                  endDate={endDate} setEndDate={setEndDate}
                  departureHour={departureHour} setDepartureHour={setDepartureHour}
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
                  accommodation={accommodation} setAccommodation={setAccommodation}
                  dailyDriveHours={dailyDriveHours} setDailyDriveHours={setDailyDriveHours}
                  departureHour={departureHour} setDepartureHour={setDepartureHour}
                  destCoord={pickedDest?.sub.coord ?? undefined}
                  hideDepartureTime
                />
              )}
              {step === 4 && (
                <StepVehicle
                  vehicleType={vehicleType} setVehicleType={setVehicleType}
                  fuelType={fuelType} setFuelType={setFuelType}
                  skipFuel={skipFuel} setSkipFuel={setSkipFuel}
                />
              )}
              {step === 5 && (
                <StepSummary
                  effectiveDest={effectiveDest}
                  startDate={startDate}
                  endDate={endDate}
                  tripType={tripType}
                  crewType={crewType}
                  vehicleType={vehicleType}
                  fuelType={skipFuel ? 'Electric' : fuelType}
                  fuelBrand={skipFuel ? null : fuelBrand}
                  skipFuel={skipFuel}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!generating && (
          <div style={{ padding: '12px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={handleBack} className="mu-btn-ghost" style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'var(--bg-muted)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
            }}>
              ← Back
            </button>
            <button onClick={handleNext} disabled={!canContinue} className={canContinue ? 'mu-btn-primary' : ''} style={{
              flex: 1, padding: '12px', borderRadius: 10,
              background: canContinue ? GREEN : 'var(--bg-muted)',
              border: canContinue ? 'none' : '1px solid var(--border)',
              color: canContinue ? '#fff' : 'var(--text-muted)',
              fontSize: 14, fontWeight: 600,
              cursor: canContinue ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}>
              {step === (isPreselected ? 1 : 4) ? 'Build my trip →' : step === 1 && !isPreselected ? 'Show me options →' : 'Continue →'}
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
  startDate, setStartDate, endDate, setEndDate,
  departureHour, setDepartureHour,
}: {
  maxDriveHours: number; setMaxDriveHours: (n: number) => void
  tripType: TripType; setTripType: (t: TripType) => void
  crewType: CrewType; setCrewType: (c: CrewType) => void
  hasKids: boolean; setHasKids: (b: boolean) => void
  kidsAge: KidsAge | null; setKidsAge: (a: KidsAge) => void
  startDate: string; setStartDate: (d: string) => void
  endDate: string; setEndDate: (d: string) => void
  departureHour?: number; setDepartureHour?: (h: number) => void
}) {
  const showKids = crewType === 'family' || crewType === 'group'

  // How many destinations fit within this drive time
  const matching = VICTORIAN_CLUSTERS.flatMap((c) => c.subDests)
    .filter((s) => s.driveTimeHours <= maxDriveHours).length

  const driveLabel = maxDriveHours < 1
    ? `${Math.round(maxDriveHours * 60)} min`
    : maxDriveHours % 1 === 0
      ? `${maxDriveHours}h`
      : `${Math.floor(maxDriveHours)}h ${Math.round((maxDriveHours % 1) * 60)}m`

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
          <Label>Max distance from home — how far will you travel?</Label>
          <span style={{ fontSize: 22, fontWeight: 800, color: GREEN, letterSpacing: '-0.04em', fontFamily: "'Fraunces', Georgia, serif", minWidth: 80, textAlign: 'right' }}>
            {driveLabel}
          </span>
        </div>
        <input
          type="range" min={0.75} max={4} step={0.25} value={maxDriveHours}
          onChange={(e) => setMaxDriveHours(Math.round(Number(e.target.value) * 4) / 4)}
          style={{ width: '100%', accentColor: GREEN }}
        />
        {/* Tick marks aligned to slider range 0.75–4 (step 0.25) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          <span>45 min</span>
          <span>1.5 hrs</span>
          <span>2.5 hrs</span>
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

      {/* When are you going? */}
      <div>
        <Label>When are you going?</Label>
        <div style={{ marginTop: 10 }}>
          <DateDayStrip
            value={startDate}
            onChange={setStartDate}
            tripType={tripType}
            endDate={endDate}
            onEndDateChange={setEndDate}
          />
        </div>
      </div>

      {/* Departure time — collected here so it's not repeated later */}
      {departureHour !== undefined && setDepartureHour && (
        <DepartureTimePicker departureHour={departureHour} setDepartureHour={setDepartureHour} tripDate={startDate} />
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
        {visible.map((i) => {
          const selected = interests.includes(i.id)
          return (
            <div
              key={i.id}
              onClick={() => toggleInterest(i.id)}
              style={{
                position: 'relative',
                borderRadius: 14,
                background: INTEREST_GRAD[i.id] ?? '#2d5440',
                padding: '18px 8px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                cursor: 'pointer',
                outline: selected ? '3px solid #fff' : 'none',
                boxShadow: selected
                  ? `0 0 0 4px ${GREEN}, 0 4px 14px rgba(0,0,0,0.3)`
                  : '0 2px 8px rgba(0,0,0,0.14)',
                transform: selected ? 'scale(1.06)' : 'scale(1)',
                transition: 'all 0.18s',
                filter: selected ? 'none' : 'brightness(0.82) saturate(0.85)',
              }}
            >
              <span style={{ fontSize: 26 }}>{i.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.3, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{i.label}</span>
              {selected && (
                <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: GREEN, fontWeight: 900 }}>✓</div>
              )}
            </div>
          )
        })}
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

function DestCard({ match, idx, isPicked, onPick, isHovered, onHover }: {
  match: MatchedDest
  idx: number
  isPicked: boolean
  onPick: () => void
  isHovered: boolean
  onHover: (hov: boolean) => void
}) {
  const hrs = match.sub.driveTimeHours
  const driveLabel = hrs < 1 ? `${Math.round(hrs * 60)} min` : `${hrs.toFixed(hrs === Math.floor(hrs) ? 0 : 1)} hrs`

  return (
    <div
      onClick={onPick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        borderRadius: 10,
        cursor: 'pointer',
        flexShrink: 0,
        border: `1.5px solid ${isPicked ? GREEN : isHovered ? 'rgba(58,107,79,0.35)' : 'var(--border)'}`,
        background: isPicked ? '#F0FDF4' : isHovered ? '#F8F7F4' : '#fff',
        boxShadow: isPicked ? `0 0 0 2px ${GREEN}30` : isHovered ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.15s ease',
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      {/* Drive badge */}
      <div style={{
        flexShrink: 0, textAlign: 'center', width: 40,
        padding: '3px 0', borderRadius: 8,
        background: isPicked ? GREEN : '#F3F4F6',
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: isPicked ? '#fff' : '#374151', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {hrs < 1 ? Math.round(hrs * 60) : hrs.toFixed(hrs === Math.floor(hrs) ? 0 : 1)}
        </div>
        <div style={{ fontSize: 7.5, color: isPicked ? 'rgba(255,255,255,0.8)' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          {hrs < 1 ? 'min' : 'hrs'}
        </div>
      </div>

      {/* Name + region */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          {idx === 0 && (
            <span style={{
              fontSize: 7.5, fontWeight: 800, color: '#B87333',
              background: '#FFF5EB', padding: '1px 5px', borderRadius: 3,
              letterSpacing: '0.06em', flexShrink: 0, border: '1px solid rgba(184,115,51,0.25)',
            }}>TOP PICK</span>
          )}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1C1B1F', lineHeight: 1.3 }}>
          {match.sub.name}
        </div>
        <div style={{ fontSize: 10.5, color: '#6B7280', marginTop: 1 }}>
          {match.cluster.name} · {driveLabel}
        </div>
        {match.matchReasons.length > 0 && (
          <div style={{ fontSize: 9.5, color: '#3A6B4F', marginTop: 3, lineHeight: 1.4 }}>
            {match.matchReasons.slice(0, 2).join(' · ')}
          </div>
        )}
      </div>

      {/* Check */}
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        background: isPicked ? GREEN : 'transparent',
        border: `1.5px solid ${isPicked ? GREEN : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, color: '#fff', transition: 'all 0.15s',
      }}>
        {isPicked ? '✓' : ''}
      </div>
    </div>
  )
}

function StepPickDest({ suggestions, picked, onPick }: {
  suggestions: MatchedDest[]
  picked: MatchedDest | null
  onPick: (d: MatchedDest) => void
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string | null>(null)

  // All destinations across every cluster — used when searching or filtering by region
  const allDests: MatchedDest[] = VICTORIAN_CLUSTERS.flatMap((cluster) =>
    cluster.subDests.map((sub) => {
      const existing = suggestions.find((s) => s.sub.id === sub.id)
      return existing ?? { sub, cluster, score: 0, matchReasons: [] }
    })
  )

  // All regions (always show all of Victoria)
  const regions = VICTORIAN_CLUSTERS.map((c) => ({ id: c.id, name: c.name }))

  const isSearching = search.trim().length > 0 || regionFilter !== null

  // When searching/filtering: draw from allDests — matched suggestions first, then the rest
  const matchedIds = new Set(suggestions.map((s) => s.sub.id))
  const filtered = (isSearching ? allDests : suggestions).filter((s) => {
    if (regionFilter && s.cluster.id !== regionFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return s.sub.name.toLowerCase().includes(q) || s.cluster.name.toLowerCase().includes(q)
    }
    return true
  })
  // Matched results first when browsing all
  const sortedFiltered = isSearching
    ? [...filtered].sort((a, b) => (matchedIds.has(b.sub.id) ? 1 : 0) - (matchedIds.has(a.sub.id) ? 1 : 0))
    : filtered

  const preview = picked ?? (hoveredId ? sortedFiltered.find((s) => s.sub.id === hoveredId) ?? null : sortedFiltered[0] ?? null)

  if (suggestions.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Nothing matched exactly</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try increasing your drive time or picking fewer interests.</div>
      </div>
    )
  }

  const nearbyStops = preview && picked && picked.sub.id === preview.sub.id
    ? getNearbySubDests(picked.sub)
    : []

  const previewImgUrl = preview ? (preview.sub.imageUrl ?? preview.cluster.imageUrl) : null
  const [imgError, setImgError] = useState<string | null>(null) // stores the URL that failed
  const previewHrs = preview ? preview.sub.driveTimeHours : 0
  const previewDriveLabel = previewHrs < 1
    ? `${Math.round(previewHrs * 60)} min drive`
    : `${previewHrs.toFixed(previewHrs === Math.floor(previewHrs) ? 0 : 1)} hrs drive`

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 0, height: '100%', minHeight: isMobile ? 'auto' : 480 }}>

      {/* LEFT: Scrollable list */}
      <div style={{
        width: isMobile ? '100%' : 240,
        maxHeight: isMobile ? 320 : undefined,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        overflow: 'hidden',
        background: '#FAFAF9',
      }}>
        <div style={{ padding: '14px 14px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px', marginBottom: 8 }}>
            Here's where you should go
          </div>
          {/* Search input */}
          <input
            type="search"
            placeholder="Search destinations…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setRegionFilter(null) }}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 10px', borderRadius: 8,
              border: '1.5px solid var(--border)', background: '#fff',
              fontSize: 12, color: 'var(--text-primary)', outline: 'none',
            }}
          />
        </div>

        {/* Region filter chips */}
        {!search && regions.length > 1 && (
          <div style={{ display: 'flex', gap: 5, padding: '0 10px 8px', overflowX: 'auto', flexShrink: 0 }}>
            <button
              onClick={() => setRegionFilter(null)}
              style={{
                padding: '3px 10px', borderRadius: 12, flexShrink: 0,
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
                background: regionFilter === null ? '#1C1B1F' : '#fff',
                color: regionFilter === null ? '#fff' : '#6B7280',
                border: `1.5px solid ${regionFilter === null ? '#1C1B1F' : 'var(--border)'}`,
              }}
            >All</button>
            {regions.map((r) => (
              <button
                key={r.id}
                onClick={() => setRegionFilter(r.id)}
                style={{
                  padding: '3px 10px', borderRadius: 12, flexShrink: 0,
                  fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: regionFilter === r.id ? '#1C1B1F' : '#fff',
                  color: regionFilter === r.id ? '#fff' : '#6B7280',
                  border: `1.5px solid ${regionFilter === r.id ? '#1C1B1F' : 'var(--border)'}`,
                }}
              >{r.name}</button>
            ))}
          </div>
        )}

        {/* "We recommend" banner — shown when no search/filter active and top pick has reasons */}
        {!search && !regionFilter && suggestions[0]?.matchReasons.length > 0 && (
          <div style={{
            margin: '0 10px 8px', padding: '8px 10px', borderRadius: 8,
            background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)',
            border: '1px solid rgba(58,107,79,0.2)',
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#3A6B4F', letterSpacing: '0.06em', marginBottom: 2 }}>
              WE RECOMMEND
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1B1F' }}>{suggestions[0].sub.name}</div>
            <div style={{ fontSize: 10.5, color: '#6B7280', marginTop: 1 }}>
              {suggestions[0].matchReasons.join(' · ')}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {sortedFiltered.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No destinations match "{search}"
            </div>
          ) : sortedFiltered.map((match, idx) => {
            const isFirstUnmatched = isSearching && idx > 0
              && !matchedIds.has(match.sub.id)
              && matchedIds.has(sortedFiltered[idx - 1].sub.id)
            return (
              <div key={match.sub.id}>
                {isFirstUnmatched && (
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '8px 2px 4px' }}>
                    Other destinations
                  </div>
                )}
                <DestCard
                  match={match}
                  idx={matchedIds.has(match.sub.id) ? suggestions.findIndex((s) => s.sub.id === match.sub.id) : 999}
                  isPicked={picked?.sub.id === match.sub.id}
                  onPick={() => onPick(match)}
                  isHovered={hoveredId === match.sub.id}
                  onHover={(hov) => setHoveredId(hov ? match.sub.id : null)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT: Preview panel — image top, info bottom */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: isMobile ? 'visible' : 'hidden' }}>
        {preview ? (
          <>
            {/* Top: hero image */}
            <div
              key={preview.sub.id}
              style={{
                height: 190, flexShrink: 0, position: 'relative', overflow: 'hidden',
                backgroundImage: (previewImgUrl && imgError !== previewImgUrl) ? `url(${previewImgUrl})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
                background: (!previewImgUrl || imgError === previewImgUrl)
                  ? `linear-gradient(145deg, ${preview.cluster.gradientFrom}, ${preview.cluster.gradientTo})`
                  : undefined,
                transition: 'background-image 0.25s',
              }}
            >
              {/* Hidden img to detect load failure */}
              {previewImgUrl && imgError !== previewImgUrl && (
                <img
                  src={previewImgUrl}
                  alt=""
                  onError={() => setImgError(previewImgUrl)}
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                />
              )}
              {/* Drive + match badges */}
              <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', gap: 5 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
                  padding: '3px 9px', borderRadius: 20,
                }}>🚗 {previewDriveLabel}</span>
                {preview.matchReasons.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    background: `${GREEN}cc`, backdropFilter: 'blur(6px)',
                    padding: '3px 9px', borderRadius: 20,
                  }}>✦ {preview.matchReasons[0]}</span>
                )}
              </div>
              {/* Bottom fade into info section */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(to top, #fff 0%, transparent 100%)' }} />
            </div>

            {/* Bottom: destination info */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 16px', background: '#fff' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
                {preview.cluster.name}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1C1B1F', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 10, fontFamily: "'Fraunces', Georgia, serif" }}>
                {preview.sub.name}
              </div>

              {/* Highlights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {preview.sub.highlights.slice(0, 4).map((h) => (
                  <div key={h} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11.5, color: '#374151', lineHeight: 1.45 }}>
                    <span style={{ color: '#B87333', flexShrink: 0, marginTop: 1, fontSize: 10 }}>▸</span>{h}
                  </div>
                ))}
              </div>

              {/* Nearby stops — only after picking */}
              {nearbyStops.length > 0 && (
                <div style={{ marginTop: 12, padding: '10px 12px', background: '#F8F7F4', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 7 }}>
                    Nearby stops worth adding
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {nearbyStops.map(({ sub, cluster }) => {
                      const nHrs = sub.driveTimeHours
                      const nLabel = nHrs < 1 ? `${Math.round(nHrs * 60)} min` : `${nHrs.toFixed(nHrs === Math.floor(nHrs) ? 0 : 1)} hrs`
                      return (
                        <div key={sub.id} style={{ padding: '5px 9px', borderRadius: 8, background: '#fff', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1C1B1F' }}>{sub.name}</div>
                          <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>{cluster.name} · {nLabel}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Status hint */}
              {!picked && (
                <div style={{ marginTop: 12, fontSize: 10.5, color: '#9CA3AF', fontStyle: 'italic' }}>
                  Click a destination in the list to select it
                </div>
              )}
              {picked && picked.sub.id === preview.sub.id && (
                <div style={{ marginTop: 12, fontSize: 11, color: GREEN, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: GREEN, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>✓</span>
                  Selected — hit Continue to proceed
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 28 }}>🗺</span>
            Hover a destination to preview
          </div>
        )}
      </div>
    </div>
  )
}

// ── Date day-strip with weather ───────────────────────────────────

function weatherEmoji(description: string): string {
  if (description === 'Clear sky') return '☀️'
  if (description === 'Partly cloudy') return '⛅'
  if (description === 'Foggy') return '🌫️'
  if (description === 'Rainy' || description === 'Showers') return '🌧️'
  if (description === 'Snowfall') return '❄️'
  if (description === 'Thunderstorm') return '⛈️'
  return '🌤️'
}

function DateDayStrip({
  value, onChange, tripType, endDate, onEndDateChange, destCoord,
}: {
  value: string
  onChange: (d: string) => void
  tripType: TripType
  endDate?: string
  onEndDateChange?: (d: string) => void
  destCoord?: Coordinate
}) {
  const [page, setPage] = useState(0)
  const [wx, setWx] = useState<{ emoji: string; max: number }[] | null>(null)

  useEffect(() => {
    if (!destCoord) return
    fetchWeatherForCoord(destCoord, 14)
      .then((days) => setWx(days.map((d) => ({ emoji: weatherEmoji(d.description), max: Math.round(d.temp_max_c) }))))
      .catch(() => {})
  }, [destCoord?.lat, destCoord?.lng])

  const LAST_SLOT_HOUR = 15 // last departure slot is 3pm
  const nowH = new Date().getHours()
  const todayIsTooLate = nowH >= LAST_SLOT_HOUR
  // Start from tomorrow if it's too late to leave today
  const startOffset = todayIsTooLate ? 1 : 0
  const PAGE_SIZE = 5
  const allDays = Array.from({ length: 10 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + startOffset + i)
    return {
      iso: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-AU', { weekday: 'short' }),
      num: d.getDate(),
      mon: d.toLocaleDateString('en-AU', { month: 'short' }),
    }
  })

  const visible = allDays.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => setPage(0)} disabled={page === 0}
          style={{ width: 28, height: 28, borderRadius: 14, border: '1px solid var(--border)', background: '#fff', cursor: page === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page === 0 ? 'var(--border)' : GREEN, fontSize: 15, fontWeight: 700, flexShrink: 0 }}
        >‹</button>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
          {visible.map((d, idx) => {
            const wIdx = page * PAGE_SIZE + idx
            const selected = d.iso === value
            return (
              <button key={d.iso} onClick={() => onChange(d.iso)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '7px 2px', borderRadius: 10, cursor: 'pointer', gap: 1,
                background: selected ? 'var(--green-light)' : 'var(--bg-muted)',
                border: `1.5px solid ${selected ? GREEN : 'transparent'}`,
              }}>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: selected ? GREEN : '#9CA3AF', textTransform: 'uppercase' }}>{d.day}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: selected ? GREEN : '#1C1B1F' }}>{d.num}</span>
                <span style={{ fontSize: 8, color: '#9CA3AF' }}>{d.mon}</span>
                {wx?.[wIdx] && <span style={{ fontSize: 11, lineHeight: 1.2 }}>{wx[wIdx].emoji}</span>}
                {wx?.[wIdx] && <span style={{ fontSize: 8, color: selected ? GREEN : '#6B7280' }}>{wx[wIdx].max}°</span>}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(p + 1, 1))} disabled={page === 1}
          style={{ width: 28, height: 28, borderRadius: 14, border: '1px solid var(--border)', background: '#fff', cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page === 1 ? 'var(--border)' : GREEN, fontSize: 15, fontWeight: 700, flexShrink: 0 }}
        >›</button>
      </div>

      {tripType === 'multiday' && value && onEndDateChange && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>How many nights?</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6].map((n) => {
              const ret = new Date(value + 'T00:00:00')
              ret.setDate(ret.getDate() + n)
              const retIso = ret.toISOString().split('T')[0]
              const sel = endDate === retIso
              return (
                <button key={n} onClick={() => onEndDateChange(retIso)} style={{
                  padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                  background: sel ? 'var(--green-light)' : 'var(--bg-muted)',
                  border: `1.5px solid ${sel ? GREEN : 'var(--border)'}`,
                  color: sel ? GREEN : 'var(--text-muted)', fontSize: 12, fontWeight: 700,
                }}>
                  {n}{n === 1 ? ' night' : ' nights'}
                </button>
              )
            })}
          </div>
          {endDate && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
              Returning {new Date(endDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Step 3 (Discovery) / Step 1 (Preselect): Preferences ─────────

function StepPreferences({
  hasKids, kidsAge, tripType,
  accommodation, setAccommodation,
  dailyDriveHours, setDailyDriveHours,
  departureHour, setDepartureHour,
  startDate, setStartDate,
  endDate, setEndDate,
  destCoord,
  hideDepartureTime,
}: {
  hasKids: boolean; kidsAge: KidsAge | null; tripType: TripType
  accommodation: AccommodationPreference; setAccommodation: (a: AccommodationPreference) => void
  dailyDriveHours?: number; setDailyDriveHours?: (n: number) => void
  departureHour: number; setDepartureHour: (h: number) => void
  startDate?: string; setStartDate?: (d: string) => void
  endDate?: string; setEndDate?: (d: string) => void
  destCoord?: Coordinate
  hideDepartureTime?: boolean
}) {
  void hasKids; void kidsAge; void accommodation; void setAccommodation

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Finishing touches
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Almost there — just your departure time and a couple of preferences.</p>
      </div>

      {/* Dates — shown here for discovery flow */}
      {setStartDate && (
        <div>
          <Label>When are you going?</Label>
          <div style={{ marginTop: 10 }}>
            <DateDayStrip
              value={startDate ?? ''}
              onChange={setStartDate}
              tripType={tripType}
              endDate={endDate}
              onEndDateChange={setEndDate}
              destCoord={destCoord}
            />
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
            onChange={(e) => setDailyDriveHours(Math.round(Number(e.target.value) * 2) / 2)}
            style={{ width: '100%', accentColor: GREEN }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            <span>1 hr relaxed</span><span>4–5 hrs standard</span><span>8 hrs push</span>
          </div>
        </div>
      )}

      {/* Departure time — hidden in preselected flow (already set in step 0) */}
      {!hideDepartureTime && (
        <DepartureTimePicker departureHour={departureHour} setDepartureHour={setDepartureHour} tripDate={startDate} />
      )}

      {/* Accommodation question hidden — data coming soon */}
    </div>
  )
}

// ── Vehicle & fuel step ───────────────────────────────────────────

function StepVehicle({
  vehicleType, setVehicleType,
  fuelType, setFuelType,
  skipFuel, setSkipFuel,
}: {
  vehicleType: VehicleType; setVehicleType: (v: VehicleType) => void
  fuelType: FuelType; setFuelType: (f: FuelType) => void
  skipFuel: boolean; setSkipFuel: (s: boolean) => void
}) {
  const vehicles = [
    { type: 'Sedan' as VehicleType,            emoji: '🚗', label: 'Sedan / Hatch' },
    { type: 'AWD' as VehicleType,              emoji: '🚙', label: 'SUV / AWD' },
    { type: 'HighClearance4WD' as VehicleType, emoji: '🛻', label: '4WD' },
    { type: '4WD_WithCaravan' as VehicleType,  emoji: '🚐', label: 'Van / Caravan' },
    { type: 'Electric' as VehicleType,         emoji: '⚡', label: 'Electric' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Your vehicle & fuel
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          We'll show cheapest fuel stations on your route and estimate your drive cost.
        </p>
      </div>

      {/* Vehicle type */}
      <div>
        <Label>What are you driving?</Label>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {vehicles.map((v) => (
            <div key={v.type} className={`option-card ${vehicleType === v.type ? 'selected' : ''}`}
              onClick={() => setVehicleType(v.type)}
              style={{ flexDirection: 'row', padding: '10px 14px', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 20 }}>{v.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {vehicleType !== 'Electric' && !skipFuel && (
        <div>
          <Label>Fuel type</Label>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {([
              { type: 'Unleaded91' as FuelType, label: 'U91' },
              { type: 'E10'        as FuelType, label: 'E10' },
              { type: 'Unleaded95' as FuelType, label: 'U95' },
              { type: 'Unleaded98' as FuelType, label: 'U98' },
              { type: 'Diesel'     as FuelType, label: 'Diesel' },
            ]).map((f) => (
              <div key={f.type} className={`option-card ${fuelType === f.type ? 'selected' : ''}`}
                onClick={() => setFuelType(f.type)}
                style={{ flexDirection: 'row', padding: '10px 16px', gap: 0, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vehicleType !== 'Electric' && (
        <button
          onClick={() => setSkipFuel(!skipFuel)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 12,
            background: skipFuel ? '#F3F4F6' : 'transparent',
            border: `1.5px dashed ${skipFuel ? '#9CA3AF' : 'var(--border)'}`,
            color: skipFuel ? '#6B7280' : 'var(--text-muted)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 18 }}>{skipFuel ? '✓' : '⏭'}</span>
          {skipFuel ? "Skipped — fuel prices won't be shown" : 'Skip fuel preferences'}
        </button>
      )}
    </div>
  )
}

// ── Trip summary step ─────────────────────────────────────────────

interface SummaryFuelStation {
  id: string
  name: string
  brand: string
  address: string
  lat: number
  lng: number
  priceCents: number
  pricePerLitre: number
  distanceKm: number
}

function StepSummary({ effectiveDest, startDate, endDate, tripType, crewType, vehicleType, fuelType, fuelBrand, skipFuel }: {
  effectiveDest: { name: string; coord: Coordinate } | null
  startDate: string
  endDate: string
  tripType: TripType
  crewType: CrewType
  vehicleType: VehicleType
  fuelType: FuelType
  fuelBrand?: string | null
  skipFuel?: boolean
}) {
  const originCoord = useAppStore((s) => s.originCoord)
  const originName = useAppStore((s) => s.originName)
  const [fuelStations, setFuelStations] = useState<SummaryFuelStation[]>([])
  const [loadingFuel, setLoadingFuel] = useState(false)

  const destCoord = effectiveDest?.coord
  const straightKm = destCoord ? haversinKm(originCoord, destCoord) : 0
  const estKm = Math.round(straightKm * 1.3)
  const estKmRound = estKm * 2
  const fuelUsedL = vehicleType === 'Electric' || skipFuel ? 0 : (estKmRound * 10) / 100

  useEffect(() => {
    if (skipFuel || vehicleType === 'Electric' || !destCoord) return
    const lat = (originCoord.lat + destCoord.lat) / 2
    const lng = (originCoord.lng + destCoord.lng) / 2
    setLoadingFuel(true)
    const brandParam = fuelBrand && fuelBrand !== 'Any' ? `&brand=${encodeURIComponent(fuelBrand)}` : ''
    // Try midpoint first with 40km radius; fallback to near origin if empty
    fetch(`/api/fuel?lat=${lat}&lng=${lng}&fuelType=${fuelType}&limit=3&radius=40${brandParam}`)
      .then((r) => r.json())
      .then(async (data) => {
        const stations = (data as { stations: SummaryFuelStation[] }).stations ?? []
        if (stations.length > 0) return setFuelStations(stations)
        // Midpoint (possibly over water) found nothing — try near origin
        const fallback = await fetch(`/api/fuel?lat=${originCoord.lat}&lng=${originCoord.lng}&fuelType=${fuelType}&limit=3&radius=25${brandParam}`).then((r) => r.json())
        setFuelStations((fallback as { stations: SummaryFuelStation[] }).stations ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingFuel(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destCoord?.lat, destCoord?.lng, originCoord.lat, originCoord.lng, fuelType, vehicleType])

  const cheapestPrice = fuelStations[0]?.pricePerLitre
  const estCost = cheapestPrice ? Math.round(fuelUsedL * cheapestPrice) : null

  const RANK_COLORS = ['#16A34A', '#D97706', '#6B7280']
  const RANK_LABELS = ['1st', '2nd', '3rd']

  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

  const crewEmoji = ({ solo: '🧍', couple: '👫', family: '👨‍👩‍👧', group: '🎉' } as Record<string, string>)[crewType] ?? '👥'
  const vehicleLabel = ({ Sedan: 'Sedan', AWD: 'SUV / AWD', HighClearance4WD: '4WD', '4WD_WithCaravan': 'Van / Caravan', Electric: 'Electric' } as Record<string, string>)[vehicleType] ?? vehicleType
  const vehicleEmoji = ({ Sedan: '🚗', AWD: '🚙', HighClearance4WD: '🛻', '4WD_WithCaravan': '🚐', Electric: '⚡' } as Record<string, string>)[vehicleType] ?? '🚗'
  const fuelLabel = ({ Unleaded95: 'Unleaded 95', Unleaded98: 'Unleaded 98', Diesel: 'Diesel', Electric: 'Electric' } as Record<string, string>)[fuelType] ?? fuelType

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Your trip at a glance
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Everything looks great — ready to build your itinerary?</p>
      </div>

      {/* Trip summary card */}
      <div style={{ borderRadius: 14, border: '1px solid var(--border-active)', background: 'var(--green-light)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 28 }}>📍</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: GREEN }}>{effectiveDest?.name ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{originName} → {effectiveDest?.name} · ~{estKm} km one way</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <SummaryRow icon="📅" label="Date" value={startDate ? fmtDate(startDate) : 'Not set'} />
          {tripType === 'multiday' && endDate && <SummaryRow icon="🔚" label="Return" value={fmtDate(endDate)} />}
          <SummaryRow icon={crewEmoji} label="Crew" value={{ solo: 'Just you', couple: 'Two of you', family: 'Family', group: 'Group' }[crewType] ?? crewType} />
          <SummaryRow icon={vehicleEmoji} label="Vehicle" value={vehicleLabel} />
          {vehicleType !== 'Electric' && <SummaryRow icon="⛽" label="Fuel" value={fuelLabel} />}
          <SummaryRow icon="🛣️" label="Est. round trip" value={`~${estKmRound} km`} />
        </div>
      </div>

      {/* Fuel stops */}
      {skipFuel ? (
        <div style={{ textAlign: 'center', padding: '14px', background: 'var(--bg-muted)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          ⛽ Fuel preferences skipped — fill up wherever suits you
        </div>
      ) : vehicleType === 'Electric' ? (
        <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-muted)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          ⚡ No fuel stops needed for your electric vehicle
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            ⛽ Cheapest fuel near your route
            {estCost !== null && <span style={{ color: GREEN, fontWeight: 700 }}>· Est. cost ~${estCost}</span>}
          </div>
          {loadingFuel ? (
            <div style={{ textAlign: 'center', padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>Finding stations near your route…</div>
          ) : fuelStations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>No station data available for this route</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {fuelStations.map((st, i) => (
                <div key={st.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: '#fff', border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: RANK_COLORS[i], color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, flexShrink: 0,
                  }}>{RANK_LABELS[i]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {st.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.address}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: RANK_COLORS[i] }}>${st.pricePerLitre.toFixed(3)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{st.distanceKm} km away</div>
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

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      </div>
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
      <div>
        <Label>When are you going?</Label>
        <div style={{ marginTop: 10 }}>
          <DateDayStrip
            value={startDate}
            onChange={setStartDate}
            tripType={tripType}
            endDate={endDate}
            onEndDateChange={setEndDate}
            destCoord={preselectedDest.destCoord}
          />
        </div>
      </div>

      {/* Departure time */}
      <DepartureTimePicker departureHour={departureHour} setDepartureHour={setDepartureHour} tripDate={startDate} />

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
