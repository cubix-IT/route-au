import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { SplitLayout } from '@/components/layout/SplitLayout'
import { MapContainer } from '@/components/map/MapContainer'
import { ItineraryPanel } from '@/components/itinerary/ItineraryPanel'
import { ProfileWizard } from '@/components/wizard/ProfileWizard'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useAppStore } from '@/store/useAppStore'

function App() {
  useOfflineSync()
  const isWizardOpen = useAppStore((s) => s.isWizardOpen)
  const userProfile = useAppStore((s) => s.userProfile)

  useEffect(() => {
    if (!userProfile) {
      useAppStore.getState().setWizardOpen(true)
    }
  }, [userProfile])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg-deep)', color: 'var(--text-primary)',
      overflow: 'hidden',
    }}>
      <Header />
      <SplitLayout
        mapSlot={<MapContainer />}
        panelSlot={<ItineraryPanel />}
      />
      {isWizardOpen && <ProfileWizard />}
      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          },
        }}
      />
    </div>
  )
}

export default App
