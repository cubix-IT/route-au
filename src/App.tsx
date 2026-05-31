import { useState, useEffect, useRef } from 'react'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { MapContainer } from '@/components/map/MapContainer'
import { FloatingTimeline } from '@/components/planner/FloatingTimeline'
import { ProfileWizard } from '@/components/wizard/ProfileWizard'
import { LandingPage } from '@/components/landing/LandingPage'
import { PrivacyPage } from '@/components/PrivacyPage'
import { ExperiencePanel } from '@/components/planner/ExperiencePanel'
import { MobilePlanner } from '@/components/planner/MobilePlanner'
import { PlannerMetrics } from '@/components/planner/PlannerMetrics'
import { TripSummaryPanel } from '@/components/planner/TripSummaryPanel'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useAppStore } from '@/store/useAppStore'

type View = 'landing' | 'planner' | 'privacy'

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 1280)
  useEffect(() => {
    const fn = () => setWide(window.innerWidth >= 1280)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return wide
}

function App() {
  useOfflineSync()

  const isWizardOpen = useAppStore((s) => s.isWizardOpen)
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const isMobile = useIsMobile()
  const isWide   = useIsWide()

  const [view, setView] = useState<View>(() => activeItinerary ? 'planner' : 'landing')
  const prevView = useRef<View>(view)

  useEffect(() => {
    if (activeItinerary) setView('planner')
    else setView('landing')
  }, [activeItinerary])

  // Allow result page footer to show privacy page via custom event
  useEffect(() => {
    const handler = () => { prevView.current = view; setView('privacy') }
    window.addEventListener('show-privacy', handler)
    return () => window.removeEventListener('show-privacy', handler)
  }, [view])

  return (
    <>
      {view === 'landing' && <LandingPage onPrivacy={() => setView('privacy')} />}
      {view === 'privacy' && <PrivacyPage onBack={() => setView(prevView.current === 'planner' ? 'planner' : 'landing')} />}

      {view === 'planner' && (
        isMobile ? (
          /* ── Mobile: full-page scrollable layout ── */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#FAFAF8', overflow: 'hidden' }}>
            <Header />
            <MobilePlanner />
          </div>
        ) : isWide ? (
          /* ── 2-Column Wide (≥1280px) ── */
          <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh',
            background: '#F8F7F4', color: 'var(--text-primary)', overflow: 'hidden',
          }}>
            <Header />
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

              {/* Col 1 — Experience Discovery (65%) */}
              <div style={{
                flex: '0 0 65%', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', minHeight: 0, borderRight: '1px solid var(--border)',
              }}>
                <ExperiencePanel hideTimeline />
              </div>

              {/* Col 2 — Map (floating timeline) + Trip Summary + Metrics (35%) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                  <MapContainer />
                  <FloatingTimeline />
                </div>
                <TripSummaryPanel />
                <PlannerMetrics />
              </div>

            </div>
          </div>

        ) : (
          /* ── 2-Column Desktop (768–1279px) ── */
          <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh',
            background: '#F8F7F4', color: 'var(--text-primary)', overflow: 'hidden',
          }}>
            <Header />

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
              {/* Content panel — 62% */}
              <div style={{
                flex: '0 0 62%', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', minHeight: 0, borderRight: '1px solid var(--border)',
              }}>
                <ExperiencePanel />
              </div>

              {/* Map panel — 38%: Map (floating timeline) + Trip Summary + Metrics */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                  <MapContainer />
                  <FloatingTimeline />
                </div>
                <TripSummaryPanel />
                <PlannerMetrics />
              </div>
            </div>
          </div>
        )
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
