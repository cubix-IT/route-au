/**
 * Query a UE table via Supabase JS client.
 * Usage:  npm run db -- <table> [filter] [limit]
 *
 * Examples:
 *   npm run db -- sub_destinations "summary=is.null" 10
 *   npm run db -- activities "category=eq.history" 5
 *   npm run db -- food_places "description=is.null" 20
 *
 * Filter format is PostgREST: column=operator.value
 *   is.null  eq.value  ilike.*pattern*  gt.0
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const [table, filterArg, limitArg] = process.argv.slice(2)
if (!table) {
  console.error('Usage: npm run db -- <table> [filter] [limit]')
  console.error('Tables: sub_destinations, activities, food_places, nature_spots, accommodation, trails, fuel_stations')
  process.exit(1)
}

const db = createClient(url, key)
const limit = limitArg ? parseInt(limitArg) : 20

let query = db.from(table).select('*').limit(limit)

if (filterArg) {
  const [col, opVal] = filterArg.split('=')
  const [op, val] = opVal.split('.')
  if (op === 'is' && val === 'null') {
    query = query.is(col, null) as typeof query
  } else if (op === 'eq') {
    query = query.eq(col, val) as typeof query
  } else if (op === 'ilike') {
    query = query.ilike(col, val) as typeof query
  } else if (op === 'gt') {
    query = query.gt(col, val) as typeof query
  }
}

const { data, error, count } = await query

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log(JSON.stringify(data, null, 2))
console.log(`\n— ${data?.length ?? 0} rows returned (limit ${limit})`)
