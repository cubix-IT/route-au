import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase } from './_lib/supabase.js'

const GREEN = '#3A6B4F'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Australia/Melbourne',
  })
}

// Group entries by deploy (same deployed_at within 60 seconds)
function groupByDeploy(rows: { deployed_at: string; title: string; description: string | null; git_sha: string | null }[]) {
  const groups: { date: string; sha: string | null; entries: typeof rows }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    const diff = last ? Math.abs(new Date(row.deployed_at).getTime() - new Date(last.date).getTime()) : Infinity
    if (last && diff < 60_000) {
      last.entries.push(row)
    } else {
      groups.push({ date: row.deployed_at, sha: row.git_sha, entries: [row] })
    }
  }
  return groups
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data: rows, error } = adminSupabase
    ? await adminSupabase
        .from('changelog')
        .select('deployed_at, title, description, git_sha')
        .order('deployed_at', { ascending: false })
        .limit(100)
    : { data: [], error: null }

  if (error) {
    return res.status(500).send('Error loading changelog')
  }

  const groups = groupByDeploy(rows ?? [])

  const entriesHtml = groups.length === 0
    ? '<p class="prose" style="color:#9CA3AF">No feature releases yet.</p>'
    : groups.map(g => `
      <div class="release">
        <div class="release-header">
          <span class="release-date">${formatDate(g.date)}</span>
          ${g.sha ? `<a class="sha-badge" href="https://github.com" target="_blank" rel="noopener noreferrer">${g.sha}</a>` : ''}
        </div>
        <ul class="release-list">
          ${g.entries.map(e => `
            <li>
              <span class="feat-dot"></span>
              <div>
                <strong>${e.title}</strong>
                ${e.description ? `<p class="entry-desc">${e.description}</p>` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>What's New — Unplanned Escapes</title>
  <meta name="description" content="New features and improvements to Unplanned Escapes — Victorian weekend getaway discovery.">
  <link rel="canonical" href="https://unplanned-escapes.vercel.app/changelog">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F8F7F4; color: #1C1C1A }
    a { color: ${GREEN} }
    nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; padding: 0 28px; height: 60px; background: rgba(255,255,255,0.88); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(0,0,0,0.07) }
    nav a.brand { font-family: 'Fraunces', Georgia, serif; font-size: 16px; font-weight: 700; color: #1C1C1A; text-decoration: none; letter-spacing: -0.02em }
    .back { font-size: 18px; color: #8C8A87; margin-right: 10px; text-decoration: none }
    main { max-width: 680px; margin: 0 auto; padding: 56px 28px 80px }
    h1 { font-family: 'Fraunces', Georgia, serif; font-size: 36px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 6px }
    .subtitle { font-size: 14px; color: #8C8A87; margin: 0 0 48px; line-height: 1.6 }
    .release { margin-bottom: 40px; padding-bottom: 40px; border-bottom: 1px solid #E8E6E2 }
    .release:last-child { border-bottom: none }
    .release-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap }
    .release-date { font-family: 'Fraunces', Georgia, serif; font-size: 18px; font-weight: 700; color: #1C1C1A; letter-spacing: -0.02em }
    .sha-badge { font-size: 11px; color: #8C8A87; background: #F3F2F0; padding: 2px 8px; border-radius: 20px; text-decoration: none; font-family: monospace }
    .release-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px }
    .release-list li { display: flex; align-items: flex-start; gap: 10px }
    .feat-dot { width: 8px; height: 8px; border-radius: 50%; background: ${GREEN}; flex-shrink: 0; margin-top: 6px }
    .release-list strong { font-size: 15px; color: #1C1C1A; line-height: 1.5 }
    .entry-desc { margin: 3px 0 0; font-size: 13px; color: #6B7280; line-height: 1.6 }
    footer { background: ${GREEN}; padding: 28px }
    .footer-inner { max-width: 680px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px }
    .footer-brand { font-family: 'Fraunces', Georgia, serif; font-size: 14px; font-weight: 700; color: #fff }
    .footer-links { display: flex; gap: 16px }
    .footer-links a { font-size: 12px; color: rgba(255,255,255,0.7); text-decoration: none }
  </style>
</head>
<body>

<nav>
  <a href="/" class="back">←</a>
  <a href="/" class="brand">Unplanned<span style="color:${GREEN}"> Escapes</span><span style="color:#8C8A87;font-weight:400;font-size:13px"> Victoria</span></a>
</nav>

<main>
  <h1>What's New</h1>
  <p class="subtitle">New features shipped to Unplanned Escapes. Bug fixes and under-the-hood work aren't listed — only things you'll actually notice.</p>
  ${entriesHtml}
</main>

<footer>
  <div class="footer-inner">
    <span class="footer-brand">Unplanned Escapes</span>
    <div class="footer-links">
      <a href="/privacy">Privacy &amp; About</a>
      <a href="mailto:support@cubixit.com.au">Contact</a>
    </div>
  </div>
</footer>

</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  return res.status(200).send(html)
}
