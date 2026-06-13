import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

// Static system instructions — marked ephemeral so Anthropic caches them
// across repeated calls, cutting token spend on the fixed portion.
const SYSTEM_PROMPT =
  'You are an elite, vibe-driven travel copywriter for Victoria, Australia. ' +
  'Using the provided text solely for geographic context, write an evocative, ' +
  'sensory-rich 2-sentence description of the destination. ' +
  'CRITICAL RULES: You are strictly forbidden from mentioning census data, ' +
  'population statistics, square kilometers, elevation metrics, or historical ' +
  'establishment dates. Focus entirely on the atmospheric charm, landscape ' +
  'features, local culinary notes, and the emotional feeling of escaping to ' +
  'this specific town. ' +
  'Never mention religion, politics, or any controversial topic. ' +
  'Respond exclusively in valid JSON format: ' +
  '{"summary":"2-sentence sensory description here","bestFor":["pick 3-4 from: ' +
  'Couples, Families, Solo travellers, Nature lovers, Foodies, Wine lovers, ' +
  'Hikers, History buffs, Beach lovers, Adventure seekers"]}'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { dest, slug, wiki, hasKids, interests } = req.query as {
    dest?: string; slug?: string; wiki?: string; hasKids?: string; interests?: string
  }
  if (!dest) return res.status(400).json({ error: 'dest required' })

  // Check destination_summaries table first — serve cached, skip Claude call
  if (adminSupabase && slug) {
    const { data: subDest } = await adminSupabase
      .from('sub_destinations')
      .select('sub_dest_id')
      .eq('slug', slug)
      .single()

    if (subDest) {
      const { data: summary } = await adminSupabase
        .from('destination_summaries')
        .select('ai_summary, best_for')
        .eq('sub_dest_id', subDest.sub_dest_id)
        .single()

      if (summary?.ai_summary) {
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
        return res.status(200).json({ summary: summary.ai_summary, bestFor: summary.best_for ?? [] })
      }
    }
  }
  // No cached summary — fall through to live Claude call below

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(200).json({ summary: wiki ?? null, bestFor: ['Couples', 'Nature lovers'] })
  }

  // Build the variable user message — includes geo context + traveller preferences
  const interestList = interests ? interests.split(',').map((s) => s.trim()).filter(Boolean) : []
  const prefLines: string[] = []
  if (hasKids === 'true') prefLines.push('The group includes children — weave in family-friendly aspects where naturally relevant.')
  if (interestList.length > 0) prefLines.push(`Highlight aspects relevant to these traveller interests: ${interestList.join(', ')}.`)

  const userContent = [
    `Destination: ${dest}`,
    wiki ? `Geographic context: ${wiki.slice(0, 400)}` : null,
    prefLines.length > 0 ? prefLines.join(' ') : null,
  ].filter(Boolean).join('\n\n')

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Enables prompt caching — static system block is cached after first call
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        temperature: 0.4,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userContent }],
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}`)
    const json = await r.json()
    const text: string = json.content?.[0]?.text ?? ''

    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const data = JSON.parse(match[0]) as { summary: string; bestFor: string[] }
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
      return res.status(200).json(data)
    }

    return res.status(200).json({ summary: text.slice(0, 300), bestFor: [] })
  } catch {
    return res.status(200).json({ summary: wiki ?? null, bestFor: ['Couples', 'Nature lovers'] })
  }
}
