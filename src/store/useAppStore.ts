import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
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

interface AppState {
  // Profiles
  userProfile: UserProfile | null
  vehicleProfile: VehicleProfile | null
  setUserProfile: (p: UserProfile) => void
  setVehicleProfile: (p: VehicleProfile) => void

  // Trip planning state (collected by wizard)
  tripType: TripType
  originId: string
  destId: string
  startDate: string
  endDate: string
  dailyDriveHours: number
  crewType: CrewType
  hasKids: boolean
  diningPrefs: DiningPref[]
  selectedCorridorId: string
  setTripPlanState: (updates: Partial<Pick<AppState,
    'tripType' | 'originId' | 'destId' | 'startDate' | 'endDate' |
    'dailyDriveHours' | 'crewType' | 'hasKids' | 'diningPrefs' | 'selectedCorridorId'
  >>) => void

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
  clearItinerary: () => void

  // UI state
  isWizardOpen: boolean
  setWizardOpen: (open: boolean) => void
  mapCenter: Coordinate
  mapZoom: number
  setMapView: (center: Coordinate, zoom: number) => void
  isOffline: boolean
  setOffline: (offline: boolean) => void

  activeTab: 'itinerary' | 'pois' | 'checklist'
  setActiveTab: (tab: AppState['activeTab']) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userProfile: null,
      vehicleProfile: null,
      setUserProfile: (p) => set({ userProfile: p }),
      setVehicleProfile: (p) => set({ vehicleProfile: p }),

      tripType: 'day',
      originId: 'melbourne',
      destId: 'twelve-apostles',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      dailyDriveHours: 5,
      crewType: 'couple',
      hasKids: false,
      diningPrefs: ['Cafes', 'LocalPubs'],
      selectedCorridorId: 'great-ocean-road',
      setTripPlanState: (updates) => set(updates),

      constraintViolations: [],
      setConstraintViolations: (v) => set({ constraintViolations: v }),

      nearbyPOIs: [],
      selectedPOI: null,
      setNearbyPOIs: (pois) => set({ nearbyPOIs: pois }),
      setSelectedPOI: (poi) => set({ selectedPOI: poi }),

      activeItinerary: null,
      setActiveItinerary: (i) => set({ activeItinerary: i }),
      clearItinerary: () => set({ activeItinerary: null }),

      isWizardOpen: true,
      setWizardOpen: (open) => set({ isWizardOpen: open }),

      mapCenter: { lng: 134.49, lat: -25.73 },
      mapZoom: 4,
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

      isOffline: false,
      setOffline: (offline) => set({ isOffline: offline }),

      activeTab: 'itinerary',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'route-au-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userProfile: state.userProfile,
        vehicleProfile: state.vehicleProfile,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
        originId: state.originId,
        destId: state.destId,
        selectedCorridorId: state.selectedCorridorId,
        diningPrefs: state.diningPrefs,
      }),
    }
  )
)
