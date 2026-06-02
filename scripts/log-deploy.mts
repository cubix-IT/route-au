/**
 * Called automatically by `npm run deploy` after vercel --prod succeeds.
 * 1. Logs the deployment to deploy_log
 * 2. Auto-inserts feat: commits into changelog table
 * 3. Appends to CHANGELOG.md
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { readFileSync, existsSync, writeFileSync } from 'fs'

function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) { console.warn('⚠️  SUPABASE_URL/KEY not set — skipping deploy log'); process.exit(0) }

const db = createClient(url, key, { auth: { persistSession: false } })

const run = (cmd: string) => { try { return execSync(cmd, { encoding: 'utf-8' }).trim() } catch { return null } }

const commitSha     = run('git rev-parse --short HEAD')
const commitMessage = run('git log -1 --pretty=%s')
const branch        = run('git rev-parse --abbrev-ref HEAD')
const author        = run('git log -1 --pretty=%an')
const vercelUrl     = run('vercel ls 2>/dev/null | grep Ready | head -1 | grep -oP "https://\\S+"')

// ── 1. Log the deploy ────────────────────────────────────────────────────────
const { error: deployErr } = await db.from('deploy_log').insert({
  deployed_at:    new Date().toISOString(),
  environment:    'production',
  status:         'success',
  vercel_url:     vercelUrl ?? null,
  commit_sha:     commitSha ?? null,
  commit_message: commitMessage ?? null,
  branch:         branch ?? null,
  author:         author ?? null,
})

if (deployErr) {
  console.error('Failed to log deploy:', deployErr.message)
  process.exit(1)
}

console.log(`✅ Deploy logged — ${commitSha} "${commitMessage}"`)

// ── 2. Find feat: commits since last deploy ──────────────────────────────────
// Get the commit SHA from the previous deploy_log entry
const { data: lastDeploy } = await db
  .from('deploy_log')
  .select('commit_sha')
  .eq('environment', 'production')
  .eq('status', 'success')
  .order('deployed_at', { ascending: false })
  .limit(2)  // index 0 = just-inserted, index 1 = previous

const prevSha = lastDeploy?.[1]?.commit_sha ?? null

// Get commits between prev deploy and HEAD, filter for feat: prefix
const range = prevSha ? `${prevSha}..HEAD` : '-20'
const gitLogCmd = prevSha
  ? `git log ${range} --pretty=format:"%H|%s|%b" --no-merges`
  : `git log -20 --pretty=format:"%H|%s|%b" --no-merges`

const gitLog = run(gitLogCmd) ?? ''
const featCommits = gitLog
  .split('\n')
  .map(line => {
    const [sha, subject, ...bodyParts] = line.split('|')
    return { sha: sha?.slice(0, 7), subject: subject?.trim() ?? '', body: bodyParts.join('|').trim() }
  })
  .filter(c => /^feat(\(.+\))?:/.test(c.subject))

if (featCommits.length === 0) {
  console.log('ℹ️  No feat: commits — changelog unchanged')
  process.exit(0)
}

// ── 3. Format and insert into changelog table ────────────────────────────────
function formatTitle(subject: string): string {
  // "feat: add VHD heritage enrichment" → "Add VHD heritage enrichment"
  // "feat(landing): intent chooser UI" → "Intent chooser UI"
  return subject
    .replace(/^feat(\(.+\))?:\s*/i, '')
    .replace(/^./, c => c.toUpperCase())
    .replace(/\+$/, '')
    .trim()
}

const now = new Date().toISOString()
const rows = featCommits.map(c => ({
  deployed_at: now,
  commit_sha: c.sha,
  title: formatTitle(c.subject),
  description: c.body || null,
  category: 'feature' as const,
}))

const { error: changelogErr } = await db.from('changelog').insert(rows)
if (changelogErr) {
  console.warn('⚠️  Failed to insert changelog entries:', changelogErr.message)
} else {
  console.log(`📋 Changelog: added ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`)
  rows.forEach(r => console.log(`   • ${r.title}`))
}

// ── 4. Append to CHANGELOG.md ────────────────────────────────────────────────
const date = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })
const newSection = [
  `## ${date} (${commitSha})`,
  '',
  ...rows.map(r => `- **${r.title}**${r.description ? `\n  ${r.description}` : ''}`),
  '',
].join('\n')

const mdPath = 'CHANGELOG.md'
const existing = existsSync(mdPath) ? readFileSync(mdPath, 'utf-8') : '# Changelog\n\n'
// Insert after the first line (the # Changelog heading)
const lines = existing.split('\n')
const insertAt = lines.findIndex(l => l.startsWith('## '))
const updated = insertAt === -1
  ? existing.trimEnd() + '\n\n' + newSection
  : [...lines.slice(0, insertAt), newSection, ...lines.slice(insertAt)].join('\n')

writeFileSync(mdPath, updated, 'utf-8')
console.log(`📝 CHANGELOG.md updated`)
