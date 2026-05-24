import { createClient } from '@supabase/supabase-js'
import type { NewTripReport, TripReport } from '@/types'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export async function fetchTripReports(segmentId: string): Promise<TripReport[]> {
  const { data, error } = await supabase
    .from('trip_reports')
    .select('*')
    .eq('segment_id', segmentId)
    .order('reported_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return (data ?? []) as TripReport[]
}

export async function submitTripReport(report: NewTripReport): Promise<void> {
  const { error } = await supabase.from('trip_reports').insert({
    ...report,
    reported_at: new Date().toISOString(),
  })
  if (error) throw error
}
