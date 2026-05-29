import { logBugEntry } from '@/store/db'

export function captureError(componentContext: string, endpoint: string, err: unknown): void {
  const errorMessage = err instanceof Error ? err.message : String(err)
  logBugEntry({
    timestamp: new Date().toISOString(),
    endpoint,
    componentContext,
    errorMessage,
  }).catch(() => {})
}
