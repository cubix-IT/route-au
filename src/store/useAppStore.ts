import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Coordinate,
  Itinerary,
  RouteConstraintViolation,
  ScoredPOI,
  UserProfile,
  VehicleProfile,
} from '@/types'

interface AppState {
  // Profiles
  userProfile: UserProfile | null
  vehicleProfile: VehicleProfile | null
  setUserProfile: (p: UserProfile) => void
  setVehicleProfile: (p: VehicleProfile) => void

  // Constraint violations from routing
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

  // UI state
  isWizardOpen: boolean
  setWizardOpen: (open: boolean) => void
  selectedCorridorId: string
  setSelectedCorridorId: (id: string) => void
  mapCenter: Coordinate
  mapZoom: number
  setMapView: (center: Coordinate, zoom: number) => void
  isOffline: boolean
  setOffline: (offline: boolean) => void
  activeLayers: Set<string>
  toggleLayer: (layerId: string) => void

  // Active panel tab
  activeTab: 'itinerary' | 'pois' | 'checklist' | 'community'
  setActiveTab: (tab: AppState['activeTab']) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userProfile: null,
      vehicleProfile: null,
      setUserProfile: (p) => set({ userProfile: p }),
      setVehicleProfile: (p) => set({ vehicleProfile: p }),

      constraintViolations: [],
      setConstraintViolations: (v) => set({ constraintViolations: v }),

      nearbyPOIs: [],
      selectedPOI: null,
      setNearbyPOIs: (pois) => set({ nearbyPOIs: pois }),
      setSelectedPOI: (poi) => set({ selectedPOI: poi }),

      activeItinerary: null,
      setActiveItinerary: (i) => set({ activeItinerary: i }),

      isWizardOpen: true,
      setWizardOpen: (open) => set({ isWizardOpen: open }),
      selectedCorridorId: 'great-ocean-road',
      setSelectedCorridorId: (id) => set({ selectedCorridorId: id }),

      mapCenter: { lng: 134.49, lat: -25.73 }, // Geographic centre of Australia
      mapZoom: 4,
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

      isOffline: false,
      setOffline: (offline) => set({ isOffline: offline }),

      activeLayers: new Set(['corridors', 'pois']),
      toggleLayer: (layerId) =>
        set((s) => {
          const next = new Set(s.activeLayers)
          if (next.has(layerId)) next.delete(layerId)
          else next.add(layerId)
          return { activeLayers: next }
        }),

      activeTab: 'itinerary',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'route-au-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userProfile: state.userProfile,
        vehicleProfile: state.vehicleProfile,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
        selectedCorridorId: state.selectedCorridorId,
        isWizardOpen: state.isWizardOpen,
      }),
    }
  )
)
