import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Header } from '@/components/layout/Header'
import { MapContainer } from '@/components/map/MapContainer'
import { ProfileWizard } from '@/components/wizard/ProfileWizard'
import { LandingPage } from '@/components/landing/LandingPage'
import { ExperiencePanel } from '@/components/planner/ExperiencePanel'
import { MobilePlanner } from '@/components/planner/MobilePlanner'
import { PlannerMetrics } from '@/components/planner/PlannerMetrics'
import { TripSummaryPanel } from '@/components/planner/TripSummaryPanel'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { AuthModal } from '@/components/auth/AuthModal'

type View = 'landing' | 'planner'

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
  useAuth()
  useOfflineSync()

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      // Auto-reload — new version available, take it immediately
      updateServiceWorker(true)
    },
  })

  const isWizardOpen = useAppStore((s) => s.isWizardOpen)
  const isAuthModalOpen = useAppStore((s) => s.isAuthModalOpen)
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const isMobile = useIsMobile()
  const isWide   = useIsWide()

  const [view, setView] = useState<View>(() => activeItinerary ? 'planner' : 'landing')
  useEffect(() => {
    if (activeItinerary) setView('planner')
    else setView('landing')
  }, [activeItinerary])

  return (
    <>
      {view === 'landing' && <LandingPage />}

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
                </div>
                <TripSummaryPanel />
                <PlannerMetrics />
              </div>
            </div>
          </div>
        )
      )}

      {isWizardOpen && <ProfileWizard />}
      {isAuthModalOpen && <AuthModal />}

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

import { Component, type ReactNode } from 'react'
import { captureError } from '@/lib/bugLogger'

class AppErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean; msg: string; stack: string }> {
  state = { crashed: false, msg: '', stack: '' }
  static getDerivedStateFromError(err: Error) {
    return { crashed: true, msg: err?.message ?? String(err), stack: err?.stack ?? '' }
  }
  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error('[AppErrorBoundary]', err, info.componentStack)
    captureError('AppErrorBoundary', info.componentStack?.split('\n')[1]?.trim() ?? 'unknown', err)
  }
  render() {
    if (!this.state.crashed) return this.props.children
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: 32, textAlign: 'center', background: '#F8F7F4', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#1C1B1F' }}>Something went wrong</h2>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, maxWidth: 280, lineHeight: 1.6 }}>
          The app hit an unexpected error. Tap below to reload — this has been logged for us to fix.
        </p>
        <button
          onClick={() => {
            try { localStorage.removeItem('unplanned-escapes-v4') } catch {}
            window.location.href = '/'
          }}
          style={{ background: '#3A6B4F', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          Go back to home
        </button>
        {this.state.msg && (
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 16, maxWidth: 320, wordBreak: 'break-word' }}>{this.state.msg}</p>
        )}
      </div>
    )
  }
}

export default function AppWithBoundary() {
  return <AppErrorBoundary><App /></AppErrorBoundary>
}
