import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from '../_lib/supabase.js'
import { sendCronEmail, emailWrapper, statusRow } from '../_lib/email.js'

// Weekly free-tier usage monitor — runs every Monday 9am AEST (Sunday 23:00 UTC)
// Alerts via email if any service is approaching its free tier limit (>80%).
// Cuts off the enrich cron if Overpass daily usage is >90%.

const LIMITS = {
  supabase_db_mb:    500,   // Supabase free: 500MB database
  supabase_rows:     50_000, // rough row-count proxy for activity
  resend_month:      3_000, // Resend free: 3,000 emails/month
  resend_day:        100,   // Resend free: 100 emails/day
  overpass_day:      9_000, // Overpass soft daily limit
}

const WARN_PCT = 80   // warn at 80%
const CRITICAL_PCT = 90  // critical at 90%

function pct(used: number, limit: number) { return Math.round((used / limit) * 100) }
function status(used: number, limit: number) {
  const p = pct(used, limit)
  if (p >= CRITICAL_PCT) return 'critical'
  if (p >= WARN_PCT) return 'warn'
  return 'ok'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end()

  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!adminSupabase) return res.status(500).json({ error: 'Supabase not configured' })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // 1. Supabase — total row count across content tables as DB activity proxy
  const [actRes, foodRes, natureRes, accomRes, fuelRes] = await Promise.all([
    adminSupabase.from('activities').select('*', { count: 'exact', head: true }),
    adminSupabase.from('food_places').select('*', { count: 'exact', head: true }),
    adminSupabase.from('nature_spots').select('*', { count: 'exact', head: true }),
    adminSupabase.from('accommodation').select('*', { count: 'exact', head: true }),
    adminSupabase.from('fuel_prices').select('*', { count: 'exact', head: true }),
  ])
  const totalRows = (actRes.count ?? 0) + (foodRes.count ?? 0) + (natureRes.count ?? 0) +
                   (accomRes.count ?? 0) + (fuelRes.count ?? 0)

  // 2. Resend — count emails logged this month and today via cron_log runs
  //    Each completed cron run (enrich=done, fuel, summaries) sends 1 email
  const { count: emailsMonth } = await adminSupabase
    .from('cron_log')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ok')
    .gte('run_at', monthStart)

  const { count: emailsToday } = await adminSupabase
    .from('cron_log')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ok')
    .gte('run_at', dayStart)

  // 3. Overpass — max calls recorded in today's enrich runs
  const { data: todayRuns } = await adminSupabase
    .from('cron_log')
    .select('message')
    .eq('job_name', 'enrich-places')
    .gte('run_at', dayStart)
    .order('run_at', { ascending: false })
    .limit(20)

  // Extract max overpass calls from log messages (logged as "overpass:N")
  let overpassToday = 0
  for (const run of todayRuns ?? []) {
    const match = run.message?.match(/overpass[:\s]+(\d+)/i)
    if (match) overpassToday = Math.max(overpassToday, parseInt(match[1]))
  }

  // 4. Build checks
  const checks = [
    { label: 'Supabase rows',        used: totalRows,        limit: LIMITS.supabase_rows,  unit: 'rows' },
    { label: 'Resend emails / month', used: emailsMonth ?? 0, limit: LIMITS.resend_month,   unit: 'emails' },
    { label: 'Resend emails / day',   used: emailsToday ?? 0, limit: LIMITS.resend_day,     unit: 'emails' },
    { label: 'Overpass calls / day',  used: overpassToday,    limit: LIMITS.overpass_day,   unit: 'calls' },
  ]

  const hasWarning  = checks.some(c => status(c.used, c.limit) !== 'ok')
  const hasCritical = checks.some(c => status(c.used, c.limit) === 'critical')

  // 5. If Overpass >90%, flag it in enrich cron by setting a DB flag
  //    (enrich cron checks this before running)
  if (overpassToday >= LIMITS.overpass_day * 0.9) {
    await adminSupabase
      .from('cron_status')
      .update({ last_error_message: 'LIMITS_CUTOFF: Overpass >90% daily limit' })
      .eq('job_name', 'enrich-places')
  }

  // 6. Email — always send weekly summary, highlight warnings
  const icon = hasCritical ? '🚨' : hasWarning ? '⚠️' : '✅'
  const rows = checks.map(c => {
    const s = status(c.used, c.limit)
    const label = `${c.label} (limit: ${c.limit.toLocaleString()} ${c.unit})`
    const value = `${c.used.toLocaleString()} ${c.unit} — ${pct(c.used, c.limit)}%`
    return statusRow(label, value, s === 'ok')
  }).join('')

  await sendCronEmail(
    `${icon} Free tier check — ${hasCritical ? 'ACTION NEEDED' : hasWarning ? 'warnings' : 'all clear'}`,
    emailWrapper(`Free tier usage · ${now.toLocaleDateString('en-AU', { timeZone: 'Australia/Melbourne', weekday: 'short', day: 'numeric', month: 'short' })} AEST`, `
      <p style="font-size:13px;color:#6B7280;margin-bottom:16px">
        Weekly check of all free tier limits. Alert threshold: ${WARN_PCT}% warn, ${CRITICAL_PCT}% critical.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${rows}</table>
      ${hasCritical ? `<p style="font-size:13px;color:#DC2626;font-weight:600">⚠️ One or more services are near their limit. Review immediately to avoid overages.</p>` : ''}
      <p style="font-size:11px;color:#9CA3AF;margin-top:16px">
        Supabase: 500MB DB / Resend: 3,000 emails/month, 100/day / Overpass: 9,000 calls/day / Vercel: 100GB bandwidth, 1M invocations/month (check dashboard manually)
      </p>
    `)
  )

  return res.status(200).json({
    ok: true,
    hasWarning,
    hasCritical,
    checks: checks.map(c => ({ ...c, pct: pct(c.used, c.limit), status: status(c.used, c.limit) })),
  })
}
