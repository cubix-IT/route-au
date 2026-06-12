import { useState, useEffect, lazy, Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { LandingPage } from '@/components/landing/LandingPage'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { VICTORIAN_CLUSTERS } from '@/data/victorianClusters'

// Lazy: planner view (pulls in maplibre-gl ~750KB), wizard, modals, static pages.
// Landing page renders without any of these.
const PrivacyPage = lazy(() => import('@/components/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const ChangelogPage = lazy(() => import('@/components/ChangelogPage').then(m => ({ default: m.ChangelogPage })))
const ExplorePage = lazy(() => import('@/components/landing/ExplorePage').then(m => ({ default: m.ExplorePage })))
const MapContainer = lazy(() => import('@/components/map/MapContainer').then(m => ({ default: m.MapContainer })))
const ProfileWizard = lazy(() => import('@/components/wizard/ProfileWizard').then(m => ({ default: m.ProfileWizard })))
const ExperiencePanel = lazy(() => import('@/components/planner/ExperiencePanel').then(m => ({ default: m.ExperiencePanel })))
const MobilePlanner = lazy(() => import('@/components/planner/MobilePlanner').then(m => ({ default: m.MobilePlanner })))
const TripSummaryPanel = lazy(() => import('@/components/planner/TripSummaryPanel').then(m => ({ default: m.TripSummaryPanel })))
const AuthModal = lazy(() => import('@/components/auth/AuthModal').then(m => ({ default: m.AuthModal })))

// Kick off planner chunk downloads while the user is still in the wizard,
// so the map appears instantly when the itinerary is ready.
function prefetchPlanner() {
  import('@/components/map/MapContainer')
  import('@/components/planner/ExperiencePanel')
  import('@/components/planner/MobilePlanner')
  import('@/components/planner/TripSummaryPanel')
}

function PlannerLoading() {
  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column', gap: 16,
      alignItems: 'center', justifyContent: 'center', background: '#F8F7F4',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid var(--border, #E5E2DA)',
        borderTopColor: 'var(--green, #2F6B4F)',
        animation: 'ue-spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 14, color: 'var(--text-secondary, #6B6B66)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Preparing your escape…
      </span>
      <style>{'@keyframes ue-spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}

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

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const next = reg.installing
          if (!next) return
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              next.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          })
        })
      })
    }
  }, [])

  const isWizardOpen = useAppStore((s) => s.isWizardOpen)

  // Prefetch planner chunks the moment the wizard opens — by the time the
  // user finishes the steps, maplibre and the panels are already cached.
  useEffect(() => {
    if (isWizardOpen) prefetchPlanner()
  }, [isWizardOpen])

  // Prefetch the wizard chunk while the landing page is idle so the first
  // "Let's plan" click opens instantly instead of waiting on a download.
  useEffect(() => {
    const prefetch = () => { import('@/components/wizard/ProfileWizard') }
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetch, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    }
    const t = setTimeout(prefetch, 1500)
    return () => clearTimeout(t)
  }, [])
  const isAuthModalOpen = useAppStore((s) => s.isAuthModalOpen)
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const isMobile = useIsMobile()
  const isWide   = useIsWide()

  // Deep-link from SEO pages: /?dest=healesville&cluster=yarra-valley
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const destId = params.get('dest')
    const clusterId = params.get('cluster')
    if (!destId || !clusterId) return
    const cluster = VICTORIAN_CLUSTERS.find(c => c.id === clusterId)
    const sub = cluster?.subDests.find(s => s.id === destId)
    if (!sub || !cluster) return
    useAppStore.getState().setPreselectedDest({ corridorId: cluster.id, destId: sub.id, destName: sub.name, destCoord: sub.coord })
    useAppStore.getState().setWizardOpen(true)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const [view, setView] = useState<View>(() => activeItinerary ? 'planner' : 'landing')
  useEffect(() => {
    if (activeItinerary) setView('planner')
    else setView('landing')
  }, [activeItinerary])

  if (window.location.pathname === '/explore') {
    return <Suspense fallback={null}><ExplorePage /></Suspense>
  }
  if (window.location.pathname === '/privacy') {
    return <Suspense fallback={null}><PrivacyPage onBack={() => { window.history.back() }} /></Suspense>
  }
  if (window.location.pathname === '/changelog') {
    return <Suspense fallback={null}><ChangelogPage onBack={() => { window.history.back() }} /></Suspense>
  }

  return (
    <Suspense fallback={view === 'planner' ? <PlannerLoading /> : null}>
      {view === 'landing' && <LandingPage />}

      {view === 'planner' && (
        isMobile ? (
          /* ── Mobile: full-page scrollable layout ── */
          <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#FAFAF8', overflow: 'hidden' }}>
            <Header />
            <MobilePlanner />
          </div>
        ) : isWide ? (
          /* ── 2-Column Wide (≥1280px) ── */
          <div className="animate-fade-up" style={{
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
              </div>

            </div>
          </div>

        ) : (
          /* ── 2-Column Desktop (768–1279px) ── */
          <div className="animate-fade-up" style={{
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
    </Suspense>
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
