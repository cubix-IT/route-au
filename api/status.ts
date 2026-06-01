import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/status
// Returns usage stats + health for every free-tier service.
// Hard limits enforced — if any service is near limit, cron stops itself.
//
// Services monitored:
//   Overpass API  : 9,000 calls/day safe limit (hard limit ~10,000)
//   Wikipedia API : 200 req/min — tracked per-run only, no daily cap
//   Supabase free : 500MB database, 5GB bandwidth, 2 projects
//   Vercel Hobby  : 1M function invocations/month, 100 GB-hrs compute
// ─────────────────────────────────────────────────────────────────────────────

// Vercel Hobby hard limits
const VERCEL_INVOCATIONS_LIMIT = 1_000_000   // per month
const VERCEL_COMPUTE_LIMIT_GB_HRS = 100      // per month

// Overpass safe limit
const OVERPASS_DAILY_LIMIT = 9_000

// Supabase free limits
const SUPABASE_DB_LIMIT_MB    = 500
const SUPABASE_BW_LIMIT_GB    = 5

type Level = 'ok' | 'warn' | 'critical'

function level(used: number, limit: number): Level {
  const pct = used / limit
  if (pct >= 0.9) return 'critical'
  if (pct >= 0.7) return 'warn'
  return 'ok'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = new Date().toISOString().slice(0, 7)

  const report: Record<string, any> = {
    generated_at: new Date().toISOString(),
    services: {},
  }

  if (!adminSupabase) {
    return res.status(500).json({ error: 'Supabase admin client not available' })
  }

  // ── 1. Overpass usage (from cron_log today) ───────────────────────────────
  try {
    const { data: overpassRows } = await adminSupabase
      .from('cron_log')
      .select('notes')
      .gte('run_at', today)
      .eq('job_name', 'enrich-overpass')

    let overpassCallsToday = 0
    for (const row of overpassRows ?? []) {
      try {
        const notes = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes
        overpassCallsToday = Math.max(overpassCallsToday, notes?.overpassCallsToday ?? 0)
      } catch { /* */ }
    }

    report.services.overpass = {
      label: 'Overpass API (OpenStreetMap)',
      cost: 'Free forever',
      calls_today: overpassCallsToday,
      daily_limit: OVERPASS_DAILY_LIMIT,
      daily_remaining: OVERPASS_DAILY_LIMIT - overpassCallsToday,
      used_pct: Math.round((overpassCallsToday / OVERPASS_DAILY_LIMIT) * 100),
      status: level(overpassCallsToday, OVERPASS_DAILY_LIMIT),
      stop_condition: 'Cron stops if calls_today >= 9,000 or any query times out twice in a row',
    }
  } catch (e: any) {
    report.services.overpass = { status: 'unknown', error: e.message }
  }

  // ── 2. Wikipedia (per-run only — no daily cap, just rate limit) ───────────
  try {
    const { data: wikiRows } = await adminSupabase
      .from('cron_log')
      .select('notes')
      .gte('run_at', today)
      .eq('job_name', 'enrich-overpass')

    let wikiCallsToday = 0
    for (const row of wikiRows ?? []) {
      try {
        const notes = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes
        wikiCallsToday += notes?.wikipediaCallsThisRun ?? 0
      } catch { /* */ }
    }

    report.services.wikipedia = {
      label: 'Wikipedia REST API',
      cost: 'Free forever',
      calls_today: wikiCallsToday,
      rate_limit: '200 req/min (with User-Agent)',
      sleep_between_calls_ms: 350,
      status: 'ok',
      stop_condition: 'Skip destination on HTTP 429, continue with next',
    }
  } catch (e: any) {
    report.services.wikipedia = { status: 'unknown', error: e.message }
  }

  // ── 3. Supabase — DB size + row counts ────────────────────────────────────
  try {
    const tables = ['activities', 'food_places', 'nature_spots', 'accommodation', 'sub_destinations', 'clusters', 'cron_log']
    const counts: Record<string, number> = {}
    for (const table of tables) {
      const { count } = await adminSupabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      counts[table] = count ?? 0
    }

    // Estimate DB size: ~2KB average per row across all tables
    const totalRows = Object.values(counts).reduce((a, b) => a + b, 0)
    const estimatedMB = Math.round(totalRows * 2 / 1024)

    report.services.supabase = {
      label: 'Supabase (database)',
      cost: 'Free — 500MB limit',
      row_counts: counts,
      estimated_db_mb: estimatedMB,
      db_limit_mb: SUPABASE_DB_LIMIT_MB,
      db_used_pct: Math.round((estimatedMB / SUPABASE_DB_LIMIT_MB) * 100),
      bandwidth_limit_gb: SUPABASE_BW_LIMIT_GB,
      status: level(estimatedMB, SUPABASE_DB_LIMIT_MB),
      stop_condition: 'Cron stops if estimated DB size > 450MB. Project auto-pauses after 7 days inactivity.',
      warning: estimatedMB > 450 ? '⚠️ DB approaching 500MB limit — pause enrichment' : null,
    }
  } catch (e: any) {
    report.services.supabase = { status: 'unknown', error: e.message }
  }

  // ── 4. Vercel — function invocations this month (from cron_log count) ─────
  try {
    const { count: cronRunsMonth } = await adminSupabase
      .from('cron_log')
      .select('*', { count: 'exact', head: true })
      .gte('run_at', `${thisMonth}-01`)

    // Each cron run = 1 invocation. Frontend hits Supabase directly (not Vercel functions).
    // Other Vercel functions: /api/fuel (1/day), /api/summaries (1/week), /api/status (manual)
    const estimatedMonthlyInvocations = ((cronRunsMonth ?? 0) + 60)  // +60 for fuel/misc
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const dayOfMonth = new Date().getDate()
    const projectedMonthly = Math.round((estimatedMonthlyInvocations / dayOfMonth) * daysInMonth)

    report.services.vercel = {
      label: 'Vercel Hobby (serverless functions)',
      cost: 'Free — 1M invocations/month',
      cron_runs_this_month: cronRunsMonth ?? 0,
      estimated_invocations_this_month: estimatedMonthlyInvocations,
      projected_monthly: projectedMonthly,
      monthly_limit: VERCEL_INVOCATIONS_LIMIT,
      used_pct: Math.round((projectedMonthly / VERCEL_INVOCATIONS_LIMIT) * 100),
      compute_limit_gb_hrs: VERCEL_COMPUTE_LIMIT_GB_HRS,
      status: level(projectedMonthly, VERCEL_INVOCATIONS_LIMIT),
      note: 'Frontend queries Supabase directly — zero Vercel function calls from UI',
    }
  } catch (e: any) {
    report.services.vercel = { status: 'unknown', error: e.message }
  }

  // ── 5. Recent cron runs ───────────────────────────────────────────────────
  try {
    const { data: recentRuns } = await adminSupabase
      .from('cron_log')
      .select('job_name,run_at,status,message,records_upserted,destinations_processed,notes')
      .order('run_at', { ascending: false })
      .limit(10)

    report.recent_cron_runs = (recentRuns ?? []).map((r) => ({
      job: r.job_name,
      ran_at: r.run_at,
      status: r.status,
      message: r.message,
      records: r.records_upserted,
      destinations: r.destinations_processed,
      usage: (() => { try { return typeof r.notes === 'string' ? JSON.parse(r.notes) : r.notes } catch { return null } })(),
    }))
  } catch { /* */ }

  // ── Overall health ────────────────────────────────────────────────────────
  const statuses = Object.values(report.services).map((s: any) => s.status)
  report.overall = statuses.includes('critical') ? 'critical'
    : statuses.includes('warn') ? 'warn'
    : 'ok'

  // Return HTML dashboard if requested from browser, JSON otherwise
  const wantsHtml = req.headers.accept?.includes('text/html')
  if (!wantsHtml) return res.status(200).json(report)

  const s = report.services as any
  const overall = report.overall
  const statusColor = (st: string) => st === 'ok' ? '#16A34A' : st === 'warn' ? '#D97706' : '#DC2626'
  const statusDot = (st: string) => `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${statusColor(st)};margin-right:6px"></span>`
  const bar = (pct: number) => `<div style="height:6px;border-radius:3px;background:#E5E7EB;margin-top:4px"><div style="height:100%;border-radius:3px;background:${pct>90?'#DC2626':pct>70?'#D97706':'#16A34A'};width:${Math.min(pct,100)}%"></div></div>`

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Unplanned Escapes — Status</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,sans-serif;background:#F8F7F4;color:#1C1C1A;margin:0;padding:24px}
h1{font-size:22px;font-weight:700;margin:0 0 4px}
.sub{color:#6B7280;font-size:13px;margin:0 0 24px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:24px}
.card{background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:16px}
.card-title{font-weight:700;font-size:14px;margin:0 0 4px;display:flex;align-items:center}
.card-cost{font-size:11px;color:#16A34A;font-weight:600;margin-bottom:8px}
.stat{display:flex;justify-content:space-between;font-size:12px;color:#6B7280;margin-top:6px}
.stat b{color:#1C1C1A}
.overall{display:inline-flex;align-items:center;padding:6px 14px;border-radius:20px;font-weight:700;font-size:14px;margin-bottom:20px}
.row-table{width:100%;border-collapse:collapse;font-size:12px}
.row-table th{text-align:left;color:#6B7280;font-weight:600;padding:6px 8px;border-bottom:1px solid #E5E7EB}
.row-table td{padding:6px 8px;border-bottom:1px solid #F3F4F6}
h2{font-size:15px;font-weight:700;margin:0 0 10px}
</style></head><body>
<h1>Unplanned Escapes — Status</h1>
<p class="sub">Generated ${new Date(report.generated_at).toLocaleString('en-AU',{timeZone:'Australia/Melbourne'})} AEST</p>

<div class="overall" style="background:${overall==='ok'?'#F0FDF4':overall==='warn'?'#FFF7ED':'#FEF2F2'};color:${statusColor(overall)}">
  ${statusDot(overall)} Overall: ${overall.toUpperCase()}
</div>

<div class="grid">
  <div class="card">
    <div class="card-title">${statusDot(s.overpass.status)} Overpass API (OpenStreetMap)</div>
    <div class="card-cost">${s.overpass.cost}</div>
    <div class="stat">Calls today <b>${s.overpass.calls_today} / ${s.overpass.daily_limit}</b></div>
    ${bar(s.overpass.used_pct)}
    <div class="stat" style="margin-top:8px">Remaining <b>${s.overpass.daily_remaining}</b></div>
  </div>
  <div class="card">
    <div class="card-title">${statusDot(s.wikipedia.status)} Wikipedia API</div>
    <div class="card-cost">${s.wikipedia.cost}</div>
    <div class="stat">Calls today <b>${s.wikipedia.calls_today}</b></div>
    <div class="stat">Rate limit <b>${s.wikipedia.rate_limit}</b></div>
  </div>
  <div class="card">
    <div class="card-title">${statusDot(s.supabase.status)} Supabase Database</div>
    <div class="card-cost">${s.supabase.cost}</div>
    <div class="stat">DB size <b>${s.supabase.estimated_db_mb} MB / ${s.supabase.db_limit_mb} MB</b></div>
    ${bar(s.supabase.db_used_pct)}
    <div style="margin-top:10px;font-size:11px;color:#6B7280">
      ${Object.entries(s.supabase.row_counts).map(([k,v])=>`${k}: <b>${v}</b>`).join(' · ')}
    </div>
  </div>
  <div class="card">
    <div class="card-title">${statusDot(s.vercel.status)} Vercel Hobby</div>
    <div class="card-cost">${s.vercel.cost}</div>
    <div class="stat">Invocations/mo <b>${s.vercel.estimated_invocations_this_month.toLocaleString()} / ${s.vercel.monthly_limit.toLocaleString()}</b></div>
    ${bar(s.vercel.used_pct)}
    <div class="stat" style="margin-top:8px">Projected <b>${s.vercel.projected_monthly.toLocaleString()}</b></div>
  </div>
</div>

<h2>Recent Cron Runs</h2>
${report.recent_cron_runs?.length ? `
<table class="row-table">
  <tr><th>Job</th><th>Time (AEST)</th><th>Status</th><th>Records</th><th>Message</th></tr>
  ${(report.recent_cron_runs as any[]).map(r=>`<tr>
    <td>${r.job}</td>
    <td>${new Date(r.ran_at).toLocaleString('en-AU',{timeZone:'Australia/Melbourne'})}</td>
    <td style="color:${r.status==='ok'?'#16A34A':'#DC2626'};font-weight:600">${r.status}</td>
    <td>${r.records??0}</td>
    <td style="color:#6B7280">${(r.message||'').slice(0,80)}</td>
  </tr>`).join('')}
</table>` : '<p style="color:#6B7280;font-size:13px">No cron runs logged yet — first run at 11am AEST.</p>'}
</body></html>`

  res.setHeader('Content-Type', 'text/html')
  return res.status(200).send(html)
}
