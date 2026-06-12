// Photon (Komoot) origin autocomplete — shared by the landing hero search
// and the From-where modal on the explore page. Free service, no key.

export interface PhotonFeature {
  properties: { name: string; city?: string; state?: string; country?: string; osm_value?: string }
  geometry: { coordinates: [number, number] }
}

const SETTLEMENT_TYPES = new Set([
  'city', 'town', 'village', 'suburb', 'locality', 'hamlet',
  'municipality', 'neighbourhood', 'quarter',
])

export async function searchOrigin(q: string): Promise<PhotonFeature[]> {
  if (q.length < 2) return []
  try {
    // layer=city covers cities/towns/villages/suburbs in Photon taxonomy
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=en&limit=10&bbox=140,-39,150,-34&layer=city&layer=district&layer=locality`
    const res = await fetch(url, { signal: AbortSignal.timeout(6_000) })
    const json = await res.json()
    const features: PhotonFeature[] = json.features ?? []
    // Secondary filter: keep only settlement-type OSM values
    return features
      .filter((f) => SETTLEMENT_TYPES.has(f.properties.osm_value ?? ''))
      .slice(0, 6)
  } catch {
    // Photon down or timed out — empty suggestions beat an unhandled rejection
    return []
  }
}

export function featureLabel(f: PhotonFeature): string {
  const p = f.properties
  return [p.name, p.city, p.state].filter(Boolean).join(', ')
}
