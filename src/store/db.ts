import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'
import type { Itinerary, ScoredPOI, UserProfile, VehicleProfile } from '@/types'

interface RouteAUDB {
  user_profile: { key: string; value: UserProfile }
  vehicle_profile: { key: string; value: VehicleProfile }
  itineraries: { key: string; value: Itinerary }
  pois_cache: { key: string; value: { itinerary_id: string; pois: ScoredPOI[] } }
  weather_cache: { key: string; value: { coord_key: string; data: unknown; cached_at: number } }
  tile_cache_meta: { key: string; value: { region: string; downloaded_at: string; size_mb: number } }
}

let dbPromise: Promise<IDBPDatabase<RouteAUDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RouteAUDB>('route-au-db', 1, {
      upgrade(db) {
        db.createObjectStore('user_profile', { keyPath: 'id' })
        db.createObjectStore('vehicle_profile', { keyPath: 'id' })
        db.createObjectStore('itineraries', { keyPath: 'id' })
        db.createObjectStore('pois_cache', { keyPath: 'itinerary_id' })
        db.createObjectStore('weather_cache', { keyPath: 'coord_key' })
        db.createObjectStore('tile_cache_meta', { keyPath: 'region' })
      },
    })
  }
  return dbPromise
}

export async function saveItinerary(itinerary: Itinerary) {
  const db = await getDB()
  await db.put('itineraries', itinerary)
}

export async function loadItineraries(): Promise<Itinerary[]> {
  const db = await getDB()
  return db.getAll('itineraries')
}

export async function savePOIsCache(itineraryId: string, pois: ScoredPOI[]) {
  const db = await getDB()
  await db.put('pois_cache', { itinerary_id: itineraryId, pois })
}

export async function loadPOIsCache(itineraryId: string): Promise<ScoredPOI[] | null> {
  const db = await getDB()
  const entry = await db.get('pois_cache', itineraryId)
  return entry?.pois ?? null
}
