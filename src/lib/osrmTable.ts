// OSRM Table API — drive times from one origin to many destinations (single request)
// Used to filter POIs that are >45 min drive from the selected destination

const OSRM_BASE = 'https://router.project-osrm.org/table/v1/driving'
const MAX_BATCH = 90 // stay well under OSRM demo-server URL limit

export interface CoordItem {
  lat: number
  lng: number
}

/** Returns drive times in minutes from origin to each poi (null = unreachable/failed). */
export async function fetchDriveTimes(
  origin: CoordItem,
  pois: CoordItem[]
): Promise<(number | null)[]> {
  if (pois.length === 0) return []

  // Batch if needed
  if (pois.length > MAX_BATCH) {
    const chunks: (number | null)[] = []
    for (let i = 0; i < pois.length; i += MAX_BATCH) {
      const batch = pois.slice(i, i + MAX_BATCH)
      const times = await fetchDriveTimes(origin, batch)
      chunks.push(...times)
    }
    return chunks
  }

  // OSRM expects lng,lat
  const coords = [
    `${origin.lng},${origin.lat}`,
    ...pois.map((p) => `${p.lng},${p.lat}`),
  ].join(';')

  try {
    const url = `${OSRM_BASE}/${coords}?sources=0&annotations=duration`
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return pois.map(() => null)
    const data = await res.json() as { code: string; durations: (number | null)[][] }
    if (data.code !== 'Ok' || !data.durations?.[0]) return pois.map(() => null)
    // durations[0][0] is self (origin→origin = 0), skip it
    return data.durations[0].slice(1).map((s) => (s == null ? null : Math.round(s / 60)))
  } catch {
    return pois.map(() => null)
  }
}
