import { GREEN, WARM, SECONDARY } from '@/lib/brand'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useScrollLock } from '@/hooks/useScrollLock'

function ScrollLock() { useScrollLock(); return null }
import { useItineraryBuilder } from '@/hooks/useItineraryBuilder'
import { matchDestinations, getNearbySubDests, VICTORIAN_CLUSTERS } from '@/data/victorianClusters.ts'
import type { InterestDbCounts } from '@/data/victorianClusters.ts'
import { supabase } from '@/lib/supabase'
import { getCurrentSeason } from '@/utils/season'
import { fetchWeatherForCoord } from '@/api/weather'
import type { MatchedDest, TripInterest } from '@/data/victorianClusters.ts'
import type {
  TripType, CrewType, VehicleType, FuelType,
  AccommodationPreference, VibeTag, DiningPref,
  HikingIntensity, DietaryReq, KidsAge, Coordinate,
} from '@/types'

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
  Wildlife:  'linear-gradient(145deg, #1a472a 0%, #2d6a4f 100%)',
  Wine:      'linear-gradient(145deg, #581c87 0%, #9333ea 100%)',
  Hiking:    'linear-gradient(145deg, #1e3a5f 0%, #3b82f6 100%)',
  History:   'linear-gradient(145deg, #78350f 0%, #c97c2f 100%)',
  Food:      'linear-gradient(145deg, #92400e 0%, #f59e0b 100%)',
  Adventure: 'linear-gradient(145deg, #14532d 0%, #22c55e 100%)',
  Scenic:    'linear-gradient(145deg, #1e3a8a 0%, #60a5fa 100%)',
  Art:       'linear-gradient(145deg, #7c2d12 0%, #dc2626 100%)',
  Pubs:      'linear-gradient(145deg, #451a03 0%, #b45309 100%)',
}

const INTERESTS: { id: TripInterest; emoji: string; label: string }[] = [
  { id: 'Hiking',   emoji: '🥾', label: 'Hiking & walks' },
  { id: 'Scenic',   emoji: '👁️', label: 'Scenic views' },
  { id: 'History',  emoji: '🏛️', label: 'History' },
  { id: 'Wildlife', emoji: '🦘', label: 'Wildlife' },
  { id: 'Adventure',emoji: '🚵', label: 'Adventure' },
  { id: 'Wine',     emoji: '🍷', label: 'Wineries' },
  { id: 'Food',     emoji: '☕', label: 'Cafes & food' },
  { id: 'Art',      emoji: '🎨', label: 'Art & culture' },
  { id: 'Pubs',     emoji: '🍺', label: 'Pubs & breweries' },
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

  const totalSteps = isPreselected ? 3 : 5 // 0..2 for preselect, 0..4 for discovery

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
    const lastStep = isPreselected ? 2 : 4

    // Step 1 in discovery mode → compute suggestions, derive dining prefs, advance
    if (!isPreselected && step === 1) {
      const { originCoord: currentOriginCoord } = useAppStore.getState()

      // Fetch real DB counts for selected interests.
      // food_places interests (Wine/Food/Pubs) and activities interests (Adventure/Hiking/Wildlife/History/Scenic/Art)
      // are queried from their respective tables. If dbCounts is populated for an interest,
      // a destination with 0 count will NOT be recommended — prevents empty result pages.
      let dbCounts: InterestDbCounts | undefined
      const fpInterestCategories: Record<string, string[]> = {
        Wine:  ['%winer%', '%cellar door%'],
        Pubs:  ['%pub%', '%brewery%', '%distillery%', '%bar%'],
        Food:  ['%cafe%', '%restaurant%', '%bakery%'],
      }
      const actInterestCategories: Record<string, string[]> = {
        Adventure: ['active'],
        Hiking:    ['nature', 'active'],
        Wildlife:  ['wildlife', 'nature'],
        History:   ['history'],
        Scenic:    ['viewpoint', 'nature'],
        Art:       ['art', 'entertainment'],
      }
      try {
        const rawCounts: Record<number, number> = {}
        const addRows = (rows: { sub_dest_id: number }[]) => {
          for (const r of rows) rawCounts[r.sub_dest_id] = (rawCounts[r.sub_dest_id] || 0) + 1
        }

        // food_places queries (ilike patterns)
        const fpInterests = interests.filter(i => i in fpInterestCategories)
        for (const interest of fpInterests) {
          for (const pattern of fpInterestCategories[interest]) {
            const { data } = await supabase.from('food_places').select('sub_dest_id').ilike('category', pattern)
            if (data) addRows(data)
          }
        }

        // activities queries (exact category match)
        const actInterests = interests.filter(i => i in actInterestCategories)
        for (const interest of actInterests) {
          for (const cat of actInterestCategories[interest]) {
            const { data } = await supabase.from('activities').select('sub_dest_id').eq('category', cat)
            if (data) addRows(data)
          }
        }

        if (fpInterests.length > 0 || actInterests.length > 0) {
          // Map numeric IDs → slugs. Also include all known sub-dests so missing ones get 0.
          const { data: subs } = await supabase.from('sub_destinations').select('sub_dest_id, slug')
          dbCounts = {}
          for (const s of subs ?? []) dbCounts[s.slug] = rawCounts[s.sub_dest_id] ?? 0
        }
      } catch { /* non-critical — fall back to static scoring */ }

      const matches = matchDestinations({
        maxDriveHours,
        interests,
        hasKids,
        isOvernight: tripType === 'multiday',
        season,
        originCoord: currentOriginCoord,
        dbCounts,
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

    // Wait for Supabase data to load — so wizard closes directly into ready results
    const TIMEOUT_MS = 8000
    const start = Date.now()
    await new Promise<void>((resolve) => {
      const check = () => {
        if (useAppStore.getState().tripDataReady || Date.now() - start > TIMEOUT_MS) return resolve()
        setTimeout(check, 100)
      }
      check()
    })

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
  const discoveryStepLabels = ['How far & who', 'What you love', 'Pick a spot', 'Your vehicle', 'Trip summary']
  const discoveryStepSubtitles = [
    'Tell us how far you want to travel and who\'s coming',
    'We\'ll match destinations to what you enjoy',
    'Choose from your personalised recommendations',
    'Help us find fuel stops along the way',
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
      <ScrollLock />
      <div className="wizard-card animate-fade-up">

        {/* Mobile drag handle */}
        {typeof window !== 'undefined' && window.innerWidth < 600 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)' }} />
          </div>
        )}

        {/* M3 Header */}
        <div style={{ padding: typeof window !== 'undefined' && window.innerWidth < 600 ? '10px 18px 0' : '20px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            {/* Step label — M3 Headline Small */}
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 22, fontWeight: 700, color: '#002112', letterSpacing: '-0.03em', lineHeight: 1.2,
            }}>
              {!generating ? stepLabels[step] : 'Building your trip…'}
            </div>
            {/* M3 tonal close button */}
            <button
              onClick={() => setWizardOpen(false)}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: '#DCE4DB', color: '#3A6B4F',
                fontSize: 16, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 150ms ease',
              }}
              title="Close"
            >✕</button>
          </div>

          {/* Subtitle */}
          {!generating && (
            <div style={{ fontSize: 13, color: '#3F4F42', marginBottom: 12, lineHeight: 1.5 }}>
              {stepSubtitles[step] ?? ''}
            </div>
          )}

          {/* M3 Linear progress bar */}
          {!generating && (
            <div className="wizard-progress-bar">
              <div className="wizard-progress-fill" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
            </div>
          )}

          {/* Step counter */}
          {!generating && (
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6F7F71', marginTop: 6, letterSpacing: '0.04em' }}>
              STEP {step + 1} OF {totalSteps}
            </div>
          )}
        </div>

        {/* Body */}
        <div key={`${step}-${generating}`} className="animate-fade-up" style={{
          flex: 1,
          overflowY: isPickStep ? 'hidden' : 'auto',
          padding: isPickStep ? '8px 0 0' : '20px 20px 8px',
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
                  maxDriveHours={maxDriveHours}
                />
              )}
              {step === 3 && (
                <StepVehicle
                  vehicleType={vehicleType} setVehicleType={setVehicleType}
                  fuelType={fuelType} setFuelType={setFuelType}
                  skipFuel={skipFuel} setSkipFuel={setSkipFuel}
                />
              )}
              {step === 4 && (
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

        {/* M3 Footer — no border, full-width pill CTA */}
        {!generating && (
          <div style={{ padding: '12px 20px 24px', display: 'flex', gap: 10, flexShrink: 0 }}>
            {/* M3 tonal Back button */}
            <button onClick={handleBack} className="mu-btn-ghost" style={{
              height: 56, padding: '0 20px', borderRadius: 28,
              background: '#DCE4DB', border: 'none',
              color: '#3A6B4F', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              flexShrink: 0,
            }}>
              ← Back
            </button>
            {/* M3 filled pill CTA */}
            <button onClick={handleNext} disabled={!canContinue} className={canContinue ? 'mu-btn-primary' : ''} style={{
              flex: 1, height: 56, borderRadius: 28,
              background: canContinue ? GREEN : '#C8D8C4',
              border: 'none',
              color: canContinue ? '#fff' : '#6F7F71',
              fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              transition: 'background 200ms ease, transform 150ms cubic-bezier(0.34,1.4,0.64,1)',
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
          {([['day', 'Day trip', 'Back before dinner'], ['multiday', 'Overnight+', 'Stay a night or two']] as const).map(
            ([type, label, desc]) => (
              <button key={type} onClick={() => setTripType(type)} style={{
                flex: 1, padding: '14px 10px', borderRadius: 12,
                background: tripType === type ? 'var(--green-light)' : 'var(--bg-muted)',
                border: `1.5px solid ${tripType === type ? 'var(--border-active)' : 'var(--border)'}`,
                color: tripType === type ? GREEN : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
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
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {([
            ['solo', 'Solo'],
            ['couple', 'Couple'],
            ['family', 'Family'],
            ['group', 'Group'],
          ] as const).map(([type, label]) => (
            <button key={type}
              onClick={() => setCrewType(type)}
              style={{
                flex: 1, minWidth: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 4px', borderRadius: 16,
                background: crewType === type ? '#B7EDCA' : '#ECF0EB',
                border: 'none', cursor: 'pointer',
                boxShadow: crewType === type ? '0 4px 20px rgba(58,107,79,0.25)' : 'none',
                transition: 'background 0.2s',
                fontWeight: 700, fontSize: 13, color: 'var(--text-primary)',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Kids — only when relevant */}
      {showKids && (
        <div>
          <Label>Any kids coming?</Label>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {([['yes', 'Yes, kids!'], ['no', 'Adults only']] as const).map(([val, label]) => {
              const sel = val === 'yes' ? hasKids : !hasKids
              return (
                <button key={val} onClick={() => setHasKids(val === 'yes')} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '14px 4px', borderRadius: 16,
                  background: sel ? '#B7EDCA' : '#ECF0EB',
                  border: 'none', cursor: 'pointer',
                  boxShadow: sel ? '0 4px 20px rgba(58,107,79,0.25)' : 'none',
                  transition: 'background 0.2s',
                  fontWeight: 700, fontSize: 13, color: 'var(--text-primary)',
                }}>
                  {label}
                </button>
              )
            })}
          </div>
          {hasKids && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {([
                ['toddler', 'Toddlers', 'Under 5'],
                ['school',  'Primary', '6–12'],
                ['teen',    'Teens', '13+'],
                ['mixed',   'Mixed', 'All ages'],
              ] as const).map(([age, label, desc]) => (
                <button key={age} onClick={() => setKidsAge(age)} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 3, padding: '12px 4px', borderRadius: 14,
                  background: kidsAge === age ? '#B7EDCA' : '#ECF0EB',
                  border: 'none', cursor: 'pointer',
                  boxShadow: kidsAge === age ? '0 4px 16px rgba(58,107,79,0.2)' : 'none',
                  transition: 'background 0.2s',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>{label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{desc}</span>
                </button>
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
  // Wine/Pubs hidden for families with young kids; Adventure hidden for toddlers
  const visible = INTERESTS.filter((i) => {
    if (hasKids && kidsAge !== 'teen' && (i.id === 'Wine' || i.id === 'Pubs')) return false
    if (hasKids && kidsAge === 'toddler' && i.id === 'Adventure') return false
    return true
  })

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: 9 }}>
        {visible.map((i) => {
          const selected = interests.includes(i.id)
          return (
            <button
              key={i.id}
              onClick={() => toggleInterest(i.id)}
              style={{
                position: 'relative',
                borderRadius: 16,
                background: INTEREST_GRAD[i.id] ?? '#2d5440',
                padding: '16px 8px 13px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                cursor: 'pointer', border: 'none',
                boxShadow: selected
                  ? `inset 0 0 0 2.5px rgba(255,255,255,0.9), 0 3px 12px rgba(0,0,0,0.22)`
                  : '0 1px 4px rgba(0,0,0,0.18)',
                opacity: interests.length > 0 && !selected ? 0.5 : 1,
                transition: 'opacity 0.15s, box-shadow 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{i.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.3, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                {i.label}
              </span>
              {selected && (
                <div style={{
                  position: 'absolute', top: 7, right: 7,
                  width: 17, height: 17, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.95)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: GREEN, fontWeight: 900,
                }}>✓</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected summary */}
      {interests.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {interests.map((id) => {
            const meta = INTERESTS.find((x) => x.id === id)
            return (
              <button
                key={id}
                onClick={() => toggleInterest(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px 4px 7px', borderRadius: 20,
                  background: GREEN, color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 14 }}>{meta?.emoji}</span>
                {meta?.label.split(' ')[0]}
                <span style={{ fontSize: 10, opacity: 0.75, marginLeft: 1 }}>×</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
          Tap anything that sounds like your kind of trip
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

function StepPickDest({ suggestions, picked, onPick, maxDriveHours }: {
  suggestions: MatchedDest[]
  picked: MatchedDest | null
  onPick: (d: MatchedDest) => void
  maxDriveHours: number
}) {
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600

  // Within-range destinations; out-of-range shown dimmed when browsing a region/search
  const withinRangeIds = new Set(suggestions.map((s) => s.sub.id))
  const allDests: MatchedDest[] = VICTORIAN_CLUSTERS.flatMap((cluster) =>
    cluster.subDests.map((sub) => {
      const existing = suggestions.find((s) => s.sub.id === sub.id)
      return existing ?? { sub, cluster, score: 0, matchReasons: [] }
    })
  )
  const matchedIds = withinRangeIds

  // Detect if search matches a region name (for region shortcut card)
  const q = search.trim().toLowerCase()
  const regionMatch = q.length > 1
    ? VICTORIAN_CLUSTERS.find((c) =>
        c.name.toLowerCase().includes(q) || c.tagline?.toLowerCase().includes(q)
      )
    : null

  const isFiltering = search.trim().length > 0 || regionFilter !== null
  // Recommended = suggestions that have at least one direct interest theme match
  // All = every destination within drive time, or all when searching/browsing regions
  const basePool = (showAll || isFiltering) ? allDests : suggestions.filter(s => s.activityMatches > 0)
  const filtered = basePool.filter((s) => {
    if (!showAll && !isFiltering && !withinRangeIds.has(s.sub.id)) return false
    if (regionFilter && s.cluster.id !== regionFilter) return false
    if (search.trim()) {
      return s.sub.name.toLowerCase().includes(q) || s.cluster.name.toLowerCase().includes(q)
    }
    return true
  })
  // Recommended tiles sorted by score; All tiles: within-range first
  const tiles = (showAll || isFiltering)
    ? [...filtered].sort((a, b) => {
        const aIn = withinRangeIds.has(a.sub.id) ? 1 : 0
        const bIn = withinRangeIds.has(b.sub.id) ? 1 : 0
        return bIn - aIn || (b.score ?? 0) - (a.score ?? 0)
      })
    : filtered

  function driveLabel(hrs: number) {
    return hrs < 1 ? `${Math.round(hrs * 60)} min` : `${hrs.toFixed(hrs === Math.floor(hrs) ? 0 : 1)} hr`
  }

  if (suggestions.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Nothing matched exactly</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try increasing your drive time or picking fewer interests.</div>
      </div>
    )
  }

  const cols = isMobile ? 2 : 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Search + region chips header */}
      <div style={{ flexShrink: 0, padding: '12px 14px 0', background: '#FAFAF9' }}>
        <input
          type="search"
          placeholder="Search destinations or regions…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setRegionFilter(null) }}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 12px', borderRadius: 10,
            border: '1.5px solid var(--border)', background: '#fff',
            fontSize: 13, color: 'var(--text-primary)', outline: 'none',
            marginBottom: 10,
          }}
        />
        {/* Recommended / All toggle + region chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          {/* Recommended pill */}
          <button
            onClick={() => { setShowAll(false); setRegionFilter(null); setSearch('') }}
            style={{
              padding: '5px 13px', borderRadius: 20, flexShrink: 0,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: !showAll && !regionFilter && !search ? GREEN : '#fff',
              color: !showAll && !regionFilter && !search ? '#fff' : '#6B7280',
              border: `1.5px solid ${!showAll && !regionFilter && !search ? GREEN : 'var(--border)'}`,
            }}
          >✦ Recommended</button>
          {/* All destinations pill */}
          <button
            onClick={() => { setShowAll(true); setRegionFilter(null); setSearch('') }}
            style={{
              padding: '5px 13px', borderRadius: 20, flexShrink: 0,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: showAll && !regionFilter && !search ? '#1C1B1F' : '#fff',
              color: showAll && !regionFilter && !search ? '#fff' : '#6B7280',
              border: `1.5px solid ${showAll && !regionFilter && !search ? '#1C1B1F' : 'var(--border)'}`,
            }}
          >All</button>
          {VICTORIAN_CLUSTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => { setRegionFilter(c.id); setSearch('') }}
              style={{
                padding: '5px 13px', borderRadius: 20, flexShrink: 0,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: regionFilter === c.id ? c.gradientTo : '#fff',
                color: regionFilter === c.id ? '#fff' : '#6B7280',
                border: `1.5px solid ${regionFilter === c.id ? c.gradientTo : 'var(--border)'}`,
              }}
            >{c.name}</button>
          ))}
        </div>
      </div>

      {/* Scrollable tile grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 16px' }}>

        {/* Region shortcut card — shown when search matches a region name */}
        {regionMatch && !regionFilter && (() => {
          const primaryDest = regionMatch.subDests[0]
          const primaryMatch = allDests.find((d) => d.sub.id === primaryDest.id)
          if (!primaryMatch) return null
          return (
            <button
              onClick={() => onPick(primaryMatch)}
              style={{
                width: '100%', boxSizing: 'border-box', marginBottom: 10,
                borderRadius: 14, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${regionMatch.gradientFrom}, ${regionMatch.gradientTo})`,
                padding: '14px 16px', textAlign: 'left',
                WebkitTapHighlightColor: 'transparent',
                boxShadow: picked?.sub.id === primaryDest.id
                  ? `0 0 0 2.5px ${GREEN}`
                  : '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                {regionMatch.name} region
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                {primaryDest.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 3 }}>
                🗺 {driveLabel(primaryDest.driveTimeHours)} drive · tap to select
              </div>
              {picked?.sub.id === primaryDest.id && (
                <div style={{ position: 'absolute', top: 10, right: 12, width: 22, height: 22, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>
                </div>
              )}
            </button>
          )
        })()}

        {/* Destination tile grid */}
        {tiles.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No destinations found for "{search}"
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
            {tiles.map((match) => {
              const imgUrl = match.sub.imageUrl ?? match.cluster.imageUrl
              const hasImg = !!imgUrl && !imgErrors.has(imgUrl)
              const isPicked = picked?.sub.id === match.sub.id
              const isMatched = matchedIds.has(match.sub.id)
              const inRange = withinRangeIds.has(match.sub.id)
              const hrs = match.sub.driveTimeHours
              return (
                <button
                  key={match.sub.id}
                  onClick={() => onPick(match)}
                  style={{
                    borderRadius: 14, border: 'none', cursor: 'pointer',
                    position: 'relative', overflow: 'hidden',
                    aspectRatio: '4/3',
                    background: hasImg
                      ? `url(${imgUrl}) center/cover`
                      : `linear-gradient(145deg, ${match.cluster.gradientFrom}, ${match.cluster.gradientTo})`,
                    boxShadow: isPicked
                      ? `0 0 0 2.5px ${GREEN}, 0 2px 8px rgba(0,0,0,0.15)`
                      : '0 1px 4px rgba(0,0,0,0.12)',
                    opacity: !inRange && isFiltering ? 0.45 : 1,
                    WebkitTapHighlightColor: 'transparent',
                    padding: 0,
                  }}
                >
                  {hasImg && (
                    <img src={imgUrl} alt="" onError={() => setImgErrors((prev) => new Set(prev).add(imgUrl))}
                      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
                  )}
                  {/* Bottom gradient overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
                  }} />
                  {/* Out-of-range badge */}
                  {!inRange && isFiltering && (
                    <div style={{
                      position: 'absolute', top: 7, left: 7,
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                    }}>Beyond {maxDriveHours} hr limit</div>
                  )}
                  {/* Match badge — top left (only when in range) */}
                  {inRange && isMatched && match.matchReasons.length > 0 && (
                    <div style={{
                      position: 'absolute', top: 7, left: 7,
                      background: GREEN, color: '#fff',
                      fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6,
                    }}>✦ {match.matchReasons[0]}</div>
                  )}
                  {/* Drive time + km badge — top right */}
                  <div style={{
                    position: 'absolute', top: 7, right: 7,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
                    borderRadius: 7, padding: '3px 7px',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                      🕐 {driveLabel(hrs)}
                    </span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>
                      {match.sub.driveKm ? `${match.sub.driveKm} km` : ''}
                    </span>
                  </div>
                  {/* Picked checkmark — overlays the drive badge */}
                  {isPicked && (
                    <div style={{
                      position: 'absolute', top: 7, right: 7,
                      width: 26, height: 26, borderRadius: '50%',
                      background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>
                    </div>
                  )}
                  {/* Name + region */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 9px 9px' }}>
                    <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                      {match.sub.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                      {match.cluster.name}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Date day-strip with weather ───────────────────────────────────

function weatherEmojiWizard(description: string): string {
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
  const [wx, setWx] = useState<{ emoji: string; max: number; min: number }[] | null>(null)

  useEffect(() => {
    if (!destCoord) return
    fetchWeatherForCoord(destCoord, 14)
      .then((days) => setWx(days.map((d) => ({ emoji: weatherEmojiWizard(d.description), max: Math.round(d.temp_max_c), min: Math.round(d.temp_min_c) }))))
      .catch(() => {})
  }, [destCoord?.lat, destCoord?.lng])

  const LAST_SLOT_HOUR = 15 // last departure slot is 3pm
  const nowH = new Date().getHours()
  const todayIsTooLate = nowH >= LAST_SLOT_HOUR
  // Start from tomorrow if it's too late to leave today
  const startOffset = todayIsTooLate ? 1 : 0
  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 600
  const PAGE_SIZE = isMobileView ? 3 : 5
  const allDays = Array.from({ length: 14 }, (_, i) => {
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
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${PAGE_SIZE}, 1fr)`, gap: 3 }}>
          {visible.map((d, idx) => {
            const wIdx = page * PAGE_SIZE + idx
            const selected = d.iso === value
            const mobile = isMobileView
            return (
              <button key={d.iso} onClick={() => onChange(d.iso)} style={{
                display: 'flex',
                flexDirection: mobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: mobile ? 'center' : 'space-between',
                padding: mobile ? '8px 4px' : '10px 14px',
                borderRadius: 12, cursor: 'pointer',
                gap: mobile ? 1 : 0,
                background: selected ? 'var(--green-light)' : '#fff',
                border: `1.5px solid ${selected ? GREEN : 'rgba(0,0,0,0.08)'}`,
                boxShadow: selected ? `0 0 0 2px ${GREEN}33` : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.15s',
              }}>
                {/* Date — left on desktop, top on mobile */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: mobile ? 'center' : 'flex-start', gap: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: selected ? GREEN : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.day}</span>
                  <span style={{ fontSize: mobile ? 18 : 22, fontWeight: 800, color: selected ? GREEN : '#1C1B1F', lineHeight: 1 }}>{d.num}</span>
                  <span style={{ fontSize: 9, color: selected ? GREEN : '#9CA3AF', fontWeight: 600 }}>{d.mon}</span>
                </div>
                {/* Weather — right on desktop, bottom on mobile */}
                {wx?.[wIdx] ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: mobile ? 'center' : 'flex-end', gap: 1, marginTop: mobile ? 2 : 0 }}>
                    <span style={{ fontSize: mobile ? 18 : 20, lineHeight: 1 }}>{wx[wIdx].emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: selected ? GREEN : '#374151', whiteSpace: 'nowrap' }}>
                      {wx[wIdx].max}°<span style={{ opacity: 0.45, fontWeight: 500 }}>/{wx[wIdx].min}°</span>
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 9, color: '#D1D5DB' }}>–</span>
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(p + 1, Math.ceil(allDays.length / PAGE_SIZE) - 1))} disabled={page >= Math.ceil(allDays.length / PAGE_SIZE) - 1}
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
              destCoord={preselectedDest.destCoord}
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
              style={{ flexDirection: 'row', padding: '10px 16px', gap: 0, flexShrink: 0 }}>
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>~{driveLabel}</div>
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
          {([['day', 'Day trip'], ['multiday', 'Overnight+']] as const).map(
            ([type, label]) => (
              <button key={type} onClick={() => setTripType(type)} style={{
                flex: 1, padding: '12px', borderRadius: 10,
                background: tripType === type ? 'var(--green-light)' : 'var(--bg-muted)',
                border: `1.5px solid ${tripType === type ? 'var(--border-active)' : 'var(--border)'}`,
                color: tripType === type ? GREEN : 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {label}
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
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {([['solo', 'Solo'], ['couple', 'Couple'], ['family', 'Family'], ['group', 'Group']] as const).map(([type, label]) => (
            <button key={type} onClick={() => setCrewType(type)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px 4px', borderRadius: 16,
              background: crewType === type ? '#B7EDCA' : '#ECF0EB',
              border: 'none', cursor: 'pointer',
              boxShadow: crewType === type ? '0 4px 20px rgba(58,107,79,0.25)' : 'none',
              transition: 'background 0.2s',
              fontWeight: 700, fontSize: 13, color: 'var(--text-primary)',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {showKids && (
        <div>
          <Label>Any kids coming?</Label>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {([['yes', 'Yes, kids!'], ['no', 'Adults only']] as const).map(([val, label]) => {
              const sel = val === 'yes' ? hasKids : !hasKids
              return (
                <button key={val} onClick={() => setHasKids(val === 'yes')} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '14px 4px', borderRadius: 16,
                  background: sel ? '#B7EDCA' : '#ECF0EB',
                  border: 'none', cursor: 'pointer',
                  boxShadow: sel ? '0 4px 20px rgba(58,107,79,0.25)' : 'none',
                  transition: 'background 0.2s',
                  fontWeight: 700, fontSize: 13, color: 'var(--text-primary)',
                }}>
                  {label}
                </button>
              )
            })}
          </div>
          {hasKids && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {([['toddler', 'Toddlers', 'Under 5'], ['school', 'Primary', '6–12'], ['teen', 'Teens', '13+'], ['mixed', 'Mixed', 'All ages']] as const).map(([age, label, desc]) => (
                <button key={age} onClick={() => setKidsAge(age)} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 3, padding: '12px 4px', borderRadius: 14,
                  background: kidsAge === age ? '#B7EDCA' : '#ECF0EB',
                  border: 'none', cursor: 'pointer',
                  boxShadow: kidsAge === age ? '0 4px 16px rgba(58,107,79,0.2)' : 'none',
                  transition: 'background 0.2s',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>{label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{desc}</span>
                </button>
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
  const progress = ((step + 1) / messages.length) * 100

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, padding: '24px 28px', gap: 0,
      minHeight: 0,
    }}>
      {/* Victorian landscape SVG */}
      <div style={{ width: '100%', maxWidth: 340, borderRadius: 24, overflow: 'hidden', marginBottom: 28 }}>
        <svg viewBox="0 0 380 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%' }}>
          <defs>
            <style>{`
              @keyframes drive { from { transform: translateX(-90px) } to { transform: translateX(420px) } }
              @keyframes cloud1 { from { transform: translateX(0) } to { transform: translateX(-200px) } }
              @keyframes cloud2 { from { transform: translateX(60px) } to { transform: translateX(-200px) } }
              @keyframes treeSway { 0%,100% { transform: rotate(-1deg) } 50% { transform: rotate(1.5deg) } }
              @keyframes dustPuff { 0% { opacity: 0.6; transform: translateX(0) scale(1) } 100% { opacity: 0; transform: translateX(-18px) scale(2.5) } }
              .car { animation: drive 3.2s cubic-bezier(0.4,0,0.6,1) infinite }
              .cloud1 { animation: cloud1 18s linear infinite }
              .cloud2 { animation: cloud2 26s linear infinite }
              .tree1 { animation: treeSway 2.8s ease-in-out infinite; transform-origin: 310px 128px }
              .tree2 { animation: treeSway 3.4s ease-in-out infinite 0.6s; transform-origin: 330px 128px }
              .dust { animation: dustPuff 0.6s ease-out infinite; transform-origin: 8px 138px }
            `}</style>
          </defs>
          <rect width="380" height="160" fill="#C8E6D8"/>
          <g className="cloud1">
            <ellipse cx="80" cy="38" rx="28" ry="12" fill="white" opacity="0.7"/>
            <ellipse cx="100" cy="32" rx="18" ry="11" fill="white" opacity="0.7"/>
            <ellipse cx="60" cy="34" rx="16" ry="9" fill="white" opacity="0.7"/>
          </g>
          <g className="cloud2">
            <ellipse cx="280" cy="28" rx="22" ry="10" fill="white" opacity="0.5"/>
            <ellipse cx="296" cy="23" rx="14" ry="9" fill="white" opacity="0.5"/>
          </g>
          <path d="M0 100 Q60 60 120 80 Q180 55 240 75 Q300 50 380 70 L380 160 L0 160Z" fill="#4A8C65" opacity="0.5"/>
          <path d="M0 115 Q50 85 110 100 Q170 78 230 95 Q290 70 380 90 L380 160 L0 160Z" fill="#3A6B4F" opacity="0.7"/>
          <path d="M0 130 Q95 118 190 128 Q285 115 380 125 L380 160 L0 160Z" fill="#2D5440"/>
          <path d="M0 140 Q190 132 380 138 L380 145 Q190 137 0 145Z" fill="#1A3D2B" opacity="0.6"/>
          <rect x="40" y="141" width="30" height="2" rx="1" fill="#B7EDCA" opacity="0.5"/>
          <rect x="120" y="140" width="30" height="2" rx="1" fill="#B7EDCA" opacity="0.5"/>
          <rect x="200" y="141" width="30" height="2" rx="1" fill="#B7EDCA" opacity="0.5"/>
          <rect x="280" y="140" width="30" height="2" rx="1" fill="#B7EDCA" opacity="0.5"/>
          <g className="tree1">
            <rect x="308" y="110" width="4" height="18" fill="#1A3D2B"/>
            <ellipse cx="310" cy="104" rx="10" ry="12" fill="#2D5440"/>
          </g>
          <g className="tree2">
            <rect x="328" y="108" width="4" height="20" fill="#1A3D2B"/>
            <ellipse cx="330" cy="102" rx="8" ry="10" fill="#3A6B4F"/>
          </g>
          <g>
            <rect x="348" y="112" width="3" height="16" fill="#1A3D2B"/>
            <ellipse cx="349.5" cy="107" rx="7" ry="9" fill="#2D5440"/>
          </g>
          <g className="car">
            <g className="dust"><ellipse cx="8" cy="138" rx="5" ry="3" fill="#B7EDCA" opacity="0.5"/></g>
            <rect x="14" y="124" width="52" height="18" rx="5" fill="#B87333"/>
            <rect x="22" y="114" width="34" height="12" rx="4" fill="#92400E"/>
            <rect x="25" y="116" width="13" height="8" rx="2" fill="#C8E6D8" opacity="0.8"/>
            <rect x="41" y="116" width="12" height="8" rx="2" fill="#C8E6D8" opacity="0.8"/>
            <rect x="22" y="113" width="34" height="2" rx="1" fill="#6B3A1F"/>
            <rect x="26" y="111" width="4" height="3" rx="0.5" fill="#6B3A1F"/>
            <rect x="34" y="111" width="4" height="3" rx="0.5" fill="#6B3A1F"/>
            <rect x="42" y="111" width="4" height="3" rx="0.5" fill="#6B3A1F"/>
            <circle cx="26" cy="142" r="8" fill="#1A1A1A"/>
            <circle cx="26" cy="142" r="4" fill="#3A3A3A"/>
            <circle cx="54" cy="142" r="8" fill="#1A1A1A"/>
            <circle cx="54" cy="142" r="4" fill="#3A3A3A"/>
            <rect x="65" y="128" width="4" height="5" rx="1" fill="#FEF3C7" opacity="0.9"/>
          </g>
        </svg>
      </div>

      {/* Current message */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#002112', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Unplanned <span style={{ color: GREEN }}>Escapes</span>
        </div>
        <div style={{ fontSize: 14, color: '#3F4F42', fontWeight: 500 }}>{messages[step]}</div>
      </div>

      {/* M3 wave linear progress indicator */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{
          width: '100%', height: 4, borderRadius: 2,
          background: '#C8D8C4', overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            width: `${progress}%`,
            background: GREEN,
            borderRadius: 2,
            transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
          {/* Wave shimmer on the leading edge */}
          <div style={{
            position: 'absolute', top: 0, left: `${progress}%`,
            height: '100%', width: 40,
            background: `linear-gradient(90deg, ${GREEN} 0%, transparent 100%)`,
            opacity: 0.4,
            animation: 'waveShimmer 1.2s ease-in-out infinite',
            transform: 'translateX(-20px)',
          }} />
        </div>
        <style>{`@keyframes waveShimmer { 0%,100% { opacity: 0.3 } 50% { opacity: 0.7 } }`}</style>
      </div>

      {/* Step list */}
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white',
              background: i < step ? GREEN : i === step ? WARM : '#DCE4DB',
              transition: 'background 0.3s',
            }}>
              {i < step ? '✓' : i === step ? '' : ''}
            </div>
            <span style={{
              fontSize: 13, fontWeight: i === step ? 600 : 400,
              color: i < step ? GREEN : i === step ? '#002112' : '#9CA3AF',
              transition: 'color 0.3s',
            }}>{msg}</span>
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
