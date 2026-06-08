import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from '../_lib/supabase.js'
import { VICTORIAN_CLUSTERS } from '../../src/data/victorianClusters.js'

const BASE_URL = 'https://unplannedescapes.com.au'
const GREEN = '#3A6B4F'
const BG = '#F8F7F4'

const HEAD = (title: string, desc: string, canonical: string, ogImage: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${canonical}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${ogImage}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${ogImage}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:${BG};color:#1a2e1f;line-height:1.6}
a{color:inherit;text-decoration:none}
.nav{position:sticky;top:0;z-index:10;background:${BG};border-bottom:1px solid #dde8dc;padding:14px 20px;display:flex;align-items:center;gap:12px}
.nav-back{color:${GREEN};font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px}
.nav-logo{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:${GREEN}}
.hero{position:relative;height:320px;overflow:hidden;display:flex;align-items:flex-end}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.1) 60%)}
.hero-text{position:relative;padding:28px 24px;color:#fff}
.hero-title{font-family:'Fraunces',serif;font-size:32px;font-weight:700;line-height:1.15;margin-bottom:6px}
.hero-sub{font-size:15px;opacity:0.9;max-width:540px}
.container{max-width:900px;margin:0 auto;padding:32px 20px 80px}
.section-title{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:#002112;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.card{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #dde8dc;transition:box-shadow 0.15s}
.card:hover{box-shadow:0 4px 20px rgba(58,107,79,0.15)}
.card-img{height:160px;object-fit:cover;width:100%}
.card-body{padding:16px}
.card-title{font-family:'Fraunces',serif;font-size:17px;font-weight:700;color:#002112;margin-bottom:4px}
.card-sub{font-size:13px;color:#5a7a63;margin-bottom:10px}
.card-desc{font-size:13px;color:#4a5e4e;line-height:1.5;margin-bottom:12px}
.chip{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#eaf2ec;color:${GREEN};margin:2px 2px 2px 0}
.badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${GREEN};color:#fff;margin-bottom:8px}
.drive{font-size:12px;color:#6b8f72;font-weight:500}
.cta-btn{display:inline-block;background:${GREEN};color:#fff;padding:14px 28px;border-radius:28px;font-weight:700;font-size:15px;transition:opacity 0.15s;margin-top:8px}
.cta-btn:hover{opacity:0.88}
.cta-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #dde8dc;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;z-index:20}
.cta-bar-title{font-size:13px;font-weight:600;color:#002112}
.highlights{list-style:none;margin-top:8px}
.highlights li{font-size:13px;color:#4a5e4e;padding:3px 0;padding-left:16px;position:relative}
.highlights li::before{content:'→';position:absolute;left:0;color:${GREEN};font-weight:600}
.section{margin-bottom:36px}
.activity-card{background:#fff;border-radius:12px;border:1px solid #dde8dc;padding:14px 16px;display:flex;gap:12px;align-items:flex-start}
.activity-emoji{font-size:24px;flex-shrink:0;margin-top:2px}
.activity-name{font-weight:600;font-size:14px;color:#002112;margin-bottom:2px}
.activity-desc{font-size:13px;color:#4a5e4e;line-height:1.5}
.nearby-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.nearby-chip{background:#fff;border:1px solid #dde8dc;border-radius:20px;padding:6px 14px;font-size:13px;font-weight:500;color:${GREEN};transition:background 0.12s}
.nearby-chip:hover{background:#eaf2ec}
.breadcrumb{font-size:13px;color:#6b8f72;margin-bottom:20px}
.breadcrumb a{color:${GREEN};font-weight:500}
.breadcrumb span{margin:0 6px}
footer{text-align:center;padding:24px 20px;font-size:11px;color:#8faa92;border-top:1px solid #dde8dc}
@media(max-width:600px){.hero{height:240px}.hero-title{font-size:24px}.cta-bar{padding:10px 16px}}
</style>
</head>
<body>`

const FOOT = `<footer>Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Built with ❤️ in Melbourne</footer>
</body></html>`

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function driveLabel(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  return `${hours.toFixed(1).replace('.0', '')} hr`
}

// ── Index page ─────────────────────────────────────────────────────────────
function renderIndex(res: VercelResponse) {
  const title = 'Victorian Weekend Getaways — All Destinations | Unplanned Escapes'
  const desc = 'Explore 15+ Victorian regions for your next weekend escape — Yarra Valley, Mornington Peninsula, Great Ocean Road, Grampians and more.'
  const canonical = `${BASE_URL}/destinations`
  const ogImage = `${BASE_URL}/og-image.png`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Victorian Weekend Getaway Destinations',
    description: desc,
    itemListElement: VICTORIAN_CLUSTERS.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/destinations/${c.id}`,
      name: c.name,
    })),
  }

  const cards = VICTORIAN_CLUSTERS.map(c => `
    <a href="/destinations/${c.id}" class="card">
      <img class="card-img" src="${c.imageUrl}&w=600&q=70" alt="${esc(c.name)}" loading="lazy"/>
      <div class="card-body">
        <div class="drive">🚗 ${c.driveTimeRange} from Melbourne</div>
        <div class="card-title">${esc(c.name)}</div>
        <div class="card-desc">${esc(c.tagline)}</div>
        ${c.themes.slice(0, 3).map(t => `<span class="chip">${esc(t)}</span>`).join('')}
      </div>
    </a>`).join('')

  const html = HEAD(title, desc, canonical, ogImage) + `
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<nav class="nav">
  <a class="nav-logo" href="/">Unplanned Escapes</a>
</nav>
<div class="container">
  <h1 style="font-family:'Fraunces',serif;font-size:28px;font-weight:700;color:#002112;margin-bottom:8px">Victorian Weekend Destinations</h1>
  <p style="color:#5a7a63;font-size:15px;margin-bottom:32px">Pick a region to explore what's on, things to do, and where to eat.</p>
  <div class="grid">${cards}</div>
</div>
${FOOT}`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  return res.status(200).send(html)
}

// ── Region page ───────────────────────────────────────────────────────────
async function renderRegion(regionSlug: string, res: VercelResponse) {
  const cluster = VICTORIAN_CLUSTERS.find(c => c.id === regionSlug)
  if (!cluster) return res.status(404).send('Region not found')

  const title = `${cluster.name} Weekend Getaways — Things to Do | Unplanned Escapes`
  const desc = cluster.tagline
  const canonical = `${BASE_URL}/destinations/${cluster.id}`

  // Fetch activity counts per sub-dest
  const slugs = cluster.subDests.map(s => s.id)
  let activityCounts: Record<string, number> = {}

  if (adminSupabase) {
    try {
      const { data: sdRows } = await adminSupabase
        .from('sub_destinations').select('sub_dest_id, slug').in('slug', slugs)

      if (sdRows?.length) {
        const counts = await Promise.all(
          sdRows.map(async (row: { sub_dest_id: number; slug: string }) => {
            const { count } = await adminSupabase!
              .from('activities').select('*', { count: 'exact', head: true })
              .eq('sub_dest_id', row.sub_dest_id)
            return { slug: row.slug, count: count ?? 0 }
          })
        )
        counts.forEach(({ slug, count }) => { activityCounts[slug] = count })
      }
    } catch (_) { /* fall through to static-only */ }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: cluster.name,
    description: desc,
    url: canonical,
    image: cluster.imageUrl,
    touristType: cluster.themes,
    containsPlace: cluster.subDests.map(s => ({
      '@type': 'TouristDestination',
      name: s.name,
      url: `${BASE_URL}/destinations/${cluster.id}/${s.id}`,
    })),
  }

  const cards = cluster.subDests.map(s => {
    const count = activityCounts[s.id]
    const img = s.imageUrl || cluster.imageUrl
    return `
    <a href="/destinations/${cluster.id}/${s.id}" class="card">
      <img class="card-img" src="${img}&w=600&q=70" alt="${esc(s.name)}" loading="lazy"/>
      <div class="card-body">
        <div class="drive">🚗 ${driveLabel(s.driveTimeHours)} from Melbourne · ${s.driveKm} km</div>
        <div class="card-title">${esc(s.name)}</div>
        ${count ? `<div class="card-sub">${count} things to do</div>` : ''}
        <ul class="highlights">${s.highlights.slice(0, 3).map(h => `<li>${esc(h)}</li>`).join('')}</ul>
      </div>
    </a>`
  }).join('')

  const html = HEAD(title, desc, canonical, cluster.imageUrl) + `
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<nav class="nav">
  <a class="nav-back" href="/destinations">← All Regions</a>
  <span style="color:#dde8dc">|</span>
  <span class="nav-logo">${esc(cluster.name)}</span>
</nav>
<div class="hero">
  <img src="${cluster.imageUrl}&w=1200&q=80" alt="${esc(cluster.name)}"/>
  <div class="hero-grad"></div>
  <div class="hero-text">
    <div class="hero-title">${esc(cluster.name)}</div>
    <div class="hero-sub">${esc(cluster.tagline)}</div>
  </div>
</div>
<div class="container">
  <div class="breadcrumb"><a href="/destinations">Destinations</a><span>›</span>${esc(cluster.name)}</div>
  <h2 class="section-title">Where to go in ${esc(cluster.name)}</h2>
  <div class="grid">${cards}</div>
  <div style="margin-top:40px;text-align:center">
    <a class="cta-btn" href="/?cluster=${cluster.id}">Plan a ${esc(cluster.name)} escape →</a>
  </div>
</div>
${FOOT}`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(html)
}

// ── Destination page ───────────────────────────────────────────────────────
async function renderDestination(regionSlug: string, destSlug: string, res: VercelResponse) {
  const cluster = VICTORIAN_CLUSTERS.find(c => c.id === regionSlug)
  const sub = cluster?.subDests.find(s => s.id === destSlug)
  if (!cluster || !sub) return res.status(404).send('Destination not found')

  const title = `${sub.name} — Things to Do, Food & Nature | Unplanned Escapes`
  const canonical = `${BASE_URL}/destinations/${cluster.id}/${sub.id}`
  const heroImg = sub.imageUrl || cluster.imageUrl

  let aiSummary = ''
  let bestFor: string[] = []
  let activities: { name: string; category: string; emoji: string; description: string; is_hidden_gem: boolean }[] = []
  let food: { name: string; category: string; description: string }[] = []
  let nature: { name: string; description: string }[] = []

  if (adminSupabase) {
    try {
      const { data: sdRow } = await adminSupabase
        .from('sub_destinations').select('sub_dest_id').eq('slug', destSlug).single()

      if (sdRow) {
        const id = sdRow.sub_dest_id
        const [summaryRes, activitiesRes, foodRes, natureRes] = await Promise.all([
          adminSupabase.from('destination_summaries').select('ai_summary, best_for').eq('sub_dest_id', id).single(),
          adminSupabase.from('activities').select('name, category, emoji, description, is_hidden_gem').eq('sub_dest_id', id).order('is_hidden_gem', { ascending: false }).limit(12),
          adminSupabase.from('food_places').select('name, category, description').eq('sub_dest_id', id).limit(8),
          adminSupabase.from('nature_spots').select('name, description').eq('sub_dest_id', id).limit(6),
        ])
        aiSummary = summaryRes.data?.ai_summary ?? ''
        bestFor = summaryRes.data?.best_for ?? []
        activities = activitiesRes.data ?? []
        food = foodRes.data ?? []
        nature = natureRes.data ?? []
      }
    } catch (_) { /* fall through to static */ }
  }

  const desc = aiSummary || sub.highlights.join(', ')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: sub.name,
    description: desc,
    url: canonical,
    image: heroImg,
    geo: { '@type': 'GeoCoordinates', latitude: sub.coord.lat, longitude: sub.coord.lng },
    containedInPlace: { '@type': 'TouristDestination', name: cluster.name, url: `${BASE_URL}/destinations/${cluster.id}` },
    touristType: bestFor.length ? bestFor : sub.themes,
  }

  const activityCards = activities.length ? `
    <div class="section">
      <h2 class="section-title">Things to Do</h2>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${activities.map(a => `
        <div class="activity-card">
          <div class="activity-emoji">${a.emoji || '📍'}</div>
          <div>
            ${a.is_hidden_gem ? '<span class="badge">💎 Hidden gem</span><br/>' : ''}
            <div class="activity-name">${esc(a.name)}</div>
            <span class="chip">${esc(a.category)}</span>
            ${a.description ? `<div class="activity-desc">${esc(a.description)}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>` : `
    <div class="section">
      <h2 class="section-title">Highlights</h2>
      <ul class="highlights" style="margin-left:0">
        ${sub.highlights.map(h => `<li style="margin-bottom:6px">${esc(h)}</li>`).join('')}
      </ul>
    </div>`

  const foodSection = food.length ? `
    <div class="section">
      <h2 class="section-title">Food & Drink</h2>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${food.map(f => `
        <div class="activity-card">
          <div class="activity-emoji">🍽</div>
          <div>
            <div class="activity-name">${esc(f.name)}</div>
            <span class="chip">${esc(f.category)}</span>
            ${f.description ? `<div class="activity-desc">${esc(f.description)}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>` : ''

  const natureSection = nature.length ? `
    <div class="section">
      <h2 class="section-title">Nature & Outdoors</h2>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${nature.map(n => `
        <div class="activity-card">
          <div class="activity-emoji">🌿</div>
          <div>
            <div class="activity-name">${esc(n.name)}</div>
            ${n.description ? `<div class="activity-desc">${esc(n.description)}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>` : ''

  const nearbySection = sub.nearbyIds?.length ? `
    <div class="section">
      <h3 style="font-size:15px;font-weight:600;color:#5a7a63;margin-bottom:10px">Also nearby</h3>
      <div class="nearby-row">
        ${sub.nearbyIds.map(nid => {
          const nc = VICTORIAN_CLUSTERS.find(c => c.subDests.some(s => s.id === nid))
          const ns = nc?.subDests.find(s => s.id === nid)
          if (!ns || !nc) return ''
          return `<a class="nearby-chip" href="/destinations/${nc.id}/${nid}">${esc(ns.name)}</a>`
        }).join('')}
      </div>
    </div>` : ''

  const html = HEAD(title, desc, canonical, heroImg) + `
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<nav class="nav">
  <a class="nav-back" href="/destinations/${cluster.id}">← ${esc(cluster.name)}</a>
</nav>
<div class="hero">
  <img src="${heroImg}&w=1200&q=80" alt="${esc(sub.name)}"/>
  <div class="hero-grad"></div>
  <div class="hero-text">
    <div class="hero-title">${esc(sub.name)}</div>
    <div class="hero-sub">🚗 ${driveLabel(sub.driveTimeHours)} from Melbourne · ${sub.driveKm} km</div>
  </div>
</div>
<div class="container" style="padding-bottom:100px">
  <div class="breadcrumb">
    <a href="/destinations">Destinations</a><span>›</span>
    <a href="/destinations/${cluster.id}">${esc(cluster.name)}</a><span>›</span>
    ${esc(sub.name)}
  </div>
  ${aiSummary ? `<p style="font-size:15px;color:#4a5e4e;margin-bottom:8px;line-height:1.7">${esc(aiSummary)}</p>` : ''}
  ${bestFor.length ? `<div style="margin-bottom:28px">${bestFor.map(b => `<span class="chip">✓ ${esc(b)}</span>`).join('')}</div>` : '<div style="margin-bottom:28px"></div>'}
  ${activityCards}
  ${foodSection}
  ${natureSection}
  ${nearbySection}
</div>
<div class="cta-bar">
  <div>
    <div class="cta-bar-title">Plan your ${esc(sub.name)} escape</div>
    <div style="font-size:12px;color:#6b8f72">Personalised itinerary in 30 seconds</div>
  </div>
  <a class="cta-btn" href="/?dest=${sub.id}&cluster=${cluster.id}" style="margin-top:0;padding:10px 20px;font-size:14px">Start planning →</a>
</div>
${FOOT}`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(html)
}

// ── Main handler ───────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Parse slug from query param (Vercel prod) or URL path (vercel dev fallback)
  const raw = req.query.slug
  let parts: string[] = raw
    ? (Array.isArray(raw) ? raw : [raw]).flatMap(p => p.split('/').filter(Boolean))
    : []

  // Fallback: parse from URL path when query param isn't populated (vercel dev)
  if (parts.length === 0 && req.url) {
    const pathname = req.url.split('?')[0]
    const after = pathname.replace(/^\/api\/destinations\/?/, '').replace(/^\/destinations\/?/, '')
    parts = after.split('/').filter(Boolean)
  }

  if (parts.length === 0 || parts[0] === '--index--') return renderIndex(res)
  if (parts.length === 1) return renderRegion(parts[0], res)
  if (parts.length === 2) return renderDestination(parts[0], parts[1], res)
  return res.status(404).send('Not found')
}
