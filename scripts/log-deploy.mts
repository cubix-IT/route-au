/**
 * Called automatically by `npm run deploy` after vercel --prod succeeds.
 * Logs the deployment to Supabase deploy_log.
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

const run = (cmd: string) => { try { return execSync(cmd, { encoding: 'utf-8' }).trim() } catch { return null } }

const commitSha     = run('git rev-parse --short HEAD')
const commitMessage = run('git log -1 --pretty=%s')
const branch        = run('git rev-parse --abbrev-ref HEAD')
const author        = run('git log -1 --pretty=%an')
const vercelUrl     = run('vercel ls --prod 2>/dev/null | grep Ready | head -1 | awk \'{print $3}\'')

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
