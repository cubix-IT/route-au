/**
 * Remove junk POIs from the DB:
 *  - art-category activities that are individual artworks (no Wikipedia/Wikidata,
 *    name doesn't look like a gallery/venue) — sculpture-trail spam
 *  - defunct places ("No longer here", demolished, permanently closed)
 * Mirrors the filters added to scripts/enrich.ts so the DB matches what
 * future enrichment runs would produce.
 *
 * Usage:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/clean-junk.mts          # dry run
 *   npx tsx --env-file=.env --env-file=.env.local scripts/clean-junk.mts --apply  # delete
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1) }
const db = createClient(url, key)
const APPLY = process.argv.includes('--apply')

const GALLERY_VENUE = /galler(y|ies)|studios?\b|art\s?space|arts? (space|centre|center|precinct|hub|trail|inc)|centre for contemporary|museum|sculpture (garden|park)|art and sculpture|street art|laneway/i
// Genuine attractions that the name-heuristic can't identify
const KEEP_LIST = new Set([
  'Hosier Lane',          // Melbourne's famous street-art laneway
  'The Fairies Tree',     // carved tree, Fitzroy Gardens
  'Kaiela Arts',          // Aboriginal art gallery, Shepparton
])
// "demolished" deliberately excluded — heritage descriptions often mention partial
// demolition of buildings that still stand (e.g. Marion Terrace)
const DEFUNCT = /\b(no longer (here|exists?|open|operating)|permanently closed|closed permanently|closed down|burnt down|has been removed)\b/i

// 1. Artwork spam in activities
const { data: art, error: artErr } = await db
  .from('activities')
  .select('slug, name, description, sub_dest_id, attributes')
  .eq('category', 'art')
  .limit(1000)
if (artErr) { console.error(artErr.message); process.exit(1) }

const artJunk = (art ?? []).filter(a =>
  !a.attributes?.wikipedia && !a.attributes?.wikidata
  && !GALLERY_VENUE.test(a.name) && !KEEP_LIST.has(a.name)
)
console.log(`\n=== art junk (${artJunk.length} of ${art?.length ?? 0} art rows) ===`)
for (const a of artJunk) console.log(`  dest=${a.sub_dest_id} | ${a.name}`)

// 2. Defunct places across content tables
const defunctRows: { table: string, slug: string, name: string }[] = []
for (const table of ['activities', 'food_places', 'nature_spots', 'accommodation']) {
  const { data, error } = await db.from(table).select('slug, name, description').limit(10000)
  if (error) { console.error(`${table}: ${error.message}`); continue }
  for (const row of data ?? []) {
    if (DEFUNCT.test(row.description ?? '')) defunctRows.push({ table, slug: row.slug, name: row.name })
  }
}
console.log(`\n=== defunct (${defunctRows.length}) ===`)
for (const r of defunctRows) console.log(`  ${r.table} | ${r.name}`)

if (!APPLY) { console.log('\nDry run — re-run with --apply to delete.'); process.exit(0) }

let deleted = 0
for (const a of artJunk) {
  const { error } = await db.from('activities').delete().eq('slug', a.slug)
  if (error) console.error(`  delete ${a.slug}: ${error.message}`)
  else deleted++
}
for (const r of defunctRows) {
  const { error } = await db.from(r.table).delete().eq('slug', r.slug)
  if (error) console.error(`  delete ${r.table}/${r.slug}: ${error.message}`)
  else deleted++
}
console.log(`\nDeleted ${deleted} rows.`)
