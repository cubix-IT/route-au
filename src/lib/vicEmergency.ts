export interface HazardAlert {
  id: string
  title: string
  category: string
  status: string
  distanceKm: number
  severity: 'urgent' | 'warning'
  url?: string
}

// Categories worth surfacing to travellers
const ALERT_CATEGORIES = new Set(['Fire', 'Flooding', 'Met'])
// Statuses that indicate an active/dangerous situation
const ALERT_STATUSES = new Set([
  'Under Control', 'Responding', 'On Scene',
  'Request For Assistance', 'Warning',
])

function haversinKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

// Extract a representative [lng, lat] from any GeoJSON geometry
function extractPoint(geom: { type: string; coordinates?: unknown; geometries?: unknown[] } | null): [number, number] | null {
  if (!geom) return null
  if (geom.type === 'Point') {
    const c = geom.coordinates as number[]
    return [c[0], c[1]]
  }
  if (geom.type === 'Polygon') {
    const ring = (geom.coordinates as number[][][])[0]
    if (!ring?.length) return null
    const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length
    const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length
    return [lng, lat]
  }
  if (geom.type === 'GeometryCollection') {
    for (const g of (geom.geometries ?? []) as typeof geom[]) {
      const pt = extractPoint(g)
      if (pt) return pt
    }
  }
  return null
}

const cache = new Map<string, { alerts: HazardAlert[]; ts: number }>()

export async function fetchHazardsNear(
  destLat: number,
  destLng: number,
  radiusKm = 150,
): Promise<HazardAlert[]> {
  const key = `${destLat.toFixed(1)},${destLng.toFixed(1)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < 5 * 60_000) return hit.alerts

  try {
    const res = await fetch('/api/hazards', { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return []
    const data = await res.json()

    const alerts: HazardAlert[] = []
    for (const feature of data.features ?? []) {
      const p = feature.properties ?? {}
      const cat: string = p.category1 ?? ''
      const status: string = p.status ?? ''

      if (!ALERT_CATEGORIES.has(cat)) continue
      if (!ALERT_STATUSES.has(status)) continue

      const pt = extractPoint(feature.geometry)
      if (!pt) continue

      const dist = haversinKm({ lat: destLat, lng: destLng }, { lat: pt[1], lng: pt[0] })
      if (dist > radiusKm) continue

      alerts.push({
        id: p.id ?? p.sourceId ?? `${cat}-${dist}`,
        title: p.sourceTitle ?? 'Active incident',
        category: cat,
        status,
        distanceKm: Math.round(dist),
        severity: dist < 50 ? 'urgent' : 'warning',
        url: p.url,
      })
    }

    alerts.sort((a, b) => a.distanceKm - b.distanceKm)
    cache.set(key, { alerts, ts: Date.now() })
    return alerts
  } catch {
    return []
  }
}
