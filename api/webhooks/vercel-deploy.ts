import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac } from 'crypto'
import { adminSupabase } from '../_lib/supabase.js'

// Vercel signs webhook payloads with HMAC-SHA1 using your webhook secret.
// Set VERCEL_WEBHOOK_SECRET in Vercel env vars after creating the webhook in the dashboard.
function verifySignature(req: VercelRequest, secret: string): boolean {
  const signature = req.headers['x-vercel-signature'] as string
  if (!signature) return false
  const body = JSON.stringify(req.body)
  const expected = createHmac('sha1', secret).update(body).digest('hex')
  return signature === expected
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify the request is genuinely from Vercel
  const secret = process.env.VERCEL_WEBHOOK_SECRET
  if (secret && !verifySignature(req, secret)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const payload = req.body
  const type = payload?.type  // e.g. 'deployment.succeeded', 'deployment.error'

  // Only log production deployments
  const target = payload?.payload?.deployment?.target
  if (target !== 'production') return res.status(200).json({ ok: true, skipped: 'not production' })

  const deployment = payload?.payload?.deployment ?? {}
  const git = deployment?.meta ?? {}

  const status = type === 'deployment.succeeded' ? 'success'
    : type === 'deployment.error'   ? 'error'
    : type === 'deployment.created' ? 'building'
    : type

  if (!adminSupabase) return res.status(500).json({ error: 'Supabase not configured' })

  const { error } = await adminSupabase.from('deploy_log').insert({
    deployed_at:    deployment.createdAt ? new Date(deployment.createdAt).toISOString() : new Date().toISOString(),
    environment:    'production',
    status,
    vercel_url:     deployment.url ? `https://${deployment.url}` : null,
    vercel_id:      deployment.id ?? null,
    commit_sha:     git.githubCommitSha ?? git.gitlabCommitSha ?? null,
    commit_message: git.githubCommitMessage ?? git.gitlabCommitMessage ?? null,
    branch:         git.githubCommitRef ?? git.gitlabCommitRef ?? null,
    author:         git.githubCommitAuthorName ?? payload?.payload?.user?.username ?? null,
    duration_ms:    deployment.buildingAt && deployment.ready
      ? deployment.ready - deployment.buildingAt
      : null,
  })

  if (error) {
    console.error('[deploy-webhook] insert error:', error.message)
    return res.status(500).json({ error: error.message })
  }

  console.log(`[deploy-webhook] logged ${status} deployment ${deployment.id}`)
  return res.status(200).json({ ok: true, status })
}
