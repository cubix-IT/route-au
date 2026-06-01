// Free email via Resend (3,000/month free tier)
// https://resend.com

const RESEND_API = 'https://api.resend.com/emails'
// Use onboarding@resend.dev until unplannedescapes.com.au is verified in Resend dashboard
const FROM = 'Unplanned Escapes <onboarding@resend.dev>'
const TO = 'subscriptions@cubixit.com.au'

export async function sendCronEmail(subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return  // silently skip if not configured

  try {
    await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: TO, subject, html }),
      signal: AbortSignal.timeout(8000),
    })
  } catch { /* non-fatal — cron succeeded even if email fails */ }
}

export function statusRow(label: string, value: string, ok = true): string {
  return `<tr>
    <td style="padding:6px 12px;color:#6B7280;font-size:13px">${label}</td>
    <td style="padding:6px 12px;font-size:13px;font-weight:600;color:${ok ? '#1C1C1A' : '#DC2626'}">${value}</td>
  </tr>`
}

export function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F8F7F4;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:#3A6B4F;padding:20px 24px;border-radius:12px 12px 0 0">
      <div style="color:#fff;font-size:18px;font-weight:700">Unplanned Escapes</div>
      <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:2px">${title}</div>
    </div>
    <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:20px 24px">
      ${body}
    </div>
    <div style="text-align:center;font-size:11px;color:#9CA3AF;margin-top:16px">
      Unplanned Escapes · subscriptions@cubixit.com.au · <a href="https://unplanned-escapes.vercel.app/api/status" style="color:#3A6B4F">View Status</a>
    </div>
  </div>
</body></html>`
}
