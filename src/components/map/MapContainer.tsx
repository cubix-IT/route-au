import { useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { MapView } from './MapView'
import { useAppStore } from '@/store/useAppStore'

export function MapContainer() {
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const { activeItinerary, nearbyPOIs, setSelectedPOI, activeLayers } = useAppStore()

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    setMap(m)
    addRouteLayers(m, activeItinerary?.route.waypoints.map((w) => [w.coord.lng, w.coord.lat]) ?? [])
    addPOIMarkers(m, nearbyPOIs, setSelectedPOI)
  }, [activeItinerary, nearbyPOIs, setSelectedPOI])

  void map
  void activeLayers

  return <MapView onMapReady={handleMapReady} />
}

function addRouteLayers(map: maplibregl.Map, coords: [number, number][]) {
  if (coords.length < 2) return

  if (map.getSource('route')) {
    (map.getSource('route') as maplibregl.GeoJSONSource).setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    })
    return
  }

  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    },
  })

  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    paint: {
      'line-color': '#b45309',
      'line-width': 4,
      'line-opacity': 0.9,
    },
  })
}

function addPOIMarkers(
  map: maplibregl.Map,
  pois: ReturnType<typeof useAppStore.getState>['nearbyPOIs'],
  onSelect: (poi: ReturnType<typeof useAppStore.getState>['nearbyPOIs'][0]) => void
) {
  for (const poi of pois) {
    const el = document.createElement('div')
    el.className = 'poi-marker'
    el.style.cssText = `
      width: 32px; height: 32px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: #1e293b; border: 2px solid #b45309; border-radius: 50%;
      font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    `
    el.textContent = categoryEmoji(poi.category)
    el.addEventListener('click', () => onSelect(poi))

    new maplibregl.Marker({ element: el })
      .setLngLat([poi.coord.lng, poi.coord.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 20 }).setHTML(
          `<div style="color:#0f172a;font-family:sans-serif">
            <strong>${poi.name}</strong><br>
            <span style="font-size:12px">${poi.description.slice(0, 80)}…</span>
          </div>`
        )
      )
      .addTo(map)
  }
}

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    Hiking: '🥾',
    Chilling: '🏖',
    Lookouts: '👁',
    Photography: '📷',
    FreeCamping: '⛺',
    History: '🏛',
  }
  return map[cat] ?? '📍'
}
