import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { dest, wiki } = req.query as { dest?: string; wiki?: string }
  if (!dest) return res.status(400).json({ error: 'dest required' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Graceful fallback — return wiki summary if no AI key configured
    return res.status(200).json({ summary: wiki ?? null, bestFor: ['Couples', 'Nature lovers'] })
  }

  const prompt = `You are a concise travel writer for Victoria, Australia.${wiki ? `\nBackground: ${wiki}` : ''}

Write a 2-sentence engaging travel description of ${dest}. Then list who this destination suits best.

Respond with valid JSON only, no markdown:
{"summary":"2-sentence description here","bestFor":["pick 3-4 from: Couples, Families, Solo travellers, Nature lovers, Foodies, Wine lovers, Hikers, History buffs, Beach lovers, Adventure seekers"]}`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 250,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}`)
    const json = await r.json()
    const text: string = json.content?.[0]?.text ?? ''

    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const data = JSON.parse(match[0]) as { summary: string; bestFor: string[] }
      // Cache for 24 hours — destination descriptions don't change
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
      return res.status(200).json(data)
    }

    return res.status(200).json({ summary: text.slice(0, 300), bestFor: [] })
  } catch {
    return res.status(200).json({ summary: wiki ?? null, bestFor: ['Couples', 'Nature lovers'] })
  }
}
