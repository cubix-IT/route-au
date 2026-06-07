import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

const GREEN = '#3A6B4F'

// Only show if title matches one of these patterns — everything else is filtered out.
// This is intentionally strict: backend work, infra, tokens, scripts are invisible to users.
const USER_FACING_PATTERNS = [
  /map/i,
  /wizard/i,
  /hero/i,
  /loading.screen/i,
  /scroll/i,
  /mobile/i,
  /animation/i,
  /card/i,
  /tab/i,
  /filter/i,
  /search/i,
  /region/i,
  /food/i,
  /drink/i,
  /stay/i,
  /trail/i,
  /fuel/i,
  /hazard/i,
  /distance/i,
  /chip/i,
  /panel/i,
  /popup/i,
  /modal/i,
  /design/i,
  /layout/i,
  /colour/i,
  /color/i,
  /grid/i,
  /results?\s+page/i,
  /what'?s.here/i,
  /generating.screen/i,
  /banner/i,
  /image/i,
  /tag/i,
  /timeline/i,
  /feedback.*ui/i,
]

// Hard block — always excluded even if a pattern above matches
const BLOCK_PATTERNS = [
  /\bDX\b/i, /\bskill\b/i, /cost.check/i, /mapcheck/i, /issue.sync/i,
  /\btoken\b/i, /migration/i, /enrichment/i, /\benrich\b/i,
  /bug.report/i, /deploy.log/i, /supabase/i, /api.key/i,
  /ME-\d/i, /brand.const/i, /rebrand/i, /log deploy/i,
  /Open-Meteo/i, /MET Norway/i, /Haiku/i, /geofabrik/i,
  /VHD/i, /osm/i, /overpass/i, /cron/i, /RLS/i, /auth/i,
]

function isUserFacing(title: string): boolean {
  if (BLOCK_PATTERNS.some(re => re.test(title))) return false
  return USER_FACING_PATTERNS.some(re => re.test(title))
}

// Strip technical cruft from titles
function cleanTitle(raw: string): string {
  let t = raw
    .replace(/^#\d+([\s#\d]+)?— /, '')    // strip issue refs "#6 #30 #31 — "
    .replace(/\(closes #\d+\)/g, '')
    .replace(/\(fixes #\d+\)/g, '')
    .trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// Rewrite overly technical titles into plain English
const REWRITES: [RegExp, string][] = [
  [/Loading screen.*mobile map-on-top.*/i,       'Map shown first on mobile — results slide up underneath'],
  [/Wizard stays open until data ready/i,         'Results load in the background while your preferences stay visible'],
  [/M3 animations.*/i,                           'Smoother animations — cards lift on hover, tabs fade between views'],
  [/M3 Expressive wizard redesign.*/i,            'Refreshed trip planner with a cleaner, modern design'],
  [/Hero redesign.*/i,                            'Cleaner home screen with a clearer starting point'],
  [/Generating screen.*4WD/i,                     'Victorian landscape loading animation while your trip is being built'],
  [/Region search.*/i,                            'Search by region (Yarra Valley, Grampians, Mornington Peninsula, etc.) in the trip planner'],
  [/VicEmergency hazard icons/i,                  'Fire, flood & weather hazard alerts now shown on the map'],
  [/distance labels.*food chips.*local/i,         'Distance from town on activity cards · Local vs Nearby split · Food category chips'],
  [/What\'s here.*same engine/i,                  '"What\'s here" popup now shows the same rich detail as the results page'],
  [/What\'s here.*2-column/i,                     '"What\'s here" popup displays activities in a 2-column grid on desktop'],
  [/Geofabrik.*Food.*Drinks.*Stay/i,              'Food & Drinks tab · Places to Stay tab · Richer activity data across all destinations'],
  [/Ines feedback.*tags.*card layout/i,           'UI polish — tag styling, card layout, colour updates & trip timeline'],
  [/map.*fixed.*city.*mobile/i,                   'Mobile map stays centred on your chosen destination when browsing activities'],
  [/two-phase scroll/i,                           'Scrolling in the mobile panel now expands it first before scrolling cards'],
]

function friendlyTitle(raw: string): string {
  for (const [re, friendly] of REWRITES) {
    if (re.test(raw)) return friendly
  }
  return cleanTitle(raw)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Melbourne',
  })
}

// Group by calendar date (AEST)
function groupByDate(rows: { deployed_at: string; title: string; description: string | null; git_sha: string | null }[]) {
  const map = new Map<string, typeof rows>()
  for (const row of rows) {
    const d = formatDate(row.deployed_at)
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(row)
  }
  return [...map.entries()].map(([date, entries]) => ({ date, entries }))
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data: rows, error } = adminSupabase
    ? await adminSupabase
        .from('changelog')
        .select('deployed_at, title, description, git_sha')
        .order('deployed_at', { ascending: false })
        .limit(200)
    : { data: [], error: null }

  if (error) return res.status(500).send('Error loading changelog')

  // Filter to user-facing only, then group by date
  const filtered = (rows ?? []).filter(r => isUserFacing(r.title))
  const groups = groupByDate(filtered)

  const entriesHtml = groups.length === 0
    ? '<p style="color:#9CA3AF;font-size:14px">No updates yet.</p>'
    : groups.map(g => `
      <div class="release">
        <div class="release-date">${g.date}</div>
        <ul class="release-list">
          ${g.entries.map(e => `
            <li>
              <span class="dot"></span>
              <span>${friendlyTitle(e.title)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>What's New — Unplanned Escapes</title>
  <meta name="description" content="Recent improvements to Unplanned Escapes — Victorian weekend getaway discovery.">
  <link rel="canonical" href="https://unplanned-escapes.vercel.app/changelog">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F8F7F4; color: #1C1C1A }
    a { color: ${GREEN} }

    nav {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; gap: 10px;
      padding: 0 28px; height: 60px;
      background: rgba(255,255,255,0.88);
      backdrop-filter: blur(24px);
      border-bottom: 1px solid rgba(0,0,0,0.07);
    }
    .back { font-size: 18px; color: #8C8A87; text-decoration: none; line-height: 1 }
    .brand { font-family: 'Fraunces', Georgia, serif; font-size: 16px; font-weight: 700; color: #1C1C1A; text-decoration: none; letter-spacing: -0.02em }

    main { max-width: 640px; margin: 0 auto; padding: 56px 28px 80px }
    h1 { font-family: 'Fraunces', Georgia, serif; font-size: 36px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 8px }
    .subtitle { font-size: 14px; color: #8C8A87; margin: 0 0 52px; line-height: 1.6 }

    .release { display: flex; flex-direction: column; gap: 0; margin-bottom: 0 }
    .release-date {
      display: flex; align-items: center; gap: 10px;
      font-size: 12px; font-weight: 700; color: #8C8A87;
      letter-spacing: 0.06em; text-transform: uppercase;
      margin-bottom: 14px; margin-top: 40px;
    }
    .release-date::before {
      content: ''; display: block;
      width: 8px; height: 8px; border-radius: 50%;
      background: ${GREEN}; flex-shrink: 0;
    }

    .release-list {
      list-style: none; margin: 0; padding: 0;
      border-left: 3px solid #E8E5E0;
      padding-left: 20px; margin-left: 3px;
      display: flex; flex-direction: column; gap: 14px;
    }
    .release-list li {
      display: flex; align-items: flex-start; gap: 10px;
      font-size: 15px; color: #1C1C1A; line-height: 1.5; font-weight: 500;
    }
    .dot { display: none }

    footer { background: ${GREEN}; padding: 28px }
    .footer-inner { max-width: 640px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px }
    .footer-brand { font-family: 'Fraunces', Georgia, serif; font-size: 14px; font-weight: 700; color: #fff }
    .footer-links { display: flex; gap: 16px }
    .footer-links a { font-size: 12px; color: rgba(255,255,255,0.7); text-decoration: none }
  </style>
</head>
<body>

<nav>
  <a href="/" class="back">←</a>
  <a href="/" class="brand">Unplanned<span style="color:${GREEN}"> Escapes</span><span style="color:#8C8A87;font-weight:400;font-size:13px"> Victoria</span></a>
</nav>

<main>
  <h1>What's new</h1>
  <p class="subtitle">Improvements that make finding your next Victorian escape a little easier. Bug fixes and behind-the-scenes work aren't listed.</p>
  ${entriesHtml}
</main>

<footer>
  <div class="footer-inner">
    <span class="footer-brand">Unplanned Escapes</span>
    <div class="footer-links">
      <a href="/privacy">Privacy &amp; About</a>
    </div>
  </div>
</footer>

</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  return res.status(200).send(html)
}
