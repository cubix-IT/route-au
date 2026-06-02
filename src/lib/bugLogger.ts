import { logBugEntry } from '@/store/db'
import { supabase } from '@/lib/supabase'

export function captureError(componentContext: string, endpoint: string, err: unknown): void {
  const errorMessage = err instanceof Error ? err.message : String(err)
  const stackTrace = err instanceof Error ? err.stack : undefined

  // Local IndexedDB (always works, even offline)
  logBugEntry({
    timestamp: new Date().toISOString(),
    endpoint,
    componentContext,
    errorMessage,
  }).catch(() => {})

  // Supabase bug_reports (allows weekly review)
  supabase?.from('bug_reports').insert({
    component: componentContext,
    endpoint,
    error_message: errorMessage,
    stack_trace: stackTrace ?? null,
    user_agent: navigator?.userAgent ?? null,
  }).then(({ error }) => {
    if (error) console.warn('[bugLogger] Supabase insert failed:', error.message)
  })
}
