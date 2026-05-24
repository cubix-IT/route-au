import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { UserProfile, VehicleProfile, VibeTag, AccommodationPreference, VehicleType, FuelType } from '@/types'

const VIBE_OPTIONS: { tag: VibeTag; emoji: string; label: string }[] = [
  { tag: 'Hiking', emoji: '🥾', label: 'Hiking' },
  { tag: 'Chilling', emoji: '🏖', label: 'Chilling' },
  { tag: 'Lookouts', emoji: '👁', label: 'Lookouts' },
  { tag: 'Wildlife', emoji: '🦘', label: 'Wildlife' },
  { tag: 'Stargazing', emoji: '🌌', label: 'Stargazing' },
  { tag: 'Photography', emoji: '📷', label: 'Photography' },
  { tag: 'History', emoji: '🏛', label: 'History' },
  { tag: 'Beach', emoji: '🏄', label: 'Beach' },
]

export function ProfileWizard() {
  const { isWizardOpen, setWizardOpen, setUserProfile, setVehicleProfile } = useAppStore()
  const [step, setStep] = useState(0)

  const [vibes, setVibes] = useState<VibeTag[]>(['Hiking', 'Lookouts'])
  const [driveTime, setDriveTime] = useState(480)
  const [accommodation, setAccommodation] = useState<AccommodationPreference>('FreeCamping')
  const [waterLiters, setWaterLiters] = useState(40)
  const [partySize, setPartySize] = useState(2)

  const [vehicleType, setVehicleType] = useState<VehicleType>('HighClearance4WD')
  const [fuelType, setFuelType] = useState<FuelType>('Diesel')
  const [fuelCapacity, setFuelCapacity] = useState(80)
  const [fuelConsumption, setFuelConsumption] = useState(12)
  const [clearance, setClearance] = useState(2.2)
  const [isTowing, setIsTowing] = useState(false)

  if (!isWizardOpen) return null

  const toggleVibe = (tag: VibeTag) => {
    setVibes((prev) =>
      prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag]
    )
  }

  const handleComplete = () => {
    const user: UserProfile = {
      id: 'user-1',
      max_daily_drive_time: driveTime,
      preferred_vibe: vibes,
      accommodation_preference: accommodation,
      off_grid_capability: { water_capacity_liters: waterLiters, auxiliary_battery_days: 3 },
      party_size: partySize,
    }
    const vehicle: VehicleProfile = {
      id: 'vehicle-1',
      type: vehicleType,
      clearance_height_meters: clearance,
      fuel_type: fuelType,
      fuel_capacity_liters: fuelCapacity,
      fuel_consumption_litres_per_100km: fuelConsumption,
      is_towing: isTowing,
    }
    setUserProfile(user)
    setVehicleProfile(vehicle)
    setWizardOpen(false)
    setStep(0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-xl font-bold">
                {step === 0 ? '🧭 Your Travel Profile' : '🚗 Your Vehicle'}
              </h2>
              <p className="text-slate-400 text-sm mt-1">Step {step + 1} of 2</p>
            </div>
            <div className="flex gap-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i <= step ? 'bg-amber-500' : 'bg-slate-600'}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {step === 0 && (
            <>
              {/* Vibe selector */}
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium">What's your vibe?</label>
                <div className="grid grid-cols-4 gap-2">
                  {VIBE_OPTIONS.map(({ tag, emoji, label }) => (
                    <button
                      key={tag}
                      onClick={() => toggleVibe(tag)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
                        vibes.includes(tag)
                          ? 'bg-amber-700 border-amber-500 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-amber-600'
                      }`}
                    >
                      <span className="text-xl">{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily drive time */}
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium">
                  Max daily drive time: <span className="text-amber-400">{Math.round(driveTime / 60)}h</span>
                </label>
                <input
                  type="range" min={120} max={720} step={30} value={driveTime}
                  onChange={(e) => setDriveTime(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>2h</span><span>6h</span><span>12h</span>
                </div>
              </div>

              {/* Party size */}
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium">Party size</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPartySize(n)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                        partySize === n ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accommodation */}
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium">Accommodation preference</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['FreeCamping', 'CaravanPark', 'Glamping', 'Hotel'] as AccommodationPreference[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAccommodation(a)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        accommodation === a
                          ? 'bg-amber-700 border-amber-500 text-white border'
                          : 'bg-slate-700 border-slate-600 text-slate-300 border hover:border-amber-600'
                      }`}
                    >
                      {a === 'FreeCamping' ? '⛺ Free Camping' : a === 'CaravanPark' ? '🚐 Caravan Park' : a === 'Glamping' ? '🛖 Glamping' : '🏨 Hotel'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              {/* Vehicle type */}
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium">Vehicle type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Sedan', 'AWD', 'HighClearance4WD', '4WD_WithCaravan', 'Electric'] as VehicleType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setVehicleType(t)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        vehicleType === t
                          ? 'bg-amber-700 border-amber-500 text-white border'
                          : 'bg-slate-700 border-slate-600 text-slate-300 border hover:border-amber-600'
                      }`}
                    >
                      {vehicleTypeLabel(t)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuel type */}
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium">Fuel type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Unleaded95', 'Unleaded98', 'Diesel', 'Electric'] as FuelType[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFuelType(f)}
                      className={`px-2 py-2 rounded-lg text-xs transition-all ${
                        fuelType === f
                          ? 'bg-amber-700 border-amber-500 text-white border'
                          : 'bg-slate-700 border-slate-600 text-slate-300 border hover:border-amber-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuel capacity & consumption */}
              {fuelType !== 'Electric' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs">Tank capacity (L)</label>
                    <input
                      type="number" value={fuelCapacity} min={20} max={300}
                      onChange={(e) => setFuelCapacity(Number(e.target.value))}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs">Consumption (L/100km)</label>
                    <input
                      type="number" value={fuelConsumption} min={5} max={30} step={0.5}
                      onChange={(e) => setFuelConsumption(Number(e.target.value))}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Clearance */}
              <div className="space-y-1">
                <label className="text-slate-400 text-xs">Vehicle height (m)</label>
                <input
                  type="number" value={clearance} min={1.5} max={5.0} step={0.1}
                  onChange={(e) => setClearance(Number(e.target.value))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Towing */}
              <div className="flex items-center justify-between">
                <label className="text-slate-300 text-sm font-medium">Towing a trailer/caravan?</label>
                <button
                  onClick={() => setIsTowing(!isTowing)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isTowing ? 'bg-amber-600' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isTowing ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Water capacity */}
              <div className="space-y-1">
                <label className="text-slate-400 text-xs">Water capacity (L)</label>
                <input
                  type="number" value={waterLiters} min={0} max={500}
                  onChange={(e) => setWaterLiters(Number(e.target.value))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              ← Back
            </button>
          )}
          {step < 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={vibes.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
            >
              Let's Go! 🚗
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function vehicleTypeLabel(t: VehicleType): string {
  const m: Record<VehicleType, string> = {
    Sedan: '🚗 Sedan',
    AWD: '🚙 AWD',
    HighClearance4WD: '🛻 High 4WD',
    '4WD_WithCaravan': '🚐 4WD + Caravan',
    Electric: '⚡ Electric',
  }
  return m[t]
}
