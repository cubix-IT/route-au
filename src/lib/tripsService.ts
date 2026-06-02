import { supabase } from '@/lib/supabase'
import { saveItinerary, loadItineraries } from '@/store/db'
import type { Itinerary } from '@/types'

export const FREE_TRIP_LIMIT = 3

type SaveResult =
  | { saved: true; location: 'cloud' | 'local' }
  | { error: string }

export async function saveTrip(itinerary: Itinerary, userId: string | null): Promise<SaveResult> {
  if (!userId || !supabase) {
    await saveItinerary(itinerary)
    return { saved: true, location: 'local' }
  }

  const { count } = await supabase
    .from('trips')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= FREE_TRIP_LIMIT) {
    return { error: `Free plan allows ${FREE_TRIP_LIMIT} saved trips. Delete one to save a new trip.` }
  }

  const dest = itinerary.name ?? 'Trip'
  const origin = itinerary.route?.waypoints?.[0]?.label ?? null

  const { error } = await supabase.from('trips').upsert({
    id: itinerary.id,
    user_id: userId,
    name: dest,
    start_date: itinerary.start_date ?? new Date().toISOString().split('T')[0],
    end_date: itinerary.end_date ?? null,
    itinerary: itinerary as unknown as Record<string, unknown>,
    total_km: itinerary.total_km ?? null,
    total_days: itinerary.total_days ?? 1,
    origin_name: origin,
    dest_name: dest,
  }, { onConflict: 'id' })

  if (error) return { error: error.message }
  return { saved: true, location: 'cloud' }
}

export async function loadTrips(userId: string | null): Promise<Itinerary[]> {
  if (!userId || !supabase) {
    return loadItineraries()
  }

  const { data, error } = await supabase
    .from('trips')
    .select('itinerary')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(FREE_TRIP_LIMIT)

  if (error || !data) return loadItineraries()
  return data.map((r) => r.itinerary as unknown as Itinerary)
}

export async function deleteTrip(tripId: string, userId: string | null): Promise<void> {
  if (!userId || !supabase) return
  await supabase.from('trips').delete().eq('id', tripId).eq('user_id', userId)
}

export async function getTripCount(userId: string): Promise<number> {
  if (!supabase) return 0
  const { count } = await supabase
    .from('trips')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}
