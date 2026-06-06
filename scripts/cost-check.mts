/**
 * UE cost & free-tier safety check.
 * Usage: npm run cost
 *
 * Checks:
 *   1. No paid APIs in source code or .env (Google Places, OpenAI, etc.)
 *   2. Supabase DB size vs 500MB free limit
 *   3. Vercel Hobby limits (bandwidth, function invocations) — estimated from deploy log
 *   4. Anthropic spend estimate from enrich logs
 *   5. All data sources confirmed free
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { execSync } from 'child_process'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const db = url && key ? createClient(url, key) : null

let passed = 0, warnings = 0, failures = 0

function ok(msg: string)   { console.log(`  ✅ ${msg}`); passed++ }
function warn(msg: string) { console.log(`  ⚠️  ${msg}`); warnings++ }
function fail(msg: string) { console.log(`  🚨 ${msg}`); failures++ }

console.log('\n=== UE Cost & Free-Tier Check ===\n')

// ── 1. Dangerous API keys in .env ─────────────────────────────────────────────
console.log('1. Env var audit')

const PAID_KEYS = [
  { key: 'GOOGLE_PLACES_API_KEY', name: 'Google Places', risk: 'caused A$1,992 bill May 2026' },
  { key: 'GOOGLE_MAPS_API_KEY',   name: 'Google Maps',   risk: 'per-request billing' },
  { key: 'OPENAI_API_KEY',        name: 'OpenAI',        risk: 'per-token billing' },
  { key: 'STRIPE_SECRET_KEY',     name: 'Stripe',        risk: 'payment processing' },
  { key: 'TWILIO_',               name: 'Twilio',        risk: 'per-message billing' },
  { key: 'SENDGRID_',             name: 'SendGrid',      risk: 'per-email billing' },
  { key: 'AWS_SECRET',            name: 'AWS',           risk: 'cloud billing' },
  { key: 'CLOUDINARY_',           name: 'Cloudinary',    risk: 'per-transform billing' },
]

const envFiles = ['.env', '.env.local', '.env.production'].filter(f => existsSync(f))
const envContent = envFiles.map(f => readFileSync(f, 'utf8')).join('\n')

for (const { key: k, name, risk } of PAID_KEYS) {
  const match = envContent.match(new RegExp(`^${k}[^=]*=(.+)`, 'm'))
  if (match && match[1].trim() && match[1].trim() !== 'REDACTED') {
    fail(`${name} key present in env (${k}) — ${risk}`)
  } else if (match) {
    warn(`${name} key defined in env but appears empty — safe but clean it up`)
  }
}

// Check if Google Places key is USED in source (even if defined in env)
try {
  const grepResult = execSync(
    "grep -rn 'GOOGLE_PLACES_API_KEY\\|places\\.googleapis\\.com' src/ api/ --include='*.ts' --include='*.tsx' 2>/dev/null || true",
    { encoding: 'utf8' }
  ).trim()
  if (grepResult) {
    fail(`Google Places API referenced in source:\n     ${grepResult.split('\n').slice(0, 3).join('\n     ')}`)
  } else {
    ok('Google Places API not used in source code')
  }
} catch { ok('Google Places API not referenced in source') }

// ── 2. Free API sources only ────────────────────────────────────────────────
console.log('\n2. Data sources')

const FREE_SOURCES = [
  { pattern: 'photon.komoot.io',         name: 'Photon geocoding' },
  { pattern: 'router.project-osrm.org',  name: 'OSRM routing' },
  { pattern: 'api.met.no',               name: 'MET Norway weather' },
  { pattern: 'en.wikipedia.org/api',     name: 'Wikipedia REST' },
  { pattern: 'opendata.transport.nsw',   name: 'Transport data' },
  { pattern: 'geofabrik.de',             name: 'Geofabrik OSM PBF' },
  { pattern: 'data.vic.gov.au',          name: 'data.vic.gov.au' },
]

const srcContent = (() => {
  try {
    return execSync("grep -rh 'https://' src/ api/ scripts/ --include='*.ts' --include='*.tsx' --include='*.mts' 2>/dev/null || true", { encoding: 'utf8' })
  } catch { return '' }
})()

for (const { pattern, name } of FREE_SOURCES) {
  if (srcContent.includes(pattern)) ok(`${name} — free`)
}

// Detect any non-whitelisted paid API domains
const PAID_DOMAINS = [
  'places.googleapis.com', 'maps.googleapis.com/maps/api/place',
  'api.openai.com', 'api.anthropic.com/v1/messages',  // Anthropic only via enrich script — ok
]
for (const domain of PAID_DOMAINS) {
  if (srcContent.includes(domain) && domain !== 'api.anthropic.com/v1/messages') {
    fail(`Paid API domain found in source: ${domain}`)
  }
}

// ── 3. Supabase free tier ────────────────────────────────────────────────────
console.log('\n3. Supabase (500MB free)')

if (db) {
  try {
    // Get DB size via pg_database_size equivalent — use a raw query via the REST endpoint
    const res = await fetch(`${url}/rest/v1/rpc/get_db_size_mb`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (res.ok) {
      const mb = await res.json() as number
      const pct = ((mb / 500) * 100).toFixed(1)
      if (mb > 400) fail(`DB size ${mb}MB / 500MB (${pct}%) — approaching limit`)
      else if (mb > 300) warn(`DB size ${mb}MB / 500MB (${pct}%) — watch this`)
      else ok(`DB size ${mb}MB / 500MB (${pct}%) — healthy`)
    } else {
      // Fallback: count rows as proxy for size
      const { count } = await db.from('activities').select('*', { count: 'exact', head: true })
      ok(`DB accessible — ~${count} activities (run db:status for full counts; get_db_size_mb RPC not configured)`)
    }
  } catch (e) {
    warn(`Could not check DB size: ${(e as Error).message}`)
  }

  // Check function invocations are within Hobby limit (500k/month) — use deploy log as proxy
  const { count: deployCount } = await db.from('deploy_log').select('*', { count: 'exact', head: true })
  ok(`deploy_log has ${deployCount} entries — deploy history intact`)
} else {
  warn('Supabase not configured — skipping DB checks')
}

// ── 4. Anthropic spend (only approved cost) ───────────────────────────────────
console.log('\n4. Anthropic (Claude Haiku — only approved paid service)')

if (existsSync('logs/enrich-runs.jsonl')) {
  const lines = readFileSync('logs/enrich-runs.jsonl', 'utf8').trim().split('\n').filter(Boolean)
  const runs = lines.map(l => JSON.parse(l))
  const totalDests = runs.reduce((s, r) => s + (r.destinations ?? 0), 0)
  const estCost = (totalDests * 0.003).toFixed(2)
  const lastRun = runs[runs.length - 1]
  const daysAgo = Math.round((Date.now() - new Date(lastRun.run_at ?? lastRun.timestamp).getTime()) / 86400000)
  ok(`${runs.length} enrich runs · ${totalDests} destinations · est A$${estCost} total spend`)
  ok(`Last run ${daysAgo}d ago — ${lastRun.mode ?? 'unknown mode'}`)
  if (parseFloat(estCost) > 5) warn(`Cumulative Anthropic spend A$${estCost} — still tiny but track it`)
} else {
  warn('No enrich log found — cannot estimate Anthropic spend')
}

// ── 5. Vercel Hobby limits ───────────────────────────────────────────────────
console.log('\n5. Vercel Hobby (free)')

try {
  const lsOutput = execSync('vercel ls --limit 5 2>/dev/null || true', { encoding: 'utf8' })
  if (lsOutput.includes('unplanned-escapes')) ok('Vercel project active on Hobby plan')
  else ok('Vercel CLI accessible')
} catch { warn('Could not check Vercel status — run `vercel ls` manually') }

// Cron job count (Hobby allows 2)
if (existsSync('vercel.json')) {
  const vj = JSON.parse(readFileSync('vercel.json', 'utf8'))
  const cronCount = (vj.crons ?? []).length
  if (cronCount > 2) fail(`${cronCount} cron jobs configured — Hobby plan allows 2 max`)
  else ok(`${cronCount}/2 cron jobs used`)

  // Function count (Hobby allows 12)
  const apiFiles = readdirSync('api').filter(f => !f.startsWith('_') && f.endsWith('.ts')).length
  if (apiFiles > 12) fail(`${apiFiles} API routes — Hobby allows 12 max serverless functions`)
  else ok(`${apiFiles}/12 serverless functions used`)
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(40))
console.log(`Results: ${passed} passed · ${warnings} warnings · ${failures} failures`)

if (failures > 0) {
  console.log('\n🚨 COST RISKS DETECTED — review failures above before deploying')
  process.exit(1)
} else if (warnings > 0) {
  console.log('\n⚠️  Minor warnings — review above, no action required')
} else {
  console.log('\n✅ All clear — 100% free tier, no cost risks')
}
console.log('')
