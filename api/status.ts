import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

const OVERPASS_DAILY_LIMIT = 9_000
const SUPABASE_DB_LIMIT_MB = 500
const RESEND_MONTHLY_LIMIT = 3_000

function levelColor(pct: number) {
  if (pct >= 90) return '#DC2626'
  if (pct >= 70) return '#D97706'
  return '#16A34A'
}

function bar(pct: number) {
  const color = levelColor(pct)
  return `<div style="height:5px;border-radius:3px;background:#E5E7EB;margin-top:5px">
    <div style="height:100%;border-radius:3px;background:${color};width:${Math.min(pct,100)}%"></div>
  </div>`
}

function dot(ok: boolean, warn = false) {
  const color = !ok ? '#DC2626' : warn ? '#D97706' : '#16A34A'
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;flex-shrink:0"></span>`
}

function timeAgo(iso: string | null) {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return `${Math.floor(diff / 60000)}m ago`
}

function aest(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!adminSupabase) return res.status(500).json({ error: 'Supabase not configured' })

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const monthStr = now.toISOString().slice(0, 7)

  // Fetch everything in parallel
  const [
    cronStatusRes,
    clustersRes,
    subDestsRes,
    actRes, foodRes, natureRes,
    overpassRes,
    emailCountRes,
  ] = await Promise.all([
    adminSupabase.from('cron_status').select('*'),
    adminSupabase.from('clusters').select('cluster_id, name').order('name'),
    adminSupabase.from('sub_destinations').select('sub_dest_id, name, cluster_id, enriched_at').order('name'),
    adminSupabase.from('activities').select('*', { count: 'exact', head: true }),
    adminSupabase.from('food_places').select('*', { count: 'exact', head: true }),
    adminSupabase.from('nature_spots').select('*', { count: 'exact', head: true }),
    adminSupabase.from('cron_log').select('message').eq('job_name', 'enrich-places').gte('run_at', todayStr).order('run_at', { ascending: false }).limit(10),
    adminSupabase.from('cron_log').select('*', { count: 'exact', head: true }).eq('status', 'ok').gte('run_at', `${monthStr}-01`),
  ])

  const cronJobs = cronStatusRes.data ?? []
  const clusters = clustersRes.data ?? []
  const subDests = subDestsRes.data ?? []

  // Overpass calls today
  let overpassToday = 0
  for (const row of overpassRes.data ?? []) {
    const m = (row.message ?? '').match(/overpass[:\s]+(\d+)/i)
    if (m) overpassToday = Math.max(overpassToday, parseInt(m[1]))
  }

  const totalRows = (actRes.count ?? 0) + (foodRes.count ?? 0) + (natureRes.count ?? 0)
  const estimatedMB = Math.round(totalRows * 2 / 1024)
  const emailsMonth = emailCountRes.count ?? 0

  const wantsHtml = req.headers.accept?.includes('text/html')
  if (!wantsHtml) {
    return res.status(200).json({
      generated_at: now.toISOString(),
      cron_jobs: cronJobs,
      data: { activities: actRes.count, food_places: foodRes.count, nature_spots: natureRes.count },
      overpass_today: overpassToday,
      estimated_db_mb: estimatedMB,
    })
  }

  // Group sub-destinations by cluster
  const clusterMap = new Map(clusters.map(c => [c.cluster_id, c.name]))
  const byCluster: Record<string, typeof subDests> = {}
  for (const sd of subDests) {
    const cname = clusterMap.get(sd.cluster_id) ?? 'Other'
    if (!byCluster[cname]) byCluster[cname] = []
    byCluster[cname].push(sd)
  }

  const enrichJob = cronJobs.find(j => j.job_name === 'enrich-places')
  const fuelJob   = cronJobs.find(j => j.job_name === 'fuel-prices')
  const summJob   = cronJobs.find(j => j.job_name === 'enrich-summaries')

  const staleThreshold = Date.now() - 29 * 24 * 3600000
  const totalDests = subDests.length
  const enrichedDests = subDests.filter(sd => sd.enriched_at && new Date(sd.enriched_at).getTime() > staleThreshold).length

  const html = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unplanned Escapes — Status</title>
<style>
  * { box-sizing: border-box }
  body { font-family: -apple-system, sans-serif; background: #F2F5F1; color: #002112; margin: 0; padding: 24px; max-width: 1100px; margin: 0 auto }
  h1 { font-size: 22px; font-weight: 700; margin: 0 0 2px; color: #002112 }
  .sub { color: #6F7F71; font-size: 12px; margin: 0 0 24px }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 24px }
  .card { background: #ECF0EB; border-radius: 16px; padding: 16px }
  .card-title { font-size: 11px; font-weight: 700; color: #6F7F71; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px }
  .big { font-size: 26px; font-weight: 700; color: #002112 }
  .stat { font-size: 12px; color: #6F7F71; margin-top: 4px }
  h2 { font-size: 13px; font-weight: 700; margin: 24px 0 10px; color: #3A6B4F; text-transform: uppercase; letter-spacing: 0.06em }
  .job-row { display: flex; align-items: center; background: #ECF0EB; border-radius: 12px; padding: 12px 16px; margin-bottom: 6px; gap: 10px }
  .job-name { font-size: 13px; font-weight: 600; flex: 1; color: #002112 }
  .job-meta { font-size: 11px; color: #6F7F71 }
  .cluster-title { font-size: 11px; font-weight: 700; color: #3A6B4F; text-transform: uppercase; letter-spacing: .06em; margin: 16px 0 6px }
  .dest-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 4px; margin-bottom: 4px }
  .dest-chip { display: flex; align-items: center; background: #ECF0EB; border-radius: 8px; padding: 6px 10px; font-size: 11px }
  .dest-name { flex: 1; font-weight: 500; color: #002112 }
  .dest-age { color: #6F7F71; font-size: 10px }
</style>
</head><body>

<h1>Unplanned Escapes — Status</h1>
<p class="sub">Last checked: ${aest(now.toISOString())} AEST · <a href="/" style="color:#3A6B4F">← Back to app</a></p>

<div class="grid">
  <div class="card">
    <div class="card-title">Activities</div>
    <div class="big">${(actRes.count ?? 0).toLocaleString()}</div>
    <div class="stat">things to do</div>
  </div>
  <div class="card">
    <div class="card-title">Food & Drink</div>
    <div class="big">${(foodRes.count ?? 0).toLocaleString()}</div>
    <div class="stat">places</div>
  </div>
  <div class="card">
    <div class="card-title">Nature Spots</div>
    <div class="big">${(natureRes.count ?? 0).toLocaleString()}</div>
    <div class="stat">parks & reserves</div>
  </div>
  <div class="card">
    <div class="card-title">Destinations Enriched</div>
    <div class="big">${enrichedDests} <span style="font-size:14px;color:#6B7280">/ ${totalDests}</span></div>
    ${bar(Math.round(enrichedDests / totalDests * 100))}
    <div class="stat">${Math.round(enrichedDests / totalDests * 100)}% current</div>
  </div>
  <div class="card">
    <div class="card-title">Overpass API</div>
    <div class="big">${overpassToday} <span style="font-size:14px;color:#6B7280">/ ${OVERPASS_DAILY_LIMIT}</span></div>
    ${bar(Math.round(overpassToday / OVERPASS_DAILY_LIMIT * 100))}
    <div class="stat">calls today</div>
  </div>
  <div class="card">
    <div class="card-title">Database</div>
    <div class="big">~${estimatedMB} <span style="font-size:14px;color:#6B7280">MB</span></div>
    ${bar(Math.round(estimatedMB / SUPABASE_DB_LIMIT_MB * 100))}
    <div class="stat">of ${SUPABASE_DB_LIMIT_MB}MB free limit</div>
  </div>
  <div class="card">
    <div class="card-title">Resend Emails</div>
    <div class="big">${emailsMonth} <span style="font-size:14px;color:#6B7280">/ ${RESEND_MONTHLY_LIMIT}</span></div>
    ${bar(Math.round(emailsMonth / RESEND_MONTHLY_LIMIT * 100))}
    <div class="stat">this month</div>
  </div>
</div>

<h2>Cron Jobs</h2>
${[
  { job: enrichJob, label: 'Enrich Places (OSM)', schedule: 'Daily 11am AEST' },
  { job: fuelJob,   label: 'Fuel Prices',          schedule: 'Daily 3am AEST' },
  { job: summJob,   label: 'AI Summaries',          schedule: 'Weekly Sunday' },
].map(({ job, label, schedule }) => {
  const ok = !job?.last_error_at || (job?.last_success_at && job.last_success_at >= job.last_error_at)
  return `<div class="job-row">
    ${dot(!!ok)}
    <div>
      <div class="job-name">${label}</div>
      <div class="job-meta">${schedule} · last run: ${aest(job?.last_run_at ?? null)} (${timeAgo(job?.last_run_at ?? null)}) · last success: ${aest(job?.last_success_at ?? null)}</div>
      ${!ok && job?.last_error_message ? `<div style="font-size:11px;color:#DC2626;margin-top:2px">Error: ${job.last_error_message}</div>` : ''}
    </div>
  </div>`
}).join('')}

<h2>Destinations by Region</h2>
${Object.entries(byCluster).sort(([a],[b]) => a.localeCompare(b)).map(([cluster, dests]) => {
  const enriched = dests.filter(d => d.enriched_at && new Date(d.enriched_at).getTime() > staleThreshold).length
  return `<div class="cluster-title">${cluster} — ${enriched}/${dests.length} enriched</div>
  <div class="dest-grid">
    ${dests.map(d => {
      const fresh = d.enriched_at && new Date(d.enriched_at).getTime() > staleThreshold
      return `<div class="dest-chip">
        ${dot(!!fresh, !d.enriched_at)}
        <span class="dest-name">${d.name}</span>
        <span class="dest-age">${timeAgo(d.enriched_at)}</span>
      </div>`
    }).join('')}
  </div>`
}).join('')}

</body></html>`

  res.setHeader('Content-Type', 'text/html')
  return res.status(200).send(html)
}
