import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { SplitLayout } from '@/components/layout/SplitLayout'
import { MapContainer } from '@/components/map/MapContainer'
import { ItineraryPanel } from '@/components/itinerary/ItineraryPanel'
import { ProfileWizard } from '@/components/wizard/ProfileWizard'
import { LandingPage } from '@/components/landing/LandingPage'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useAppStore } from '@/store/useAppStore'

type View = 'landing' | 'planner'

function App() {
  useOfflineSync()

  const isWizardOpen = useAppStore((s) => s.isWizardOpen)
  const activeItinerary = useAppStore((s) => s.activeItinerary)

  const [view, setView] = useState<View>(activeItinerary ? 'planner' : 'landing')

  // Forward: itinerary built → show planner
  useEffect(() => {
    if (activeItinerary) setView('planner')
  }, [activeItinerary])

  // Reverse: itinerary cleared → return to landing
  useEffect(() => {
    if (!activeItinerary) setView('landing')
  }, [activeItinerary])

  return (
    <>
      {view === 'landing' && !isWizardOpen && <LandingPage />}

      {view === 'planner' && (
        <div style={{
          display: 'flex', flexDirection: 'column', height: '100vh',
          background: 'var(--bg-base)', color: 'var(--text-primary)',
          overflow: 'hidden',
        }}>
          <Header />
          <SplitLayout
            mapSlot={<MapContainer />}
            panelSlot={<ItineraryPanel />}
          />
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
