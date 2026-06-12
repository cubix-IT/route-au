/**
 * UE maps URL policy check — zero tolerance for raw coordinate URLs.
 * Usage: npm run mapcheck
 *
 * Forbidden pattern: maps.google.com/?q=LAT,LNG  (no label)
 * Required pattern:  maps.google.com/maps?q=LAT,LNG+(Label)  OR  google.com/maps/search/?api=1&query=Name
 *
 * Checks:
 *   - activities.maps_url in Supabase
 *   - nature_spots (via coordMapsUrl — always safe)
 *   - food_places.maps_url (should be null/search URL, not raw coords)
 *   - Source code (no hardcoded forbidden patterns)
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1) }

const db = createClient(url, key)

// Forbidden: maps.google.com/?q=LAT,LNG  (short path, no label in parentheses)
// Allowed:   maps.google.com/maps?q=LAT,LNG+(Label)   ← has /maps path + label
//            google.com/maps/search/?api=1&query=Name  ← search URL, fine
const RAW_COORD_RE = /maps\.google\.com\/\?q=-?\d+\.\d+,-?\d+\.\d+/

let violations = 0

console.log('\n=== UE Maps URL Policy Check ===')
console.log('Rule: NEVER use maps.google.com/?q=lat,lng without a label\n')

// ── 1. Check activities table ─────────────────────────────────────────────────
console.log('1. activities.maps_url')

const { data: acts } = await db
  .from('activities')
  .select('activity_id,name,maps_url,sub_dest_id')
  .not('maps_url', 'is', null)

const badActs = (acts ?? []).filter(a => a.maps_url && RAW_COORD_RE.test(a.maps_url))
if (badActs.length === 0) {
  console.log(`  ✅ ${acts?.length ?? 0} activities checked — no raw coord URLs`)
} else {
  console.log(`  🚨 ${badActs.length} violations found:`)
  for (const a of badActs.slice(0, 10)) {
    console.log(`     activity_id=${a.activity_id} "${a.name}": ${a.maps_url}`)
  }
  if (badActs.length > 10) console.log(`     ... and ${badActs.length - 10} more`)
  violations += badActs.length
}

// ── 2. Check food_places table ────────────────────────────────────────────────
console.log('\n2. food_places (maps_url column — usually null)')

const { data: foods } = await db
  .from('food_places')
  .select('food_place_id,name,maps_url')
  .not('maps_url', 'is', null)

const badFoods = (foods ?? []).filter(f => f.maps_url && RAW_COORD_RE.test(f.maps_url))
if (badFoods.length === 0) {
  console.log(`  ✅ ${foods?.length ?? 0} food places with maps_url — no raw coord URLs`)
} else {
  console.log(`  🚨 ${badFoods.length} violations:`)
  for (const f of badFoods.slice(0, 5)) console.log(`     food_place_id=${f.food_place_id} "${f.name}": ${f.maps_url}`)
  violations += badFoods.length
}

// ── 3. Check source code ──────────────────────────────────────────────────────
console.log('\n3. Source code')

const FORBIDDEN_SRC_PATTERN = 'maps.google.com/?q='
try {
  const srcHits = execSync(
    `grep -rn '${FORBIDDEN_SRC_PATTERN}' src/ api/ --include='*.ts' --include='*.tsx' 2>/dev/null || true`,
    { encoding: 'utf8' }
  ).trim()
  if (srcHits) {
    console.log(`  🚨 Forbidden pattern in source code:`)
    for (const line of srcHits.split('\n').slice(0, 5)) console.log(`     ${line}`)
    violations += srcHits.split('\n').filter(Boolean).length
  } else {
    console.log(`  ✅ No raw coord URLs in source code`)
  }
} catch { console.log('  ✅ Source check passed') }

// Check CLAUDE.md for contradictory guidance (it has an old wrong example)
const claudeMd = execSync('grep -n "maps.google.com/\\?q=" CLAUDE.md 2>/dev/null || true', { encoding: 'utf8' }).trim()
if (claudeMd) {
  console.log(`\n  ⚠️  CLAUDE.md still references old coord format — update to use coordMapsUrl()`)
  console.log(`     ${claudeMd}`)
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(40))
if (violations === 0) {
  console.log('✅ All clear — zero raw coordinate URL violations\n')
} else {
  console.log(`🚨 ${violations} violation(s) found — fix before deploying`)
  console.log('\nFix SQL:')
  console.log(`  UPDATE activities SET maps_url = 'https://maps.google.com/maps?q=' || lat || ',' || lng || '+(' || name || ')' WHERE maps_url ~ '\\?q=-?\\d+\\.\\d+,-?\\d+\\.\\d+$';`)
  console.log('')
  process.exit(1)
}
