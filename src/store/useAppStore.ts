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

export interface PreselectedDest {
  corridorId: string
  destName: string
  destCoord: Coordinate
}

export interface AddedDiningStop {
  foodId: string
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
  setTripPlanState: (updates: Partial<Pick<AppState,
    'tripType' | 'originId' | 'originName' | 'originCoord' |
    'destId' | 'destName' | 'destCoord' |
    'startDate' | 'endDate' | 'dailyDriveHours' | 'crewType' | 'hasKids' |
    'diningPrefs' | 'selectedCorridorId'
  >>) => void

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
  clearItinerary: () => void

  // User-chosen dining stops (interactive explorer)
  addedDiningStops: AddedDiningStop[]
  addDiningStop: (foodId: string, dayNumber: number) => void
  removeDiningStop: (foodId: string) => void

  // UI state
  isWizardOpen: boolean
  setWizardOpen: (open: boolean) => void
  mapCenter: Coordinate
  mapZoom: number
  setMapView: (center: Coordinate, zoom: number) => void
  isOffline: boolean
  setOffline: (offline: boolean) => void

  activeTab: 'itinerary' | 'dining' | 'pois' | 'checklist'
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
      originName: 'Melbourne',
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
      setTripPlanState: (updates) => set(updates),

      preselectedDest: null,
      setPreselectedDest: (d) => set({ preselectedDest: d }),

      constraintViolations: [],
      setConstraintViolations: (v) => set({ constraintViolations: v }),

      nearbyPOIs: [],
      selectedPOI: null,
      setNearbyPOIs: (pois) => set({ nearbyPOIs: pois }),
      setSelectedPOI: (poi) => set({ selectedPOI: poi }),

      activeItinerary: null,
      setActiveItinerary: (i) => set({ activeItinerary: i, addedDiningStops: [] }),
      clearItinerary: () => set({ activeItinerary: null, addedDiningStops: [] }),

      addedDiningStops: [],
      addDiningStop: (foodId, dayNumber) =>
        set((s) => ({
          addedDiningStops: [
            ...s.addedDiningStops.filter((x) => x.foodId !== foodId),
            { foodId, dayNumber },
          ],
        })),
      removeDiningStop: (foodId) =>
        set((s) => ({
          addedDiningStops: s.addedDiningStops.filter((x) => x.foodId !== foodId),
        })),

      isWizardOpen: false,
      setWizardOpen: (open) => set({ isWizardOpen: open }),

      mapCenter: { lng: 144.96, lat: -37.81 },
      mapZoom: 8,
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

      isOffline: false,
      setOffline: (offline) => set({ isOffline: offline }),

      activeTab: 'itinerary',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'route-au-v3',
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
        activeItinerary: state.activeItinerary,
        addedDiningStops: state.addedDiningStops,
      }),
    }
  )
)
