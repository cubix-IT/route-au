import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'
import type { Itinerary, ScoredPOI, UserProfile, VehicleProfile } from '@/types'

export interface BugEntry {
  timestamp: string
  endpoint: string
  componentContext: string
  errorMessage: string
}

export interface PlacesCacheEntry {
  cache_key: string   // `${lat.toFixed(3)},${lng.toFixed(3)},${category}`
  places: unknown[]
  cached_at: number
}

export interface RequestLedgerEntry {
  id: string    // always 'monthly'
  count: number
  month: string // 'YYYY-MM'
}

interface RouteAUDB {
  user_profile:   { key: string; value: UserProfile }
  vehicle_profile:{ key: string; value: VehicleProfile }
  itineraries:    { key: string; value: Itinerary }
  pois_cache:     { key: string; value: { itinerary_id: string; pois: ScoredPOI[] } }
  weather_cache:  { key: string; value: { coord_key: string; data: unknown; cached_at: number } }
  tile_cache_meta:{ key: string; value: { region: string; downloaded_at: string; size_mb: number } }
  bug_register:   { key: number; value: BugEntry }
  places_cache:   { key: string; value: PlacesCacheEntry }
  request_ledger: { key: string; value: RequestLedgerEntry }
}

let dbPromise: Promise<IDBPDatabase<RouteAUDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RouteAUDB>('route-au-db', 4, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('user_profile',    { keyPath: 'id' })
          db.createObjectStore('vehicle_profile', { keyPath: 'id' })
          db.createObjectStore('itineraries',     { keyPath: 'id' })
          db.createObjectStore('pois_cache',      { keyPath: 'itinerary_id' })
          db.createObjectStore('weather_cache',   { keyPath: 'coord_key' })
          db.createObjectStore('tile_cache_meta', { keyPath: 'region' })
        }
        if (oldVersion < 2) {
          db.createObjectStore('bug_register', { autoIncrement: true })
        }
        if (oldVersion < 3) {
          db.createObjectStore('places_cache', { keyPath: 'cache_key' })
        }
        if (oldVersion < 4) {
          db.createObjectStore('request_ledger', { keyPath: 'id' })
        }
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

export async function logBugEntry(entry: BugEntry): Promise<void> {
  try {
    const db = await getDB()
    await db.add('bug_register', entry)
  } catch {
    // Never throw from the error logger
  }
}

const PLACES_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function getPlacesCache(cacheKey: string): Promise<unknown[] | null> {
  try {
    const db = await getDB()
    const entry = await db.get('places_cache', cacheKey)
    if (!entry) return null
    if (Date.now() - entry.cached_at > PLACES_CACHE_TTL_MS) {
      await db.delete('places_cache', cacheKey).catch(() => {})
      return null
    }
    return entry.places
  } catch {
    return null
  }
}

export async function setPlacesCache(cacheKey: string, places: unknown[]): Promise<void> {
  try {
    const db = await getDB()
    await db.put('places_cache', { cache_key: cacheKey, places, cached_at: Date.now() })
  } catch {
    // Cache writes are best-effort
  }
}

// ── Per-device monthly request ledger ────────────────────────────────────────

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getPlacesRequestCount(): Promise<number> {
  try {
    const db = await getDB()
    const entry = await db.get('request_ledger', 'monthly')
    if (!entry || entry.month !== currentMonth()) return 0
    return entry.count
  } catch {
    return 0
  }
}

export async function incrementPlacesRequestCount(): Promise<number> {
  try {
    const db = await getDB()
    const month = currentMonth()
    const existing = await db.get('request_ledger', 'monthly')
    const count = (existing && existing.month === month ? existing.count : 0) + 1
    await db.put('request_ledger', { id: 'monthly', count, month })
    return count
  } catch {
    return 0
  }
}

export async function isPlacesBudgetExhausted(limit = 9000): Promise<boolean> {
  return (await getPlacesRequestCount()) >= limit
}
