import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { ItineraryTimelinePanel } from '@/components/layout/ItineraryTimelinePanel'
import { MapContainer } from '@/components/map/MapContainer'
import { ProfileWizard } from '@/components/wizard/ProfileWizard'
import { LandingPage } from '@/components/landing/LandingPage'
import { LoadingScreen } from '@/components/LoadingScreen'
import { ExperiencePanel } from '@/components/planner/ExperiencePanel'
import { MobilePlanner } from '@/components/planner/MobilePlanner'
import { PlannerMetrics } from '@/components/planner/PlannerMetrics'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useAppStore } from '@/store/useAppStore'

type View = 'loading' | 'landing' | 'planner'

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

  const [view, setView] = useState<View>('loading')

  useEffect(() => {
    if (activeItinerary) setView('planner')
  }, [activeItinerary])

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
        isMobile ? (
          /* ── Mobile: full-page scrollable layout ── */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#FAFAF8', overflow: 'hidden' }}>
            <Header />
            <MobilePlanner />
          </div>
        ) : isWide ? (
          /* ── 3-Column Command Center (≥1280px) ── */
          <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh',
            background: '#F8F7F4', color: 'var(--text-primary)', overflow: 'hidden',
          }}>
            <Header />
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

              {/* Col 1 — Itinerary Timeline (20%) */}
              <div style={{ flex: '0 0 20%', minHeight: 0, overflow: 'hidden' }}>
                <ItineraryTimelinePanel />
              </div>

              {/* Col 2 — Experience Discovery (50%) */}
              <div style={{
                flex: '0 0 50%', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', minHeight: 0, borderRight: '1px solid var(--border)',
              }}>
                <ExperiencePanel hideTimeline />
              </div>

              {/* Col 3 — Map + Metrics (30%) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: '0 0 65%', position: 'relative', minHeight: 0 }}>
                  <MapContainer />
                </div>
                <div style={{ flex: '0 0 35%', overflow: 'hidden' }}>
                  <PlannerMetrics />
                </div>
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

              {/* Map panel — 38% */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                  <MapContainer />
                </div>
                <PlannerMetrics />
              </div>
            </div>
          </div>
        )
      )}

      {isWizardOpen && <ProfileWizard />}

      {/* SYS-01: version badge */}
      <div style={{ position: 'fixed', bottom: 6, right: 10, fontSize: 10, color: 'rgba(0,0,0,0.22)', fontWeight: 500, letterSpacing: '0.02em', pointerEvents: 'none', zIndex: 500 }}>
        v1.0.2-beta
      </div>

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
