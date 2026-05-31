/**
 * POST /api/deploy-hook
 * Called by Vercel Deploy Hooks to log each production deployment.
 * Configure in Vercel Dashboard → Project → Settings → Git → Deploy Hooks,
 * pointing to this endpoint.
 *
 * Also called internally at the start/end of the enrich cron so every
 * enrichment run is traceable.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!adminSupabase) return res.status(500).json({ error: 'Supabase not configured' })

  if (req.method === 'POST') {
    const { plan_name, status, git_sha, notes, completed_at } = req.body ?? {}

    const { data, error } = await adminSupabase
      .from('deployment_log')
      .insert({
        plan_name: plan_name ?? 'production',
        status: status ?? 'completed',
        git_sha: git_sha ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        notes: notes ?? `Deployed via Vercel — ${new Date().toISOString()}`,
        completed_at: completed_at ?? new Date().toISOString(),
      })
      .select('deployment_id')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true, deployment_id: data?.deployment_id })
  }

  if (req.method === 'GET') {
    // Return recent deployments for observability
    const { data, error } = await adminSupabase
      .from('deployment_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
