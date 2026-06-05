import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from '../_lib/supabase.js'
import { loadTrails } from '../../scripts/load-trails.js'

// Called weekly Sunday 2am AEST (vercel.json: "0 16 * * 0")
// - Every week: refreshes Wikipedia + Claude AI summaries (10 destinations/run)
// - 1st of month: also refreshes Great Trails Victoria data from data.vic.gov.au
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!adminSupabase) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const runAt = new Date().toISOString()
  const BATCH_LIMIT = 10
  let processed = 0
  let errors = 0

  // Monthly: refresh Great Trails Victoria KML data on the 1st of each month
  const isFirstOfMonth = new Date().getDate() === 1
  if (isFirstOfMonth) {
    console.log('[summaries] 1st of month — refreshing Great Trails Victoria data')
    await loadTrails(false)
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: allDests, error: destErr } = await adminSupabase
      .from('sub_destinations')
      .select('sub_dest_id, slug, name')
      .limit(200)
    if (destErr) throw destErr

    const { data: freshSummaries, error: sumErr } = await adminSupabase
      .from('destination_summaries')
      .select('sub_dest_id, updated_at')
      .gt('updated_at', sevenDaysAgo)
    if (sumErr) throw sumErr

    const freshIds = new Set((freshSummaries ?? []).map((s) => s.sub_dest_id))
    const toProcess = (allDests ?? [])
      .filter((d) => !freshIds.has(d.sub_dest_id))
      .slice(0, BATCH_LIMIT)

    for (const dest of toProcess) {
      try {
        await refreshSummary(apiKey, dest.sub_dest_id, dest.name)
        processed++
      } catch (e) {
        console.error(`[summaries] failed for ${dest.name}:`, e)
        errors++
      }
    }

    const status = errors > 0 && processed === 0 ? 'error' : errors > 0 ? 'partial' : 'ok'

    await adminSupabase.from('cron_log').insert({
      job_name: 'enrich-summaries',
      run_at: runAt,
      completed_at: new Date().toISOString(),
      status,
      message: `${processed} summaries refreshed, ${errors} errors`,
      records_upserted: processed,
      destinations_processed: processed,
      duration_ms: Date.now() - new Date(runAt).getTime(),
    })

    await adminSupabase.from('cron_status').upsert({
      job_name: 'enrich-summaries',
      last_run_at: runAt,
      ...(status !== 'error' ? { last_success_at: new Date().toISOString() } : {}),
      ...(status === 'error' ? { last_error_at: new Date().toISOString() } : {}),
      total_records_upserted: processed,
    }, { onConflict: 'job_name' })

    return res.status(200).json({ ok: true, processed, errors })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/summaries]', msg)

    await adminSupabase.from('cron_log').insert({
      job_name: 'enrich-summaries',
      run_at: runAt,
      completed_at: new Date().toISOString(),
      status: 'error',
      message: msg,
      records_upserted: 0,
      destinations_processed: 0,
      duration_ms: Date.now() - new Date(runAt).getTime(),
    }).then(() => {}, () => {})

    await adminSupabase.from('cron_status').upsert({
      job_name: 'enrich-summaries',
      last_run_at: runAt,
      last_error_at: new Date().toISOString(),
      last_error_message: msg,
    }, { onConflict: 'job_name' }).then(() => {}, () => {})

    return res.status(500).json({ error: msg })
  }
}

async function refreshSummary(apiKey: string, subDestId: number, name: string): Promise<void> {
  if (!adminSupabase) return

  // 1. Fetch Wikipedia summary
  let wikiText = ''
  try {
    const wikiResp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}+Victoria+Australia`,
      { signal: AbortSignal.timeout(8_000) },
    )
    if (wikiResp.ok) {
      const wikiData = await wikiResp.json() as { extract?: string }
      wikiText = wikiData.extract ?? ''
    }
  } catch {
    // continue without Wikipedia
  }

  // 2. Generate AI summary via Claude Haiku (same fetch pattern as destination-summary.ts)
  let aiSummary = wikiText
  let bestFor: string[] = []

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 250,
        temperature: 0.4,
        system: [
          {
            type: 'text',
            text: 'You are a concise travel writer for Victoria, Australia. ' +
              'Write a 2-sentence engaging travel description of the destination. ' +
              'Then list who this destination suits best. ' +
              'Respond with valid JSON only, no markdown: ' +
              '{"summary":"2-sentence description here","bestFor":["pick 3-4 from: ' +
              'Couples, Families, Solo travellers, Nature lovers, Foodies, Wine lovers, ' +
              'Hikers, History buffs, Beach lovers, Adventure seekers"]}',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{
          role: 'user',
          content: `Destination: ${name}, Victoria, Australia.\n\n${wikiText ? `Context: ${wikiText.slice(0, 400)}` : ''}`,
        }],
      }),
      signal: AbortSignal.timeout(12_000),
    })

    if (r.ok) {
      const json = await r.json() as { content?: { type: string; text: string }[] }
      const text = json.content?.[0]?.text ?? ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0]) as { summary?: string; bestFor?: string[] }
        aiSummary = parsed.summary ?? wikiText
        bestFor = parsed.bestFor ?? []
      }
    }
  } catch {
    // fall back to wiki text
  }

  // 3. Upsert to destination_summaries
  await adminSupabase.from('destination_summaries').upsert({
    sub_dest_id: subDestId,
    wiki_text: wikiText,
    ai_summary: aiSummary,
    best_for: bestFor,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'sub_dest_id' })
}
