import { useEffect, useState } from 'react'
import { GREEN } from '@/lib/brand'
import { supabase } from '@/lib/supabase'

interface Entry {
  id: number
  deployed_at: string
  title: string
}

// Only show entries whose title matches something user-visible
const USER_FACING: RegExp[] = [
  /map/i, /wizard/i, /hero/i, /loading.screen/i, /scroll/i, /mobile/i,
  /animation/i, /card/i, /\btab\b/i, /filter/i, /search/i, /region/i,
  /food/i, /drink/i, /stay/i, /trail/i, /fuel/i, /hazard/i, /distance/i,
  /chip/i, /panel/i, /popup/i, /modal/i, /design/i, /layout/i,
  /colour/i, /color/i, /grid/i, /results?\s+page/i, /what'?s.here/i,
  /generating.screen/i, /banner/i, /image/i, /\btag\b/i, /timeline/i,
]

const BLOCKED: RegExp[] = [
  /\bDX\b/i, /\bskill\b/i, /cost.check/i, /mapcheck/i, /issue.sync/i,
  /\btoken\b/i, /migration/i, /enrichment/i, /\benrich\b/i, /bug.report/i,
  /deploy.log/i, /supabase/i, /api.key/i, /ME-\d/i, /brand.const/i,
  /rebrand/i, /Open-Meteo/i, /MET Norway/i, /Haiku/i, /geofabrik/i,
  /\bVHD\b/i, /\bosm\b/i, /overpass/i, /cron/i, /\bRLS\b/i, /\bauth\b/i,
  /log.client/i,
]

function isUserFacing(title: string): boolean {
  if (BLOCKED.some(re => re.test(title))) return false
  return USER_FACING.some(re => re.test(title))
}

// Strip issue refs and clean up title
function cleanTitle(raw: string): string {
  return raw
    .replace(/^#\d+([\s#\d]+)?—\s*/, '')
    .replace(/\(closes #\d+\)/g, '')
    .replace(/\(fixes #\d+\)/g, '')
    .trim()
    .replace(/^./, c => c.toUpperCase())
}

// Plain-English rewrites for technical commit titles
const REWRITES: [RegExp, string][] = [
  [/Loading screen.*mobile map-on-top/i,      'Map shown on arrival — results slide up when you\'re ready to browse'],
  [/Wizard stays open until data ready/i,      'Results load in the background while your preferences stay on screen'],
  [/M3 animations/i,                           'Smoother animations — cards lift on hover, tabs fade between views'],
  [/M3 Expressive wizard redesign/i,           'Refreshed trip planner with a cleaner, rounded design'],
  [/Hero redesign/i,                           'Cleaner home screen — clearer starting point'],
  [/Generating screen.*4WD/i,                  'Victorian landscape loading animation while your trip generates'],
  [/Region search/i,                           'Search by region name in the trip planner — Yarra Valley, Grampians, Mornington Peninsula and more'],
  [/VicEmergency hazard icons/i,               'Fire, flood & weather alerts now shown on the map'],
  [/distance labels.*food chips.*local/i,      'Distance from town on activity cards · Local vs Nearby split · Food category chips'],
  [/What'?s here.*same engine/i,               '"What\'s here" popup now shows full activity, food & trail detail — same as the results page'],
  [/What'?s here.*2-column/i,                  '"What\'s here" popup shows activities in a 2-column grid on desktop'],
  [/Geofabrik.*Food.*Drinks.*Stay/i,           'Food & Drinks tab · Places to Stay tab · Richer activity data across all destinations'],
  [/Ines feedback.*tags/i,                     'UI polish — tag styling, card layout, colour updates & trip timeline'],
  [/map.*fixed.*city|mobile.*map.*center/i,    'Map stays centred on your chosen destination as you browse activities'],
  [/two.phase scroll|scroll.*panel/i,          'Mobile panel expands fully before content scrolls — cleaner feel'],
]

function friendlyTitle(raw: string): string {
  for (const [re, friendly] of REWRITES) if (re.test(raw)) return friendly
  return cleanTitle(raw)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function groupByDate(entries: Entry[]): [string, Entry[]][] {
  const map = new Map<string, Entry[]>()
  for (const e of entries) {
    const d = formatDate(e.deployed_at)
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(e)
  }
  return [...map.entries()]
}

export function ChangelogPage({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('changelog')
      .select('id, deployed_at, title')
      .order('deployed_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setEntries((data as Entry[] ?? []).filter(e => isUserFacing(e.title)))
        setLoading(false)
      })
  }, [])

  const groups = groupByDate(entries)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>

      {/* Nav — identical to LandingPage */}
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
        <a href="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Unplanned<span style={{ color: GREEN }}> Escapes</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13 }}> Victoria</span>
          </div>
        </a>
        <button onClick={onBack} style={{
          padding: '7px 16px', borderRadius: 9,
          background: GREEN, border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', letterSpacing: '-0.01em',
        }}>
          Plan a trip
        </button>
      </nav>

      {/* Page hero */}
      <section style={{
        padding: 'clamp(40px, 6vw, 72px) 28px clamp(32px, 5vw, 56px)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-base)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            What's new
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Improvements that make finding your next Victorian escape a little easier. Bug fixes and behind-the-scenes work aren't listed.
          </p>
        </div>
      </section>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 28px 80px' }}>

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {[120, 80, 100].map((w, i) => (
              <div key={i}>
                <div style={{ height: 11, width: 100, background: 'var(--bg-subtle)', borderRadius: 4, marginBottom: 16 }} />
                <div style={{ borderLeft: '3px solid var(--border)', paddingLeft: 20, marginLeft: 3, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ height: 16, width: `${w}%`, maxWidth: 400, background: 'var(--bg-muted)', borderRadius: 4 }} />
                  <div style={{ height: 16, width: `${w * 0.7}%`, maxWidth: 300, background: 'var(--bg-muted)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && groups.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No updates yet — check back soon.</p>
        )}

        {/* Grouped entries */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {groups.map(([date, dayEntries]) => (
            <div key={date} style={{ marginBottom: 44 }}>

              {/* Date row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                <span style={{
                  fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {date}
                </span>
              </div>

              {/* Day card — one card per date with bullet list inside */}
              <div style={{
                marginLeft: 3, paddingLeft: 19, borderLeft: '2px solid var(--border)',
              }}>
                <div style={{
                  background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dayEntries.map(e => (
                      <li key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ color: GREEN, fontWeight: 700, fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                          {friendlyTitle(e.title)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Footer — matches LandingPage exactly */}
      <footer style={{ background: GREEN, padding: '32px 28px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Unplanned Escapes
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 500, marginTop: 1 }}>Victoria</div>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <a href="/changelog" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, textDecoration: 'none', letterSpacing: '-0.01em' }}>What's new</a>
              <a href="/privacy" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, textDecoration: 'none', letterSpacing: '-0.01em' }}>Privacy &amp; About</a>
            </div>
          </div>
          <div style={{ marginBottom: 16, fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>OpenStreetMap contributors</a>
            {' '}(ODbL) · Map tiles © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>CARTO</a>
            {' '}· Destination content © <a href="https://en.wikipedia.org" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>Wikipedia contributors</a>
            {' '}(CC BY-SA) · Trail data © <a href="https://www.data.vic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>DataVic</a>
            {' '}(CC BY 4.0) · Heritage data © <a href="https://vhd.heritagecouncil.vic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>Heritage Council Victoria</a>
            {' '}(CC BY 4.0) · Fuel data © State of Victoria · Weather by{' '}
            <a href="https://api.met.no" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>MET Norway</a>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>Helping Victorians escape, one weekend at a time.</span>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>
              Created by <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cubix IT Solutions</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  )
}
