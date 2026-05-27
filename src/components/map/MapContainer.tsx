import { useState, useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { MapView } from './MapView'
import { useAppStore } from '@/store/useAppStore'

interface OsrmResult {
  coords: [number, number][]
  distKm: number | null
  durHours: number | null
}

// Fetch real road geometry + distance from OSRM public demo server
async function fetchRoadRoute(waypoints: [number, number][]): Promise<OsrmResult> {
  if (waypoints.length < 2) return { coords: waypoints, distKm: null, durHours: null }
  try {
    // Use only origin + destination for routing — intermediate corridor waypoints
    // cause detours through wrong road networks
    const endpoints = [waypoints[0], waypoints[waypoints.length - 1]]
    const coords = endpoints.map((c) => `${c[0]},${c[1]}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    const route = json.routes?.[0]
    if (route?.geometry?.coordinates) {
      return {
        coords: route.geometry.coordinates as [number, number][],
        distKm: Math.round(route.distance / 100) / 10,   // metres → km, 1dp
        durHours: Math.round((route.duration / 3600) * 10) / 10, // s → hrs, 1dp
      }
    }
  } catch {
    // Offline or API unavailable — fall back to two-point straight line
  }
  return { coords: waypoints, distKm: null, durHours: null }
}

export function MapContainer() {
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const pinMarkersRef = useRef<maplibregl.Marker[]>([])
  const { activeItinerary, nearbyPOIs, setSelectedPOI, patchRouteDistances } = useAppStore()

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    setMap(m)
  }, [])

  // Update route line whenever itinerary changes — fetch real road geometry
  useEffect(() => {
    if (!map) return

    const waypoints = activeItinerary?.route.waypoints ?? []
    const rawCoords = waypoints.map((w) => [w.coord.lng, w.coord.lat] as [number, number])

    // Clear old pin markers (origin/dest)
    pinMarkersRef.current.forEach((m) => m.remove())
    pinMarkersRef.current = []

    if (rawCoords.length < 2) {
      setRouteLine(map, [])
      return
    }

    // Add origin marker (green dot)
    const originEl = document.createElement('div')
    originEl.innerHTML = `<div style="
      width:14px;height:14px;border-radius:50%;
      background:#3A6B4F;border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`
    pinMarkersRef.current.push(
      new maplibregl.Marker({ element: originEl })
        .setLngLat(rawCoords[0])
        .setPopup(new maplibregl.Popup({ offset: 16, closeButton: false })
          .setText(waypoints[0].label))
        .addTo(map)
    )

    // Add destination marker (orange pin)
    const destEl = document.createElement('div')
    destEl.innerHTML = `<div style="
      width:18px;height:24px;position:relative;display:flex;
      align-items:center;justify-content:center">
      <svg viewBox="0 0 18 24" width="18" height="24" fill="none">
        <path d="M9 0C4 0 0 4 0 9c0 6.6 9 15 9 15s9-8.4 9-15c0-5-4-9-9-9z" fill="#B87333"/>
        <circle cx="9" cy="9" r="3.5" fill="#fff"/>
      </svg></div>`
    pinMarkersRef.current.push(
      new maplibregl.Marker({ element: destEl })
        .setLngLat(rawCoords[rawCoords.length - 1])
        .setPopup(new maplibregl.Popup({ offset: 28, closeButton: false })
          .setText(waypoints[waypoints.length - 1].label))
        .addTo(map)
    )

    // Fit map to bounds while OSRM loads
    const bounds = rawCoords.reduce(
      (b, c) => b.extend(c),
      new maplibregl.LngLatBounds(rawCoords[0], rawCoords[0])
    )
    map.fitBounds(bounds, { padding: 80, duration: 1000, maxZoom: 11 })

    // Fetch real road route and draw it
    fetchRoadRoute(rawCoords).then(({ coords: roadCoords, distKm, durHours }) => {
      setRouteLine(map, roadCoords)

      if (distKm !== null && durHours !== null) {
        patchRouteDistances(distKm, durHours)
      }

      // Re-fit to road geometry (may differ from straight-line bounds)
      if (roadCoords.length >= 2) {
        const roadBounds = roadCoords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(roadCoords[0], roadCoords[0])
        )
        map.fitBounds(roadBounds, { padding: 80, duration: 800, maxZoom: 11 })
      }
    })
  }, [map, activeItinerary])

  // Re-render POI markers whenever nearbyPOIs changes
  useEffect(() => {
    if (!map) return

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    for (const poi of nearbyPOIs) {
      const el = document.createElement('div')
      el.className = 'poi-marker'
      el.textContent = categoryEmoji(poi.category)
      el.addEventListener('click', () => setSelectedPOI(poi))

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.coord.lng, poi.coord.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(
            `<strong style="color:var(--text-primary)">${poi.name}</strong><br>
             <span style="font-size:12px;color:var(--text-muted)">${poi.description.slice(0, 80)}…</span>`
          )
        )
        .addTo(map)

      markersRef.current.push(marker)
    }
  }, [map, nearbyPOIs, setSelectedPOI])

  return <MapView onMapReady={handleMapReady} />
}

function setRouteLine(map: maplibregl.Map, coords: [number, number][]) {
  const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  }

  if (map.getSource('route')) {
    ;(map.getSource('route') as maplibregl.GeoJSONSource).setData(geojson)
    return
  }

  if (!map.isStyleLoaded()) {
    map.once('load', () => setRouteLine(map, coords))
    return
  }

  map.addSource('route', { type: 'geojson', data: geojson })

  // Glow layer (wide, dim)
  map.addLayer({
    id: 'route-glow',
    type: 'line',
    source: 'route',
    paint: {
      'line-color': '#f59e0b',
      'line-width': 10,
      'line-opacity': 0.15,
      'line-blur': 4,
    },
  })

  // Main amber line
  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    paint: {
      'line-color': '#b45309',
      'line-width': 3.5,
      'line-opacity': 0.9,
    },
  })
}

function categoryEmoji(cat: string): string {
  const m: Record<string, string> = {
    Hiking: '🥾', Chilling: '🏖', Lookouts: '👁',
    Photography: '📷', FreeCamping: '⛺', History: '🏛',
    Wildlife: '🦘', Beach: '🌊',
  }
  return m[cat] ?? '📍'
}
