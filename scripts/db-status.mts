/**
 * UE database health snapshot — run at the start of any session.
 * Usage:  npm run db:status
 *
 * Reports:
 *   - Row counts for all key tables
 *   - Null-summary destinations (need AI summary cron)
 *   - Null-description activities / food_places / nature_spots
 *   - Last enrich run timestamp and outcome
 *   - Food place breakdown by category
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const db = createClient(url, key)

async function count(table: string, filter?: (q: ReturnType<typeof db.from>) => any): Promise<number> {
  const base = db.from(table).select('*', { count: 'exact', head: true })
  const q = filter ? filter(base) : base
  const { count: n, error } = await q
  if (error) {
    console.warn(`  ⚠ count(${table}): ${error.message || JSON.stringify(error)}`)
    return -1
  }
  return n ?? 0
}

async function breakdown(table: string, col: string): Promise<Record<string, number>> {
  const { data, error } = await db.from(table).select(col)
  if (error) throw new Error(`${table}: ${error.message}`)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const val = String(row[col] ?? 'null')
    counts[val] = (counts[val] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]))
}

console.log('=== UE Database Status ===\n')

// Table counts
const tables = [
  'sub_destinations',
  'destination_summaries',
  'activities',
  'food_places',
  'nature_spots',
  'accommodation',
  'trails',
  'fuel_stations',
  'fuel_prices',
  'deploy_log',
]

const counts = await Promise.all(tables.map(t => count(t).then(n => [t, n] as [string, number])))
console.log('Table counts:')
for (const [t, n] of counts) {
  console.log(`  ${t.padEnd(22)} ${n.toLocaleString()}`)
}

// Missing summaries (destination_summaries is a separate table)
const totalDests = counts.find(([t]) => t === 'sub_destinations')?.[1] ?? 0
const summaryCount = counts.find(([t]) => t === 'destination_summaries')?.[1] ?? 0
console.log(`\nDestination summaries: ${summaryCount}/${totalDests} filled (${totalDests - summaryCount} missing)`)

// Null descriptions
const nullActivities = await count('activities', q => q.is('description', null))
const nullFood = await count('food_places', q => q.is('description', null))
const nullNature = await count('nature_spots', q => q.is('description', null))
console.log(`\nNull descriptions:`)
console.log(`  activities:    ${nullActivities}`)
console.log(`  food_places:   ${nullFood}`)
console.log(`  nature_spots:  ${nullNature}`)

// Food breakdown
const foodCats = await breakdown('food_places', 'category')
console.log(`\nFood by category:`)
for (const [cat, n] of Object.entries(foodCats)) {
  console.log(`  ${cat.padEnd(16)} ${n}`)
}

// Last enrich run
const enrichLog = 'logs/enrich-runs.jsonl'
if (existsSync(enrichLog)) {
  const lines = readFileSync(enrichLog, 'utf8').trim().split('\n').filter(Boolean)
  if (lines.length > 0) {
    const last = JSON.parse(lines[lines.length - 1])
    const ts = last.run_at ?? last.timestamp
    const ago = Math.round((Date.now() - new Date(ts).getTime()) / 3600000)
    console.log(`\nLast enrich run: ${ts} (${ago}h ago)`)
    console.log(`  destinations: ${last.destinations ?? '?'} · upserted: ${last.upserted ?? last.records ?? '?'} · mode: ${last.mode ?? '?'}`)
  }
} else {
  console.log('\nNo enrich log found (logs/enrich-runs.jsonl)')
}

// Last deploy
const { data: deploys } = await db.from('deploy_log').select('deployed_at, commit_sha, notes').order('deployed_at', { ascending: false }).limit(1)
if (deploys?.[0]) {
  const d = deploys[0]
  const ago = Math.round((Date.now() - new Date(d.deployed_at).getTime()) / 3600000)
  console.log(`\nLast deploy: ${d.deployed_at} (${ago}h ago) — ${d.commit_sha?.slice(0, 7) ?? '?'}`)
}

console.log('\n=== Done ===')
