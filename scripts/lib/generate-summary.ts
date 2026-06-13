/**
 * Shared destination-summary generator.
 *
 * Used by:
 *   - api/cron/summaries.ts      (weekly Sunday refresh, 10/run)
 *   - scripts/fill-summaries.ts  (local backfill, no batch/timeout limits)
 *
 * Keeping the prompt + write logic in one place means cron-generated and
 * backfilled summaries are byte-for-byte identical in style.
 *
 * The Anthropic Haiku call is the ONE approved paid service (~$0.003/dest,
 * Raj's prepaid account). No other paid APIs — see CLAUDE.md.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// Unified system prompt — merges the two prompts that previously lived in
// api/cron/summaries.ts (no-disaster guard) and api/destination-summary.ts
// (evocative + no census/stats). Marked ephemeral so Anthropic caches it.
const SUMMARY_SYSTEM_PROMPT =
  'You are an elite, vibe-driven travel copywriter for Victoria, Australia, ' +
  'writing for people planning a relaxing weekend getaway. ' +
  'Using the provided text solely for geographic context, write an evocative, ' +
  'sensory-rich 2-sentence description of the destination focused on what ' +
  'visitors can see, do and enjoy today. ' +
  'STRICT RULES: ' +
  'Never mention bushfires, floods, disasters, death tolls, tragedies or crime — ' +
  'even if the context does; if the context is mostly about a disaster, ignore it ' +
  'and write about the natural beauty and visitor experience instead. ' +
  'You are also strictly forbidden from mentioning census data, population ' +
  'statistics, square kilometres, elevation metrics, or historical establishment dates. ' +
  'Never mention religion, politics, or any controversial topic. ' +
  'Focus entirely on atmospheric charm, landscape features, local culinary notes, ' +
  'and the emotional feeling of escaping to this specific place. ' +
  'Then list who this destination suits best. ' +
  'Respond exclusively in valid JSON format, no markdown: ' +
  '{"summary":"2-sentence sensory description here","bestFor":["pick 3-4 from: ' +
  'Couples, Families, Solo travellers, Nature lovers, Foodies, Wine lovers, ' +
  'Hikers, History buffs, Beach lovers, Adventure seekers"]}'

export interface SummaryResult {
  wikiText: string
  aiSummary: string
  bestFor: string[]
}

/**
 * Fetch Wikipedia context + generate an AI summary, then upsert it into
 * destination_summaries. Returns what was written (handy for logging/QA).
 */
export async function refreshSummary(
  db: SupabaseClient,
  apiKey: string,
  subDestId: number,
  name: string,
): Promise<SummaryResult> {
  // 1. Wikipedia context (best-effort — proceed without it on failure)
  let wikiText = ''
  try {
    const wikiResp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}+Victoria+Australia`,
      { signal: AbortSignal.timeout(8_000) },
    )
    if (wikiResp.ok) {
      const wikiData = (await wikiResp.json()) as { extract?: string }
      wikiText = wikiData.extract ?? ''
    }
  } catch {
    // continue without Wikipedia
  }

  // 2. Claude Haiku summary (falls back to wiki text on any failure)
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
            text: SUMMARY_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Destination: ${name}, Victoria, Australia.\n\n${wikiText ? `Context: ${wikiText.slice(0, 400)}` : ''}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    })

    if (r.ok) {
      const json = (await r.json()) as { content?: { type: string; text: string }[] }
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

  // 3. Upsert
  await db.from('destination_summaries').upsert(
    {
      sub_dest_id: subDestId,
      wiki_text: wikiText,
      ai_summary: aiSummary,
      best_for: bestFor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sub_dest_id' },
  )

  return { wikiText, aiSummary, bestFor }
}
