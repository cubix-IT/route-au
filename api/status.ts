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

export default async function handler(_req: VercelRequest, res: VercelResponse) {
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

  return res.status(200).json(report)
}
