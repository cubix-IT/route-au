/**
 * Scan content tables for junk/vandalism names and descriptions
 * (OSM noise like "I love you", 9/11 references, test data, placeholders).
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/quality-scan.mts
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}
const db = createClient(url, key)

const SUSPICIOUS = [
  '%i love%', '%love you%', '%9/11%', '%9 11%', '%911%', '%twin tower%',
  '%test%', '%asdf%', '%qwerty%', '%todo%', '%fixme%', '%placeholder%',
  '%unnamed%', '%unknown%', '%xxx%', '%lol%', '%haha%', '%memorial 9%',
  '%my house%', '%my home%', '%dont go%', "%don't go%", '%avoid%',
  '%closed down%', '%demolished%', '%no longer%',
]

const TABLES = ['activities', 'food_places', 'nature_spots', 'accommodation']

for (const table of TABLES) {
  console.log(`\n=== ${table} ===`)
  let total = 0
  for (const pat of SUSPICIOUS) {
    const { data, error } = await db
      .from(table)
      .select('slug, name, description, sub_dest_id')
      .ilike('name', pat)
      .limit(20)
    if (error) { console.error(`  [name ${pat}] ${error.message}`); continue }
    for (const row of data ?? []) {
      total++
      console.log(`  NAME[${pat}] dest=${row.sub_dest_id} | ${row.name} | ${(row.description ?? '').slice(0, 80)}`)
    }
    const { data: d2, error: e2 } = await db
      .from(table)
      .select('slug, name, description, sub_dest_id')
      .ilike('description', pat)
      .limit(20)
    if (e2) { console.error(`  [desc ${pat}] ${e2.message}`); continue }
    for (const row of d2 ?? []) {
      total++
      console.log(`  DESC[${pat}] dest=${row.sub_dest_id} | ${row.name} | ${(row.description ?? '').slice(0, 100)}`)
    }
  }
  if (total === 0) console.log('  (clean)')
}
