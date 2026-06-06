/**
 * UE post-deploy issue sync — closes resolved issues, flags regressions.
 * Usage: npm run issue-sync
 *
 * 1. Reads git log since last deploy (from deploy_log table)
 * 2. Extracts #N issue references from commit messages
 * 3. For each referenced issue: comments + closes if open
 * 4. Lists open issues not touched by this deploy (P1 backlog)
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1) }

const db = createClient(url, key)

console.log('\n=== UE Issue Sync ===\n')

// ── Get last two deploys to find the diff range ───────────────────────────────
const { data: deploys } = await db
  .from('deploy_log')
  .select('deployed_at,commit_sha,notes')
  .order('deployed_at', { ascending: false })
  .limit(2)

if (!deploys || deploys.length === 0) {
  console.error('No deploy log entries found — run npm run deploy first')
  process.exit(1)
}

const latest = deploys[0]
const previous = deploys[1]

console.log(`Latest deploy:  ${latest.commit_sha} — ${latest.notes ?? '(no notes)'}`)
console.log(`Previous deploy: ${previous?.commit_sha ?? '(none)'}`)

// ── Get commits since last deploy ─────────────────────────────────────────────
let commitLog = ''
try {
  if (previous?.commit_sha) {
    commitLog = execSync(`git log ${previous.commit_sha}..${latest.commit_sha} --oneline 2>/dev/null || git log --oneline -20`, { encoding: 'utf8' })
  } else {
    commitLog = execSync(`git log --oneline -20`, { encoding: 'utf8' })
  }
} catch {
  commitLog = execSync('git log --oneline -10', { encoding: 'utf8' })
}

console.log(`\nCommits in this deploy:\n${commitLog.trim().split('\n').map(l => `  ${l}`).join('\n')}`)

// Extract issue numbers from commits (closes #N, fixes #N, #N)
const issueNums = [...new Set(
  [...commitLog.matchAll(/#(\d+)/g)].map(m => parseInt(m[1]))
)].sort((a, b) => a - b)

console.log(`\nReferenced issues: ${issueNums.length > 0 ? issueNums.map(n => `#${n}`).join(', ') : 'none'}`)

if (issueNums.length === 0) {
  console.log('\n⚠️  No issue numbers found in commits since last deploy.')
  console.log('   Tip: use "closes #N" or "fixes #N" in commit messages.\n')
} else {
  // ── Check and close each referenced issue ─────────────────────────────────
  console.log('\nProcessing issues...\n')

  for (const num of issueNums) {
    try {
      // Get issue state
      const stateOut = execSync(`gh issue view ${num} --json state,title 2>/dev/null`, { encoding: 'utf8' })
      const { state, title } = JSON.parse(stateOut)

      if (state === 'CLOSED') {
        console.log(`  #${num} "${title}" — already closed ✓`)
        continue
      }

      // Get the relevant commit messages for this issue
      const relevantCommits = commitLog.split('\n')
        .filter(l => l.includes(`#${num}`))
        .map(l => l.trim())
        .join('\n')

      // Post closing comment
      const comment = [
        `Resolved in deploy \`${latest.commit_sha}\` (${new Date(latest.deployed_at).toLocaleDateString('en-AU')}).`,
        '',
        relevantCommits ? `Commits:\n${relevantCommits.split('\n').map(l => `- ${l}`).join('\n')}` : '',
        '',
        `Live at: https://unplanned-escapes.vercel.app`,
      ].filter(Boolean).join('\n')

      execSync(`gh issue comment ${num} --body ${JSON.stringify(comment)}`, { encoding: 'utf8' })
      execSync(`gh issue close ${num}`, { encoding: 'utf8' })
      console.log(`  #${num} "${title}" — commented + closed ✅`)
    } catch (e) {
      console.log(`  #${num} — could not process: ${(e as Error).message.split('\n')[0]}`)
    }
  }
}

// ── Show remaining open P1/P2 issues ─────────────────────────────────────────
console.log('\nOpen issues (not touched by this deploy):')
try {
  const openIssues = execSync('gh issue list --state open --limit 20 --json number,title,labels', { encoding: 'utf8' })
  const issues = JSON.parse(openIssues) as { number: number; title: string; labels: { name: string }[] }[]
  const untouched = issues.filter(i => !issueNums.includes(i.number))
  if (untouched.length === 0) {
    console.log('  🎉 No open issues — backlog clear!')
  } else {
    for (const i of untouched) {
      const labels = i.labels.map(l => l.name).join(', ')
      console.log(`  #${i.number} ${i.title}${labels ? ` [${labels}]` : ''}`)
    }
  }
} catch {
  console.log('  (could not fetch — check gh auth status)')
}

console.log('\n=== Done ===\n')
