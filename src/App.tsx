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
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      <Header />
      <SplitLayout
        mapSlot={<MapContainer />}
        panelSlot={<ItineraryPanel />}
      />
      {isWizardOpen && <ProfileWizard />}
      <Toaster
        position="bottom-left"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #475569' },
        }}
      />
    </div>
  )
}

export default App
