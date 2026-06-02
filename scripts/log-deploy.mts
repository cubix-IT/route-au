/**
 * Called automatically by `npm run deploy` after vercel --prod succeeds.
 * Logs the deployment to Supabase deploy_log.
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'

// Load .env manually — npm scripts don't auto-load it
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

const { error } = await db.from('deploy_log').insert({
  deployed_at:    new Date().toISOString(),
  environment:    'production',
  status:         'success',
  vercel_url:     vercelUrl ?? null,
  commit_sha:     commitSha ?? null,
  commit_message: commitMessage ?? null,
  branch:         branch ?? null,
  author:         author ?? null,
})

if (error) {
  console.error('Failed to log deploy:', error.message)
  process.exit(1)
}

console.log(`✅ Deploy logged — ${commitSha} "${commitMessage}"`)
