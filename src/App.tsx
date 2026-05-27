import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { MapContainer } from '@/components/map/MapContainer'
import { ProfileWizard } from '@/components/wizard/ProfileWizard'
import { LandingPage } from '@/components/landing/LandingPage'
import { LoadingScreen } from '@/components/LoadingScreen'
import { FoodTile } from '@/components/planner/FoodTile'
import { ThingsTile } from '@/components/planner/ThingsTile'
import { TripTimeline } from '@/components/planner/TripTimeline'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useAppStore } from '@/store/useAppStore'

type View = 'loading' | 'landing' | 'planner'

function App() {
  useOfflineSync()

  const isWizardOpen = useAppStore((s) => s.isWizardOpen)
  const activeItinerary = useAppStore((s) => s.activeItinerary)

  const [view, setView] = useState<View>('loading')

  // Forward: itinerary built → show planner
  useEffect(() => {
    if (activeItinerary) setView('planner')
  }, [activeItinerary])

  // Reverse: itinerary cleared → return to landing
  useEffect(() => {
    if (!activeItinerary && view !== 'loading') setView('landing')
  }, [activeItinerary]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {view === 'loading' && (
        <LoadingScreen onDone={() => setView(activeItinerary ? 'planner' : 'landing')} />
      )}

      {view === 'landing' && !isWizardOpen && <LandingPage />}

      {view === 'planner' && (
        <div style={{
          display: 'flex', flexDirection: 'column', height: '100vh',
          background: 'var(--bg-base)', color: 'var(--text-primary)',
          overflow: 'hidden',
        }}>
          <Header />

          {/* Main content: map (left 60%) + right panel (40%) */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

            {/* Map */}
            <div style={{ flex: '0 0 60%', position: 'relative', minHeight: 0 }}>
              <MapContainer />
            </div>

            {/* Right panel: two stacked tiles */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', minHeight: 0,
              borderLeft: '1px solid var(--border)',
            }}>
              <FoodTile />
              <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />
              <ThingsTile />
            </div>
          </div>

          {/* Timeline: full width at bottom */}
          <TripTimeline />
        </div>
      )}

      {isWizardOpen && <ProfileWizard />}

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            boxShadow: 'var(--shadow-lg)',
          },
        }}
      />
    </>
  )
}

export default App
