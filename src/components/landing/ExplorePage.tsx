import { GREEN } from '@/lib/brand'
import { getCurrentSeason } from '@/utils/season'
import { useClusters } from '@/hooks/useClusters'
import { ClusterCard } from './ClusterCard'
import type { VicCluster, SubDest } from '@/data/victorianClusters.ts'

const season = getCurrentSeason()

/**
 * /explore — the full destination grid, split out of the landing page.
 * "Plan this escape" navigates to /?dest=&cluster= — the existing deep-link
 * effect in App.tsx opens the wizard in preselected mode (origin persists
 * via the store, so the From-where answer survives the navigation).
 */
export function ExplorePage() {
  const { clusters: rawClusters } = useClusters()
  const clusters = [...rawClusters].sort(
    (a, b) => (b.seasonalScores[season] ?? 0) - (a.seasonalScores[season] ?? 0)
  )

  const planSubDest = (cluster: VicCluster, sub: SubDest) => {
    window.location.href = `/?dest=${encodeURIComponent(sub.id)}&cluster=${encodeURIComponent(cluster.id)}`
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      overflowX: 'hidden',
    }}>
      {/* ── Nav — matches landing ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 60,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      }}>
        <a href="/" style={{ textDecoration: 'none', fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: '#1C1C1A', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          Unplanned<span style={{ color: GREEN }}> Escapes</span>
          <span style={{ color: '#8C8A87', fontWeight: 400, fontSize: 13 }}> Victoria</span>
        </a>
        <a href="/" className="mu-nav-btn" style={{
          padding: '7px 16px', borderRadius: 9,
          background: 'transparent', border: '1.5px solid var(--border)',
          color: '#4A4948', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', letterSpacing: '-0.01em', textDecoration: 'none',
        }}>
          ← Home
        </a>
      </nav>

      {/* ── Cluster cards grid ── */}
      <section style={{ padding: '48px 24px 100px', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Victoria's best weekend escapes
          </div>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 'clamp(26px, 3.6vw, 36px)',
            fontWeight: 700, letterSpacing: '-0.02em', color: '#1C1C1A', marginBottom: 8,
          }}>
            Browse all destinations
          </h1>
          <p style={{ fontSize: 13, color: '#8C8A87', lineHeight: 1.6 }}>
            Sorted by what's best this {season}. Drive times calculated from your suburb — click any destination to preview what's there before committing.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 24,
        }}>
          {clusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              season={season}
              onPlan={planSubDest}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
