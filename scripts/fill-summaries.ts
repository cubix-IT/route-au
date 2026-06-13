/**
 * Local backfill for destination_summaries.ai_summary.
 *
 * The weekly cron (api/cron/summaries.ts) only does 10/run under a 60s ceiling,
 * so it's unfit for filling the ~111 destinations that have no summary. This
 * runs locally to completion with no batch cap and no serverless timeout, using
 * the SAME generator (scripts/lib/generate-summary.ts) the cron uses.
 *
 * Run:  npm run summaries:fill                  # fill all missing/short summaries
 *       npm run summaries:fill -- --force       # regenerate ALL 130 (uniform prompt)
 *       npm run summaries:fill -- --slug bright-town
 *       npm run summaries:fill -- --limit 3     # smoke test
 *
 * Cost: ~$0.003/destination on Raj's prepaid Anthropic account (Haiku) — the one
 * approved paid service. No other paid APIs (CLAUDE.md).
 */
import { createClient } from '@supabase/supabase-js'
import { refreshSummary } from './lib/generate-summary.js'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''
const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}
if (!anthropicKey) {
  console.error('Missing ANTHROPIC_API_KEY')
  process.exit(1)
}
const db = createClient(supabaseUrl, supabaseKey)

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null
const limitArg = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : null

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  // All destinations
  let destQuery = db.from('sub_destinations').select('sub_dest_id, slug, name').limit(500)
  if (slugArg) destQuery = destQuery.eq('slug', slugArg)
  const { data: dests, error: destErr } = await destQuery
  if (destErr) throw destErr
  if (!dests || dests.length === 0) {
    console.error(slugArg ? `No destination with slug "${slugArg}"` : 'No destinations found')
    process.exit(1)
  }

  // Existing good summaries (skip unless --force)
  const goodIds = new Set<number>()
  if (!FORCE) {
    const { data: existing, error: exErr } = await db
      .from('destination_summaries')
      .select('sub_dest_id, ai_summary')
    if (exErr) throw exErr
    for (const s of existing ?? []) {
      if (s.ai_summary && s.ai_summary.trim().length > 50) goodIds.add(s.sub_dest_id)
    }
  }

  let toProcess = dests.filter((d) => FORCE || !goodIds.has(d.sub_dest_id))
  if (limitArg && limitArg > 0) toProcess = toProcess.slice(0, limitArg)

  console.log(
    `${dests.length} destinations · ${goodIds.size} already good · ` +
      `${toProcess.length} to ${FORCE ? 'regenerate' : 'fill'}` +
      (limitArg ? ` (limited to ${limitArg})` : ''),
  )
  if (toProcess.length === 0) {
    console.log('Nothing to do — all summaries present.')
    return
  }

  let processed = 0
  let errors = 0
  for (const dest of toProcess) {
    try {
      const { aiSummary, bestFor } = await refreshSummary(db, anthropicKey, dest.sub_dest_id, dest.name)
      processed++
      const preview = aiSummary.replace(/\s+/g, ' ').slice(0, 80)
      console.log(`  ✓ ${dest.name.padEnd(28)} [${(bestFor ?? []).join(', ')}] ${preview}…`)
    } catch (e) {
      errors++
      console.error(`  ✗ ${dest.name}:`, e instanceof Error ? e.message : e)
    }
    await sleep(300) // be polite to Anthropic + Wikipedia
  }

  console.log(`\nDone: ${processed} written, ${errors} errors.`)

  // Final coverage report
  const { count: total } = await db
    .from('sub_destinations')
    .select('*', { count: 'exact', head: true })
  const { data: all } = await db.from('destination_summaries').select('ai_summary')
  const filled = (all ?? []).filter((s) => s.ai_summary && s.ai_summary.trim().length > 50).length
  console.log(`Coverage: ${filled}/${total ?? '?'} destinations have a summary.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
