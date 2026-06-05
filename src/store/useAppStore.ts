import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Synchronous migrations — run before Zustand reads the persisted key
try {
  if (typeof localStorage !== 'undefined') {
    // 1. Rename key from old route-au-v4 brand
    const old = localStorage.getItem('route-au-v4')
    if (old && !localStorage.getItem('unplanned-escapes-v4')) {
      localStorage.setItem('unplanned-escapes-v4', old)
    }
    localStorage.removeItem('route-au-v4')

    // 2. Clear persisted originName if it's the old Melbourne default (user never set it)
    //    and strip activeItinerary from stored state (too large, now rebuilt each session)
    const stored = localStorage.getItem('unplanned-escapes-v4')
    if (stored) {
      const parsed = JSON.parse(stored)
      let dirty = false
      if (parsed?.state?.originName === 'Melbourne') { parsed.state.originName = ''; parsed.state.originId = ''; dirty = true }
      if (parsed?.state?.activeItinerary !== undefined) { delete parsed.state.activeItinerary; dirty = true }
      if (dirty) localStorage.setItem('unplanned-escapes-v4', JSON.stringify(parsed))
    }
  }
} catch { /* SSR / private browsing — ignore */ }
import type { User, Session } from '@supabase/supabase-js'
import type {
  Coordinate,
  DiningPref,
  Itinerary,
  RouteConstraintViolation,
  ScoredPOI,
  TripType,
  CrewType,
  UserProfile,
  VehicleProfile,
} from '@/types'

export interface PreselectedDest {
  corridorId: string
  destId: string         // sub-destination ID (e.g. 'lorne', 'healesville')
  destName: string
  destCoord: Coordinate
}

export interface AddedDiningStop {
  foodId: string
  stopName: string
  stopLat: number
  stopLng: number
  timeOfDay: 'morning' | 'afternoon'
  dayNumber: number
}

export interface AddedActivity {
  actId: string
  actName: string
  emoji: string
  dayNumber: number
}

interface AppState {
  // Profiles
  userProfile: UserProfile | null
  vehicleProfile: VehicleProfile | null
  setUserProfile: (p: UserProfile) => void
  setVehicleProfile: (p: VehicleProfile) => void

  // Trip planning state (collected by wizard)
  tripType: TripType
  originId: string
  originName: string
  originCoord: Coordinate
  destId: string
  destName: string
  destCoord: Coordinate
  startDate: string
  endDate: string
  dailyDriveHours: number
  crewType: CrewType
  hasKids: boolean
  diningPrefs: DiningPref[]
  selectedCorridorId: string
  departureHour: number     // 0-23, what time to start driving
  setTripPlanState: (updates: Partial<Pick<AppState,
    'tripType' | 'originId' | 'originName' | 'originCoord' |
    'destId' | 'destName' | 'destCoord' |
    'startDate' | 'endDate' | 'dailyDriveHours' | 'crewType' | 'hasKids' |
    'diningPrefs' | 'selectedCorridorId' | 'departureHour'
  >>) => void

  // Whether user has explicitly set their origin (not just default Melbourne)
  originSet: boolean
  setOriginSet: (v: boolean) => void

  // Preselected destination (from landing page card click)
  preselectedDest: PreselectedDest | null
  setPreselectedDest: (d: PreselectedDest | null) => void

  // Routing
  constraintViolations: RouteConstraintViolation[]
  setConstraintViolations: (v: RouteConstraintViolation[]) => void

  // POIs
  nearbyPOIs: ScoredPOI[]
  selectedPOI: ScoredPOI | null
  setNearbyPOIs: (pois: ScoredPOI[]) => void
  setSelectedPOI: (poi: ScoredPOI | null) => void

  // Itinerary
  activeItinerary: Itinerary | null
  setActiveItinerary: (i: Itinerary) => void
  patchRouteDistances: (distKm: number, durHours: number) => void
  clearItinerary: () => void

  // User-chosen dining stops (interactive explorer)
  addedDiningStops: AddedDiningStop[]
  addDiningStop: (stop: AddedDiningStop) => void
  removeDiningStop: (foodId: string) => void

  // User-chosen activities to include in plan
  addedActivities: AddedActivity[]
  addActivity: (act: AddedActivity) => void
  removeActivity: (actId: string) => void

  // UI state
  isWizardOpen: boolean
  setWizardOpen: (open: boolean) => void
  mapCenter: Coordinate
  mapZoom: number
  setMapView: (center: Coordinate, zoom: number) => void
  isOffline: boolean
  setOffline: (offline: boolean) => void

  activeTab: 'itinerary' | 'pois'
  setActiveTab: (tab: AppState['activeTab']) => void

  // Map pin reactivity — updated when the ExperiencePanel filter changes
  activePOIFilter: string
  displayedMapPins: Array<{ id: string; lat: number; lng: number; type: string; name: string; emoji?: string; placeId?: string }>
  setActivePOIFilter: (filter: string) => void
  setDisplayedMapPins: (pins: Array<{ id: string; lat: number; lng: number; type: string; name: string; emoji?: string; placeId?: string }>) => void

  // Selected pin — set by map click, consumed by ExperiencePanel to scroll/highlight
  selectedPinId: string | null
  setSelectedPinId: (id: string | null) => void

  // Overpass/OSM data mode
  placesLimitedMode: boolean
  setPlacesLimitedMode: (v: boolean) => void

  // Auth state — not persisted (Supabase manages its own session)
  authUser: User | null
  authSession: Session | null
  setAuthState: (user: User | null, session: Session | null) => void
  isAuthModalOpen: boolean
  setAuthModalOpen: (open: boolean) => void
  savedTrips: Itinerary[]
  setSavedTrips: (trips: Itinerary[]) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userProfile: null,
      vehicleProfile: null,
      setUserProfile: (p) => set({ userProfile: p }),
      setVehicleProfile: (p) => set({ vehicleProfile: p }),

      tripType: 'day',
      originId: '',
      originName: '',
      originCoord: { lng: 144.9631, lat: -37.8136 },
      destId: 'twelve-apostles',
      destName: '12 Apostles',
      destCoord: { lng: 142.996, lat: -38.663 },
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      dailyDriveHours: 5,
      crewType: 'couple',
      hasKids: false,
      diningPrefs: ['Cafes', 'LocalPubs'],
      selectedCorridorId: '',
      departureHour: 8,
      setTripPlanState: (updates) => set(updates),

      originSet: false,
      setOriginSet: (v) => set({ originSet: v }),

      preselectedDest: null,
      setPreselectedDest: (d) => set({ preselectedDest: d }),

      constraintViolations: [],
      setConstraintViolations: (v) => set({ constraintViolations: v }),

      nearbyPOIs: [],
      selectedPOI: null,
      setNearbyPOIs: (pois) => set({ nearbyPOIs: pois }),
      setSelectedPOI: (poi) => set({ selectedPOI: poi }),

      activeItinerary: null,
      setActiveItinerary: (i) => set({ activeItinerary: i, addedDiningStops: [], addedActivities: [] }),
      patchRouteDistances: (distKm, durHours) => set((s) => {
        const itin = s.activeItinerary
        if (!itin) return {}
        const perDay = itin.total_days
        return {
          activeItinerary: {
            ...itin,
            total_km: distKm,
            route: { ...itin.route, total_distance_km: distKm, estimated_drive_hours: durHours },
            days: itin.days.map((d) => ({
              ...d,
              drive_km: Math.round(distKm / perDay),
              drive_hours: Math.round((durHours / perDay) * 10) / 10,
            })),
          },
        }
      }),
      clearItinerary: () => set({ activeItinerary: null, addedDiningStops: [], addedActivities: [] }),

      addedDiningStops: [],
      addDiningStop: (stop) =>
        set((s) => ({
          addedDiningStops: [
            ...s.addedDiningStops.filter((x) => x.foodId !== stop.foodId),
            stop,
          ],
        })),
      removeDiningStop: (foodId) =>
        set((s) => ({
          addedDiningStops: s.addedDiningStops.filter((x) => x.foodId !== foodId),
        })),

      addedActivities: [],
      addActivity: (act) =>
        set((s) => ({
          addedActivities: s.addedActivities.some((x) => x.actId === act.actId)
            ? s.addedActivities
            : [...s.addedActivities, act],
        })),
      removeActivity: (actId) =>
        set((s) => ({
          addedActivities: s.addedActivities.filter((x) => x.actId !== actId),
        })),

      isWizardOpen: false,
      setWizardOpen: (open) => set({ isWizardOpen: open }),

      mapCenter: { lng: 144.96, lat: -37.81 },
      mapZoom: 8,
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

      isOffline: false,
      setOffline: (offline) => set({ isOffline: offline }),

      activeTab: 'itinerary' as const,
      setActiveTab: (tab) => set({ activeTab: tab }),

      activePOIFilter: 'all',
      displayedMapPins: [],
      setActivePOIFilter: (filter) => set({ activePOIFilter: filter }),
      setDisplayedMapPins: (pins) => set({ displayedMapPins: pins }),

      selectedPinId: null,
      setSelectedPinId: (id) => set({ selectedPinId: id }),

      placesLimitedMode: false,
      setPlacesLimitedMode: (v) => set({ placesLimitedMode: v }),

      authUser: null,
      authSession: null,
      setAuthState: (user, session) => set({ authUser: user, authSession: session }),
      isAuthModalOpen: false,
      setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
      savedTrips: [],
      setSavedTrips: (trips) => set({ savedTrips: trips }),
    }),
    {
      name: 'unplanned-escapes-v4',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userProfile: state.userProfile,
        vehicleProfile: state.vehicleProfile,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
        originId: state.originId,
        originName: state.originName,
        originCoord: state.originCoord,
        destId: state.destId,
        destName: state.destName,
        destCoord: state.destCoord,
        selectedCorridorId: state.selectedCorridorId,
        diningPrefs: state.diningPrefs,
        addedDiningStops: state.addedDiningStops,
        addedActivities: state.addedActivities,
      }),
    }
  )
)
